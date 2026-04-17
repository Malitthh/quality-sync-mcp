import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import axios from "axios";

function confluenceClient() {
  const baseURL = process.env.JIRA_BASE_URL;
  const email = process.env.JIRA_EMAIL;
  const token = process.env.JIRA_API_TOKEN;

  if (!baseURL || !email || !token) {
    throw new Error("Missing JIRA_BASE_URL, JIRA_EMAIL, or JIRA_API_TOKEN env vars");
  }

  return axios.create({
    baseURL: `${baseURL}/wiki/rest/api`,
    auth: { username: email, password: token },
    headers: { "Content-Type": "application/json" },
  });
}

export function registerConfluenceTools(server: McpServer) {

  // ── CREATE PAGE ──────────────────────────────────────────────────────────
  server.tool(
    "confluence_create_page",
    "Create a new Confluence page in a specified space and parent page.",
    {
      space_key: z.string().describe("Confluence space key e.g. 'AUT' or 'QA'"),
      title: z.string().describe("Page title"),
      content: z.string().describe("Page content as plain text or basic HTML"),
      parent_page_id: z.string().optional().describe("Parent page ID to nest this page under"),
    },
    async ({ space_key, title, content, parent_page_id }) => {
      const client = confluenceClient();

      const body: any = {
        type: "page",
        title,
        space: { key: space_key },
        body: {
          storage: {
            value: `<p>${content.replace(/\n/g, "</p><p>")}</p>`,
            representation: "storage",
          },
        },
      };

      if (parent_page_id) {
        body.ancestors = [{ id: parent_page_id }];
      }

      const res = await client.post("/content", body);

      return {
        content: [{
          type: "text",
          text: `Confluence page created: ${title}\nID: ${res.data.id}\nURL: ${process.env.JIRA_BASE_URL}/wiki${res.data._links?.webui || ""}`,
        }],
      };
    }
  );

  // ── GET PAGE ─────────────────────────────────────────────────────────────
  server.tool(
    "confluence_get_page",
    "Get the content and metadata of a Confluence page by title or ID.",
    {
      page_id: z.string().optional().describe("Confluence page ID"),
      title: z.string().optional().describe("Page title to search for"),
      space_key: z.string().optional().describe("Space key to search within"),
    },
    async ({ page_id, title, space_key }) => {
      const client = confluenceClient();

      if (page_id) {
        const res = await client.get(`/content/${page_id}`, {
          params: { expand: "body.storage,version,ancestors" },
        });
        return { content: [{ type: "text", text: JSON.stringify({ id: res.data.id, title: res.data.title, version: res.data.version?.number, url: `${process.env.JIRA_BASE_URL}/wiki${res.data._links?.webui}` }, null, 2) }] };
      }

      if (title) {
        const res = await client.get("/content", {
          params: { title, spaceKey: space_key, expand: "version" },
        });
        const pages = res.data.results.map((p: any) => ({ id: p.id, title: p.title, version: p.version?.number }));
        return { content: [{ type: "text", text: JSON.stringify(pages, null, 2) }] };
      }

      return { content: [{ type: "text", text: "Provide either page_id or title to search." }] };
    }
  );

  // ── UPDATE PAGE ──────────────────────────────────────────────────────────
  server.tool(
    "confluence_update_page",
    "Update the content of an existing Confluence page. Appends content by default.",
    {
      page_id: z.string().describe("Confluence page ID to update"),
      title: z.string().describe("Page title (required even if unchanged)"),
      content: z.string().describe("New page content as plain text"),
      append: z.boolean().default(true).describe("If true, appends to existing content. If false, replaces it."),
    },
    async ({ page_id, title, content, append }) => {
      const client = confluenceClient();

      const currentRes = await client.get(`/content/${page_id}`, {
        params: { expand: "body.storage,version" },
      });
      const currentVersion = currentRes.data.version.number;
      const currentBody = append ? currentRes.data.body.storage.value : "";

      const newBody = currentBody + `<p>${content.replace(/\n/g, "</p><p>")}</p>`;

      await client.put(`/content/${page_id}`, {
        type: "page",
        title,
        version: { number: currentVersion + 1 },
        body: { storage: { value: newBody, representation: "storage" } },
      });

      return { content: [{ type: "text", text: `Confluence page '${title}' updated successfully.` }] };
    }
  );
}
