import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import axios from "axios";

function jiraClient() {
  const baseURL = process.env.JIRA_BASE_URL;
  const email = process.env.JIRA_EMAIL;
  const token = process.env.JIRA_API_TOKEN;

  if (!baseURL || !email || !token) {
    throw new Error("Missing JIRA_BASE_URL, JIRA_EMAIL, or JIRA_API_TOKEN env vars");
  }

  return axios.create({
    baseURL: `${baseURL}/rest/api/3`,
    auth: { username: email, password: token },
    headers: { "Content-Type": "application/json" },
  });
}

export function registerJiraTools(server: McpServer) {

  // ── GET TICKET ──────────────────────────────────────────────────────────
  server.tool(
    "jira_get_ticket",
    "Read a Jira ticket by key. Returns summary, description, status, assignee, reporter, priority, labels, comments, and any steps to reproduce.",
    { ticket_key: z.string().describe("Jira ticket key e.g. AUT-108") },
    async ({ ticket_key }) => {
      const client = jiraClient();
      const res = await client.get(`/issue/${ticket_key}`, {
        params: { fields: "summary,description,status,assignee,reporter,priority,labels,comment,issuetype,customfield_10014" },
      });
      const f = res.data.fields;
      const comments = (f.comment?.comments || [])
        .slice(-3)
        .map((c: any) => `[${c.author.displayName}]: ${c.body?.content?.[0]?.content?.[0]?.text || ""}`)
        .join("\n");

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            key: ticket_key,
            summary: f.summary,
            status: f.status?.name,
            type: f.issuetype?.name,
            priority: f.priority?.name,
            assignee: f.assignee?.displayName || "Unassigned",
            reporter: f.reporter?.displayName,
            labels: f.labels,
            description: f.description?.content?.[0]?.content?.[0]?.text || "No description",
            recent_comments: comments || "No comments yet",
          }, null, 2),
        }],
      };
    }
  );

  // ── GET MULTIPLE TICKETS ─────────────────────────────────────────────────
  server.tool(
    "jira_get_tickets",
    "Read multiple Jira tickets at once. Pass a comma-separated list of ticket keys.",
    { ticket_keys: z.string().describe("Comma-separated ticket keys e.g. AUT-108,AUT-109,AUT-110") },
    async ({ ticket_keys }) => {
      const client = jiraClient();
      const keys = ticket_keys.split(",").map(k => k.trim()).filter(Boolean);
      const results = await Promise.all(keys.map(async (key) => {
        try {
          const res = await client.get(`/issue/${key}`, {
            params: { fields: "summary,description,status,assignee,priority,issuetype,comment" },
          });
          const f = res.data.fields;
          return {
            key,
            summary: f.summary,
            status: f.status?.name,
            type: f.issuetype?.name,
            priority: f.priority?.name,
            assignee: f.assignee?.displayName || "Unassigned",
            description: f.description?.content?.[0]?.content?.[0]?.text || "No description",
          };
        } catch (e: any) {
          return { key, error: e.message };
        }
      }));
      return { content: [{ type: "text", text: JSON.stringify(results, null, 2) }] };
    }
  );

  // ── ADD COMMENT ──────────────────────────────────────────────────────────
  server.tool(
    "jira_add_comment",
    "Add a comment to a Jira ticket. Use this after retesting to record results.",
    {
      ticket_key: z.string().describe("Jira ticket key e.g. AUT-108"),
      comment: z.string().describe("The comment text to add"),
    },
    async ({ ticket_key, comment }) => {
      const client = jiraClient();
      await client.post(`/issue/${ticket_key}/comment`, {
        body: {
          type: "doc",
          version: 1,
          content: [{
            type: "paragraph",
            content: [{ type: "text", text: comment }],
          }],
        },
      });
      return { content: [{ type: "text", text: `Comment added to ${ticket_key} successfully.` }] };
    }
  );

  // ── UPDATE STATUS ────────────────────────────────────────────────────────
  server.tool(
    "jira_update_status",
    "Change the status of a Jira ticket (e.g. move to In Progress, Done, Reopen).",
    {
      ticket_key: z.string().describe("Jira ticket key e.g. AUT-108"),
      transition_name: z.string().describe("Target status name e.g. 'In Progress', 'Done', 'Reopen'"),
    },
    async ({ ticket_key, transition_name }) => {
      const client = jiraClient();
      const transRes = await client.get(`/issue/${ticket_key}/transitions`);
      const transitions = transRes.data.transitions as Array<{ id: string; name: string }>;
      const match = transitions.find(t =>
        t.name.toLowerCase().includes(transition_name.toLowerCase())
      );
      if (!match) {
        const available = transitions.map(t => t.name).join(", ");
        return { content: [{ type: "text", text: `Transition '${transition_name}' not found. Available: ${available}` }] };
      }
      await client.post(`/issue/${ticket_key}/transitions`, { transition: { id: match.id } });
      return { content: [{ type: "text", text: `${ticket_key} moved to '${match.name}' successfully.` }] };
    }
  );

  // ── CREATE BUG ───────────────────────────────────────────────────────────
  server.tool(
    "jira_create_bug",
    "Create a new bug ticket in Jira with full structured details.",
    {
      project_key: z.string().describe("Jira project key e.g. AUT"),
      summary: z.string().describe("One-line bug summary"),
      steps_to_reproduce: z.string().describe("Numbered steps to reproduce the bug"),
      expected_result: z.string().describe("What should happen"),
      actual_result: z.string().describe("What actually happened"),
      severity: z.enum(["Critical", "High", "Medium", "Low"]).describe("Bug severity"),
      environment: z.string().default("QA").describe("Environment where bug was found"),
      affected_user_type: z.string().describe("admin, merchant, or customer"),
    },
    async ({ project_key, summary, steps_to_reproduce, expected_result, actual_result, severity, environment, affected_user_type }) => {
      const client = jiraClient();
      const description = `*Environment:* ${environment}\n*Affected user type:* ${affected_user_type}\n*Severity:* ${severity}\n\n*Steps to reproduce:*\n${steps_to_reproduce}\n\n*Expected result:*\n${expected_result}\n\n*Actual result:*\n${actual_result}`;

      const res = await client.post("/issue", {
        fields: {
          project: { key: project_key },
          summary,
          issuetype: { name: "Bug" },
          priority: { name: severity === "Critical" ? "Highest" : severity === "High" ? "High" : severity === "Medium" ? "Medium" : "Low" },
          labels: [severity.toLowerCase(), environment.toLowerCase(), affected_user_type.toLowerCase()],
          description: {
            type: "doc",
            version: 1,
            content: [{
              type: "paragraph",
              content: [{ type: "text", text: description }],
            }],
          },
        },
      });

      return {
        content: [{
          type: "text",
          text: `Bug created: ${res.data.key} — ${summary}\nURL: ${process.env.JIRA_BASE_URL}/browse/${res.data.key}`,
        }],
      };
    }
  );

  // ── QUERY BOARD ──────────────────────────────────────────────────────────
  server.tool(
    "jira_query_board",
    "Query the Jira board using JQL. Get tickets by status, assignee, sprint, label, or module.",
    {
      jql: z.string().describe("JQL query e.g. 'project = AUT AND status = \"In Progress\"' or 'project = AUT AND sprint in openSprints()'"),
      max_results: z.number().default(20).describe("Max number of results to return"),
    },
    async ({ jql, max_results }) => {
      const client = jiraClient();
      const res = await client.get("/search", {
        params: {
          jql,
          maxResults: max_results,
          fields: "summary,status,assignee,priority,issuetype,labels",
        },
      });

      const issues = res.data.issues.map((i: any) => ({
        key: i.key,
        summary: i.fields.summary,
        status: i.fields.status?.name,
        type: i.fields.issuetype?.name,
        priority: i.fields.priority?.name,
        assignee: i.fields.assignee?.displayName || "Unassigned",
        labels: i.fields.labels,
      }));

      return {
        content: [{
          type: "text",
          text: `Found ${res.data.total} tickets (showing ${issues.length}):\n\n${JSON.stringify(issues, null, 2)}`,
        }],
      };
    }
  );

  // ── ASSIGN TICKET ────────────────────────────────────────────────────────
  server.tool(
    "jira_assign_ticket",
    "Assign a Jira ticket to a team member by their account ID or display name.",
    {
      ticket_key: z.string().describe("Jira ticket key"),
      account_id: z.string().describe("Jira account ID of the person to assign to"),
    },
    async ({ ticket_key, account_id }) => {
      const client = jiraClient();
      await client.put(`/issue/${ticket_key}/assignee`, { accountId: account_id });
      return { content: [{ type: "text", text: `${ticket_key} assigned successfully.` }] };
    }
  );
}
