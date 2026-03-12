import type { RestMcpConfig, EndpointDef } from "./types.js";

export function validateConfig(config: RestMcpConfig): void {
  if (!config.server?.name) throw new Error("config.server.name is required");
  if (!config.server?.version) throw new Error("config.server.version is required");
  if (!config.api?.baseUrl) throw new Error("config.api.baseUrl is required");
  if (!Array.isArray(config.endpoints) || config.endpoints.length === 0) {
    throw new Error("config.endpoints must be a non-empty array");
  }

  const names = new Set<string>();
  for (const endpoint of config.endpoints) {
    validateEndpoint(endpoint);
    if (names.has(endpoint.name)) {
      throw new Error(`Duplicate endpoint name: "${endpoint.name}"`);
    }
    names.add(endpoint.name);
  }
}

function validateEndpoint(endpoint: EndpointDef): void {
  if (!endpoint.name) throw new Error("Each endpoint must have a name");
  if (!endpoint.description) throw new Error(`Endpoint "${endpoint.name}" must have a description`);
  if (!endpoint.method) throw new Error(`Endpoint "${endpoint.name}" must have a method`);
  if (!endpoint.path) throw new Error(`Endpoint "${endpoint.name}" must have a path`);

  if (!endpoint.path.startsWith("/")) {
    throw new Error(`Endpoint "${endpoint.name}" path must start with "/"`);
  }

  const params = endpoint.params ?? {};
  const paramNames = Object.keys(params);

  // Detect duplicate param names across locations (shouldn't happen in a flat map, but validate `in` values)
  const validLocations = new Set(["path", "query", "body", "header"]);
  for (const [name, def] of Object.entries(params)) {
    if (!validLocations.has(def.in)) {
      throw new Error(
        `Endpoint "${endpoint.name}" param "${name}" has invalid location "${def.in}". Must be one of: path, query, body, header`
      );
    }
    if (!def.type) {
      throw new Error(`Endpoint "${endpoint.name}" param "${name}" must have a type`);
    }
  }

  // Verify all path placeholders have a corresponding param
  const pathPlaceholders = [...endpoint.path.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
  for (const placeholder of pathPlaceholders) {
    const param = params[placeholder];
    if (!param) {
      throw new Error(
        `Endpoint "${endpoint.name}" path contains "{${placeholder}}" but no matching param is defined`
      );
    }
    if (param.in !== "path") {
      throw new Error(
        `Endpoint "${endpoint.name}" param "${placeholder}" is used as a path placeholder but has in="${param.in}". Set in: "path".`
      );
    }
  }

  // Warn if path params exist but aren't used in the path
  for (const [name, def] of Object.entries(params)) {
    if (def.in === "path" && !pathPlaceholders.includes(name)) {
      console.error(
        `[rest-mcp-wrapper] Warning: endpoint "${endpoint.name}" param "${name}" has in="path" but "{${name}}" does not appear in the path`
      );
    }
  }

  // Warn about body params on GET/DELETE
  if (endpoint.method === "GET" || endpoint.method === "DELETE") {
    const hasBodyParams = Object.values(params).some((p) => p.in === "body");
    if (hasBodyParams) {
      console.error(
        `[rest-mcp-wrapper] Warning: endpoint "${endpoint.name}" is ${endpoint.method} but has body params. They will be sent as query params instead.`
      );
    }
  }

  void paramNames; // suppress unused warning
}
