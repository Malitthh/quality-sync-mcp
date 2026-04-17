import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerJiraTools } from "./tools/jira.js";
import { registerQMetryTools } from "./tools/qmetry.js";
import { registerConfluenceTools } from "./tools/confluence.js";

const server = new McpServer({
  name: "autara-qa",
  version: "1.0.0",
});

registerJiraTools(server);
registerQMetryTools(server);
registerConfluenceTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
