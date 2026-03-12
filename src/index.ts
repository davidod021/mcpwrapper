// Primary API
export { createRestMcpServer } from "./server.js";

// OpenAPI importer
export { fromOpenApi } from "./openapi.js";
export type { OpenApiSpec } from "./openapi.js";

// Types (for integrators who want to type their configs)
export type {
  RestMcpConfig,
  ApiConfig,
  ServerConfig,
  EndpointDef,
  ParamDef,
  ParamLocation,
  ParamType,
  AuthStrategy,
} from "./types.js";
