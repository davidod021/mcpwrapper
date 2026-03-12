import type { EndpointDef, ParamDef, ParamLocation, ParamType } from "./types.js";

// Minimal OpenAPI 3.x types for what we need
interface OASchema {
  type?: string;
  format?: string;
  description?: string;
  enum?: (string | number)[];
  items?: OASchema;
  properties?: Record<string, OASchema>;
  required?: string[];
  default?: unknown;
}

interface OAParameter {
  name: string;
  in: string;
  description?: string;
  required?: boolean;
  schema?: OASchema;
}

interface OARequestBody {
  content?: {
    "application/json"?: { schema?: OASchema };
    "application/x-www-form-urlencoded"?: { schema?: OASchema };
  };
}

interface OAOperation {
  operationId?: string;
  summary?: string;
  description?: string;
  parameters?: OAParameter[];
  requestBody?: OARequestBody;
}

type HttpMethod = "get" | "post" | "put" | "patch" | "delete";

interface OAPathItem {
  get?: OAOperation;
  post?: OAOperation;
  put?: OAOperation;
  patch?: OAOperation;
  delete?: OAOperation;
}

export interface OpenApiSpec {
  paths?: Record<string, OAPathItem>;
}

const SUPPORTED_METHODS: HttpMethod[] = ["get", "post", "put", "patch", "delete"];

/**
 * Converts an OpenAPI 3.x spec's paths into EndpointDef[]
 * that can be passed directly to createRestMcpServer().
 *
 * @example
 * import spec from "./openapi.json" with { type: "json" };
 * import { fromOpenApi, createRestMcpServer } from "rest-mcp-wrapper";
 *
 * createRestMcpServer({
 *   server: { name: "my-api", version: "1.0.0" },
 *   api: { baseUrl: "https://api.example.com" },
 *   endpoints: fromOpenApi(spec),
 * });
 */
export function fromOpenApi(spec: OpenApiSpec): EndpointDef[] {
  const endpoints: EndpointDef[] = [];
  const names = new Set<string>();

  for (const [path, pathItem] of Object.entries(spec.paths ?? {})) {
    for (const method of SUPPORTED_METHODS) {
      const operation = pathItem[method];
      if (!operation) continue;

      const name = resolveName(operation, method, path, names);
      names.add(name);

      const description =
        operation.summary ?? operation.description ?? `${method.toUpperCase()} ${path}`;

      const params: Record<string, ParamDef> = {};
      let bodyEncoding: EndpointDef["bodyEncoding"] = "json";

      // Path, query, header parameters
      for (const param of operation.parameters ?? []) {
        const location = mapParamLocation(param.in);
        if (!location) continue;

        params[param.name] = {
          in: location,
          type: mapType(param.schema?.type),
          description: param.description ?? param.schema?.description,
          required: param.required ?? (location === "path" ? true : false),
          default: param.schema?.default,
          enum: param.schema?.enum,
          items: param.schema?.items ? { type: mapType(param.schema.items.type) } : undefined,
        };
      }

      // Request body
      const requestBody = operation.requestBody;
      if (requestBody?.content) {
        let bodySchema: OASchema | undefined;

        if (requestBody.content["application/json"]?.schema) {
          bodySchema = requestBody.content["application/json"].schema;
          bodyEncoding = "json";
        } else if (requestBody.content["application/x-www-form-urlencoded"]?.schema) {
          bodySchema = requestBody.content["application/x-www-form-urlencoded"].schema;
          bodyEncoding = "form";
        }

        if (bodySchema?.properties) {
          const required = new Set(bodySchema.required ?? []);
          for (const [propName, propSchema] of Object.entries(bodySchema.properties)) {
            params[propName] = {
              in: "body",
              type: mapType(propSchema.type),
              description: propSchema.description,
              required: required.has(propName),
              default: propSchema.default,
              enum: propSchema.enum,
              items: propSchema.items ? { type: mapType(propSchema.items.type) } : undefined,
            };
          }
        }
      }

      endpoints.push({
        name,
        description,
        method: method.toUpperCase() as EndpointDef["method"],
        path,
        params: Object.keys(params).length > 0 ? params : undefined,
        bodyEncoding,
      });
    }
  }

  return endpoints;
}

function resolveName(
  operation: OAOperation,
  method: string,
  path: string,
  existing: Set<string>
): string {
  if (operation.operationId) {
    // Normalize operationId to snake_case
    return operation.operationId.replace(/([A-Z])/g, "_$1").toLowerCase().replace(/^_/, "");
  }

  // Auto-generate from method + path: GET /users/{id} -> get_users_id
  const slug = path
    .replace(/\{(\w+)\}/g, "$1")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .toLowerCase();

  let name = `${method}_${slug}`;
  let i = 2;
  while (existing.has(name)) {
    name = `${method}_${slug}_${i++}`;
  }
  return name;
}

function mapParamLocation(oa: string): ParamLocation | null {
  switch (oa) {
    case "path":
      return "path";
    case "query":
      return "query";
    case "header":
      return "header";
    case "cookie":
      return null; // Not supported
    default:
      return null;
  }
}

function mapType(type: string | undefined): ParamType {
  switch (type) {
    case "integer":
      return "integer";
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "array":
      return "array";
    case "object":
      return "object";
    default:
      return "string";
  }
}
