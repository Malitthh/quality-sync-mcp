import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import axios from "axios";

function qmetryClient() {
  const baseURL = process.env.QMETRY_BASE_URL;
  const token = process.env.QMETRY_API_KEY;

  if (!baseURL || !token) {
    throw new Error("Missing QMETRY_BASE_URL or QMETRY_API_KEY env vars");
  }

  return axios.create({
    baseURL: `${baseURL}/rest/qtm4j/v2`,
    headers: {
      "Authorization": token,
      "Content-Type": "application/json",
    },
  });
}

export function registerQMetryTools(server: McpServer) {

  // ── CREATE TEST CASE ─────────────────────────────────────────────────────
  server.tool(
    "qmetry_create_test_case",
    "Create a test case in QMetry with full steps, expected results, and metadata.",
    {
      project_key: z.string().describe("Jira/QMetry project key e.g. AUT"),
      summary: z.string().describe("Test case title following naming convention"),
      objective: z.string().describe("What this TC is verifying"),
      precondition: z.string().optional().describe("Setup required before the test"),
      steps: z.array(z.object({
        description: z.string().describe("Step description"),
        expected_result: z.string().describe("Expected outcome of this step"),
      })).describe("Ordered list of test steps with expected results"),
      priority: z.enum(["High", "Medium", "Low"]).default("Medium"),
      labels: z.array(z.string()).optional().describe("Labels e.g. ['smoke', 'regression', 'bookings']"),
      folder_path: z.string().optional().describe("QMetry folder path e.g. 'Admin Platform/Bookings Module'"),
    },
    async ({ project_key, summary, objective, precondition, steps, priority, labels, folder_path }) => {
      const client = qmetryClient();

      const payload: any = {
        summary,
        objective,
        precondition: precondition || "",
        priority: { name: priority },
        labels: labels || [],
        testSteps: steps.map((s, i) => ({
          orderId: i + 1,
          step: s.description,
          expectedResult: s.expected_result,
        })),
        projectKey: project_key,
      };

      if (folder_path) {
        payload.folderPath = folder_path;
      }

      const res = await client.post("/testcases", payload);

      return {
        content: [{
          type: "text",
          text: `Test case created: ${res.data.key || "Success"} — ${summary}`,
        }],
      };
    }
  );

  // ── CREATE MULTIPLE TEST CASES ───────────────────────────────────────────
  server.tool(
    "qmetry_create_test_cases_bulk",
    "Create multiple test cases at once. Pass an array of TC objects. Used when generating a full module's TC suite.",
    {
      project_key: z.string().describe("Project key e.g. AUT"),
      folder_path: z.string().describe("QMetry folder path for all TCs"),
      test_cases: z.array(z.object({
        summary: z.string(),
        objective: z.string(),
        precondition: z.string().optional(),
        priority: z.enum(["High", "Medium", "Low"]).default("Medium"),
        labels: z.array(z.string()).optional(),
        steps: z.array(z.object({
          description: z.string(),
          expected_result: z.string(),
        })),
      })).describe("Array of test cases to create"),
    },
    async ({ project_key, folder_path, test_cases }) => {
      const client = qmetryClient();
      const results: string[] = [];

      for (const tc of test_cases) {
        try {
          const res = await client.post("/testcases", {
            summary: tc.summary,
            objective: tc.objective,
            precondition: tc.precondition || "",
            priority: { name: tc.priority },
            labels: tc.labels || [],
            folderPath: folder_path,
            projectKey: project_key,
            testSteps: tc.steps.map((s, i) => ({
              orderId: i + 1,
              step: s.description,
              expectedResult: s.expected_result,
            })),
          });
          results.push(`✓ ${res.data.key || "OK"} — ${tc.summary}`);
        } catch (e: any) {
          results.push(`✗ FAILED — ${tc.summary}: ${e.message}`);
        }
      }

      return {
        content: [{
          type: "text",
          text: `Bulk TC creation complete (${test_cases.length} TCs):\n${results.join("\n")}`,
        }],
      };
    }
  );

  // ── GET TEST CASES BY FOLDER ──────────────────────────────────────────────
  server.tool(
    "qmetry_get_test_cases",
    "Get existing test cases from a QMetry folder.",
    {
      project_key: z.string().describe("Project key e.g. AUT"),
      folder_path: z.string().optional().describe("Folder path to filter by"),
      max_results: z.number().default(20),
    },
    async ({ project_key, folder_path, max_results }) => {
      const client = qmetryClient();
      const params: any = { projectKey: project_key, maxResults: max_results };
      if (folder_path) params.folderPath = folder_path;

      const res = await client.get("/testcases", { params });
      const tcs = (res.data.data || res.data || []).map((tc: any) => ({
        key: tc.key,
        summary: tc.summary,
        status: tc.status?.name,
        priority: tc.priority?.name,
      }));

      return { content: [{ type: "text", text: JSON.stringify(tcs, null, 2) }] };
    }
  );

  // ── UPDATE TEST CASE STATUS ───────────────────────────────────────────────
  server.tool(
    "qmetry_update_tc_status",
    "Update the status of a QMetry test case e.g. to Approved, In Progress, Deprecated.",
    {
      tc_key: z.string().describe("QMetry test case key e.g. AUT-TC-84"),
      status: z.string().describe("New status name e.g. 'Approved', 'In Progress', 'Deprecated'"),
    },
    async ({ tc_key, status }) => {
      const client = qmetryClient();
      await client.patch(`/testcases/${tc_key}`, { status: { name: status } });
      return { content: [{ type: "text", text: `${tc_key} status updated to '${status}'.` }] };
    }
  );
}
