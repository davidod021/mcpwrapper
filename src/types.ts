export type ParamLocation = "path" | "query" | "body" | "header";

export type ParamType =
  | "string"
  | "number"
  | "integer"
  | "boolean"
  | "array"
  | "object";

export interface ParamDef {
  /** Where to send this parameter in the HTTP request */
  in: ParamLocation;
  type: ParamType;
  description?: string;
  /** Defaults to true */
  required?: boolean;
  /** Static default value (implies optional to the LLM) */
  default?: unknown;
  /** Restrict to a fixed set of values */
  enum?: (string | number)[];
  /** Element type for array params */
  items?: { type: ParamType };
}

export interface EndpointDef {
  /** MCP tool name — snake_case recommended, must be unique across endpoints */
  name: string;
  /** Human-readable description shown to the LLM */
  description: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** URL path relative to baseUrl, use {paramName} for path parameters */
  path: string;
  /** Flat map of all parameters regardless of location */
  params?: Record<string, ParamDef>;
  /** How to encode body params — defaults to "json" */
  bodyEncoding?: "json" | "form";
  /** Expected response format — defaults to "json" */
  responseFormat?: "json" | "text";
  /** Per-endpoint headers merged with global defaultHeaders */
  headers?: Record<string, string>;
}

export type AuthStrategy =
  | { type: "none" }
  | { type: "bearer"; token: string }
  | {
      type: "apikey";
      key: string;
      /** Send API key in this request header (takes priority over queryParam) */
      headerName?: string;
      /** Send API key as this query parameter name */
      queryParam?: string;
    }
  | { type: "basic"; username: string; password: string }
  | { type: "custom"; headers: Record<string, string> };

export interface ApiConfig {
  /** Base URL for all requests, e.g. "https://api.example.com/v1" */
  baseUrl: string;
  auth?: AuthStrategy;
  /** Headers added to every request */
  defaultHeaders?: Record<string, string>;
  /** Request timeout in milliseconds — defaults to 30000 */
  timeout?: number;
}

export interface ServerConfig {
  name: string;
  version: string;
}

export interface RestMcpConfig {
  server: ServerConfig;
  api: ApiConfig;
  endpoints: EndpointDef[];
}

// ---- Internal resolved types ----

export interface ResolvedAuth {
  headers: Record<string, string>;
  queryParams: Record<string, string>;
}

export interface ClassifiedParams {
  pathParams: Record<string, ParamDef>;
  queryParams: Record<string, ParamDef>;
  bodyParams: Record<string, ParamDef>;
  headerParams: Record<string, ParamDef>;
}
