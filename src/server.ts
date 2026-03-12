import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { RestMcpConfig } from "./types.js";
import { validateConfig } from "./config.js";
import { resolveAuth } from "./auth.js";
import { registerEndpoints } from "./tool-factory.js";

/**
 * Creates and starts an MCP server that exposes each configured endpoint as a tool.
 * Runs on stdio (compatible with Claude Desktop, VS Code, and other MCP clients).
 *
 * @example
 * import { createRestMcpServer } from "rest-mcp-wrapper";
 *
 * createRestMcpServer({
 *   server: { name: "my-api", version: "1.0.0" },
 *   api: {
 *     baseUrl: "https://api.example.com",
 *     auth: { type: "bearer", token: process.env.API_TOKEN },
 *   },
 *   endpoints: [
 *     {
 *       name: "get_user",
 *       description: "Get a user by ID",
 *       method: "GET",
 *       path: "/users/{id}",
 *       params: {
 *         id: { in: "path", type: "string", description: "User ID" },
 *       },
 *     },
 *   ],
 * });
 */
export async function createRestMcpServer(config: RestMcpConfig): Promise<void> {
  validateConfig(config);

  const server = new McpServer({
    name: config.server.name,
    version: config.server.version,
  });

  const auth = resolveAuth(config.api.auth);
  registerEndpoints(server, config, auth);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error(`[rest-mcp-wrapper] ${config.server.name} v${config.server.version} running on stdio (${config.endpoints.length} tools)`);
}
