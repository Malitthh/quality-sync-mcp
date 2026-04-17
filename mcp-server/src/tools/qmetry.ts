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

  // ── CREATE TEST CYCLE ────────────────────────────────────────────────────
  server.tool(
    "qmetry_create_test_cycle",
    "Create a test cycle in QMetry and link test cases to it. Test cases can be specified by keys or fetched from a folder.",
    {
      project_key: z.string().describe("Project key e.g. AUT"),
      name: z.string().describe("Test cycle name following existing pattern e.g. '(Admin Platform) - Bookings Module – Regression'"),
      description: z.string().optional().describe("Short description of what this cycle covers"),
      folder_path: z.string().optional().describe("QMetry folder path to fetch all TCs from e.g. 'Admin Platform/Bookings Module'"),
      tc_keys: z.array(z.string()).optional().describe("Specific TC keys to include e.g. ['AUT-TC-84','AUT-TC-85']"),
      assignee_account_id: z.string().optional().describe("Jira account ID of the assignee"),
      planned_start_date: z.string().optional().describe("Start date in YYYY-MM-DD format"),
      planned_end_date: z.string().optional().describe("End date in YYYY-MM-DD format"),
    },
    async ({ project_key, name, description, folder_path, tc_keys, assignee_account_id, planned_start_date, planned_end_date }) => {
      const client = qmetryClient();

      // Step 1 — create the cycle
      const cyclePayload: any = {
        summary: name,
        description: description || "",
        projectKey: project_key,
      };
      if (assignee_account_id) cyclePayload.assignee = { accountId: assignee_account_id };
      if (planned_start_date) cyclePayload.plannedStartDate = planned_start_date;
      if (planned_end_date) cyclePayload.plannedEndDate = planned_end_date;

      const cycleRes = await client.post("/testcycles", cyclePayload);
      const cycleKey = cycleRes.data.key;

      // Step 2 — collect TC keys
      let allTcKeys: string[] = tc_keys || [];

      if (folder_path && allTcKeys.length === 0) {
        const tcRes = await client.get("/testcases", {
          params: { projectKey: project_key, folderPath: folder_path, maxResults: 200 },
        });
        const fetched = (tcRes.data.data || tcRes.data || []).map((tc: any) => tc.key).filter(Boolean);
        allTcKeys = fetched;
      }

      // Step 3 — link TCs to cycle
      if (allTcKeys.length > 0) {
        await client.post(`/testcycles/${cycleKey}/testcases`, {
          testCaseKeys: allTcKeys,
        });
      }

      return {
        content: [{
          type: "text",
          text: `Test cycle created: ${cycleKey} — ${name}\nTCs linked: ${allTcKeys.length}\nKeys: ${allTcKeys.join(", ") || "none"}`,
        }],
      };
    }
  );

  // ── CREATE TEST PLAN ─────────────────────────────────────────────────────
  server.tool(
    "qmetry_create_test_plan",
    "Create a test plan in QMetry and link test cycles or test cases to it.",
    {
      project_key: z.string().describe("Project key e.g. AUT"),
      name: z.string().describe("Test plan name e.g. '(Admin Platform) – Sprint 12 Test Plan'"),
      description: z.string().optional().describe("What this test plan covers"),
      cycle_keys: z.array(z.string()).optional().describe("Test cycle keys to include in this plan e.g. ['AUT-TR-1']"),
      assignee_account_id: z.string().optional().describe("Jira account ID of the assignee"),
      planned_start_date: z.string().optional().describe("Start date YYYY-MM-DD"),
      planned_end_date: z.string().optional().describe("End date YYYY-MM-DD"),
    },
    async ({ project_key, name, description, cycle_keys, assignee_account_id, planned_start_date, planned_end_date }) => {
      const client = qmetryClient();

      const payload: any = {
        summary: name,
        description: description || "",
        projectKey: project_key,
      };
      if (assignee_account_id) payload.assignee = { accountId: assignee_account_id };
      if (planned_start_date) payload.plannedStartDate = planned_start_date;
      if (planned_end_date) payload.plannedEndDate = planned_end_date;

      const res = await client.post("/testplans", payload);
      const planKey = res.data.key;

      // Link cycles if provided
      if (cycle_keys && cycle_keys.length > 0) {
        await client.post(`/testplans/${planKey}/testcycles`, {
          testCycleKeys: cycle_keys,
        });
      }

      return {
        content: [{
          type: "text",
          text: `Test plan created: ${planKey} — ${name}\nCycles linked: ${cycle_keys?.length || 0}`,
        }],
      };
    }
  );

  // ── GET TEST CYCLE RESULTS ────────────────────────────────────────────────
  server.tool(
    "qmetry_get_cycle_results",
    "Get execution results for a test cycle — pass/fail counts, TC statuses, and overall progress.",
    {
      cycle_key: z.string().describe("Test cycle key e.g. AUT-TR-1"),
    },
    async ({ cycle_key }) => {
      const client = qmetryClient();

      const res = await client.get(`/testcycles/${cycle_key}`, {
        params: { expand: "testCaseExecutions" },
      });

      const cycle = res.data;
      const executions = cycle.testCaseExecutions || [];

      const summary = {
        key: cycle_key,
        name: cycle.summary,
        status: cycle.status?.name,
        total: executions.length,
        passed: executions.filter((e: any) => e.executionStatus?.name === "Pass").length,
        failed: executions.filter((e: any) => e.executionStatus?.name === "Fail").length,
        blocked: executions.filter((e: any) => e.executionStatus?.name === "Blocked").length,
        not_executed: executions.filter((e: any) => !e.executionStatus || e.executionStatus?.name === "Not Executed").length,
        executions: executions.map((e: any) => ({
          tc_key: e.testCase?.key,
          summary: e.testCase?.summary,
          status: e.executionStatus?.name || "Not Executed",
        })),
      };

      return {
        content: [{ type: "text", text: JSON.stringify(summary, null, 2) }],
      };
    }
  );

  // ── GET TEST PLAN RESULTS ─────────────────────────────────────────────────
  server.tool(
    "qmetry_get_plan_results",
    "Get execution results and linked cycles for a test plan.",
    {
      plan_key: z.string().describe("Test plan key e.g. AUT-TP-1"),
    },
    async ({ plan_key }) => {
      const client = qmetryClient();
      const res = await client.get(`/testplans/${plan_key}`, {
        params: { expand: "testCycles" },
      });

      return {
        content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }],
      };
    }
  );
}