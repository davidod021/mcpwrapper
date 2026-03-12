import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RestMcpConfig, ResolvedAuth } from "./types.js";
import { buildZodShape } from "./params.js";
import { executeRequest } from "./request-builder.js";

/**
 * Registers one MCP tool per endpoint defined in config.
 */
export function registerEndpoints(
  server: McpServer,
  config: RestMcpConfig,
  auth: ResolvedAuth
): void {
  for (const endpoint of config.endpoints) {
    const zodShape = buildZodShape(endpoint.params ?? {});

    server.registerTool(
      endpoint.name,
      {
        description: endpoint.description,
        inputSchema: zodShape,
      },
      async (args) => {
        try {
          const result = await executeRequest(
            endpoint,
            config.api,
            args as Record<string, unknown>,
            auth
          );
          return { content: [{ type: "text" as const, text: result }] };
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          return {
            content: [{ type: "text" as const, text: `Error: ${message}` }],
            isError: true,
          };
        }
      }
    );
  }
}
