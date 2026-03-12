# rest-mcp-wrapper

Wrap any REST API as an [MCP](https://modelcontextprotocol.io) server with a single config object. Each endpoint becomes a tool the LLM can call — no boilerplate, no manual tool registration.

## Install

```bash
npm install rest-mcp-wrapper
```

## Quick start

```typescript
import { createRestMcpServer } from "rest-mcp-wrapper";

createRestMcpServer({
  server: { name: "my-api", version: "1.0.0" },
  api: {
    baseUrl: "https://api.example.com",
    auth: { type: "bearer", token: process.env.API_TOKEN ?? "" },
  },
  endpoints: [
    {
      name: "get_user",
      description: "Get a user by their ID",
      method: "GET",
      path: "/users/{id}",
      params: {
        id: { in: "path", type: "string", description: "User ID" },
      },
    },
    {
      name: "create_post",
      description: "Create a new post",
      method: "POST",
      path: "/posts",
      params: {
        title:   { in: "body", type: "string", description: "Post title" },
        content: { in: "body", type: "string", required: false, description: "Post body" },
      },
    },
  ],
});
```

Build and run:

```bash
npx tsc
node --env-file=.env build/server.js
```

---

## Configuration

### `server`

| Field     | Type   | Description                  |
|-----------|--------|------------------------------|
| `name`    | string | Server name shown to clients |
| `version` | string | Semantic version string      |

### `api`

| Field            | Type           | Description                                          |
|------------------|----------------|------------------------------------------------------|
| `baseUrl`        | string         | Root URL for all requests, e.g. `https://api.example.com/v1` |
| `auth`           | AuthStrategy   | Authentication method (see below)                    |
| `defaultHeaders` | object         | Headers added to every request                       |
| `timeout`        | number         | Request timeout in ms — defaults to `30000`          |

### `endpoints[]`

| Field            | Type   | Description                                                              |
|------------------|--------|--------------------------------------------------------------------------|
| `name`           | string | MCP tool name — must be unique, snake_case recommended                   |
| `description`    | string | Shown to the LLM — be specific about when to use this tool               |
| `method`         | string | HTTP method: `GET` `POST` `PUT` `PATCH` `DELETE`                         |
| `path`           | string | URL path relative to `baseUrl`, use `{paramName}` for path parameters    |
| `params`         | object | Parameter definitions (see below)                                        |
| `bodyEncoding`   | string | `"json"` (default) or `"form"` for request body encoding                 |
| `responseFormat` | string | `"json"` (default) or `"text"`                                           |
| `headers`        | object | Per-endpoint headers merged with `defaultHeaders`                         |

---

## Parameters

Each key in `params` is a flat parameter the LLM will provide. The `in` field controls where it goes in the request.

```typescript
params: {
  id:       { in: "path",   type: "string",  description: "User ID" },
  search:   { in: "query",  type: "string",  required: false },
  title:    { in: "body",   type: "string" },
  x_org_id: { in: "header", type: "string",  description: "Organisation ID" },
}
```

### `ParamDef`

| Field         | Type    | Description                                                      |
|---------------|---------|------------------------------------------------------------------|
| `in`          | string  | `"path"` `"query"` `"body"` `"header"`                          |
| `type`        | string  | `"string"` `"number"` `"integer"` `"boolean"` `"array"` `"object"` |
| `description` | string  | Shown to the LLM                                                 |
| `required`    | boolean | Defaults to `true`                                               |
| `default`     | any     | Default value (implies optional)                                 |
| `enum`        | array   | Restricts input to a fixed set of values                         |
| `items`       | object  | Element type for `"array"` params: `{ type: "string" }`         |

> Body params on `GET` and `DELETE` requests are automatically promoted to query params.

---

## Authentication

Pass one of the following as `api.auth`. Credentials should always come from environment variables.

```typescript
// Bearer token
auth: { type: "bearer", token: process.env.TOKEN ?? "" }

// API key in a header
auth: { type: "apikey", key: process.env.API_KEY ?? "", headerName: "X-Api-Key" }

// API key as a query parameter
auth: { type: "apikey", key: process.env.API_KEY ?? "", queryParam: "api_key" }

// HTTP Basic auth
auth: { type: "basic", username: process.env.USER ?? "", password: process.env.PASS ?? "" }

// Custom headers
auth: { type: "custom", headers: { "X-Tenant": process.env.TENANT ?? "" } }

// No auth
auth: { type: "none" }
```

---

## OpenAPI / Swagger import

If your API publishes an OpenAPI 3.x spec, you can generate all endpoints automatically instead of defining them by hand.

```bash
curl https://api.example.com/openapi.json -o openapi.json
```

```typescript
import { createRestMcpServer, fromOpenApi } from "rest-mcp-wrapper";
import spec from "./openapi.json" with { type: "json" };

createRestMcpServer({
  server: { name: "my-api", version: "1.0.0" },
  api: { baseUrl: "https://api.example.com", auth: { type: "bearer", token: process.env.TOKEN ?? "" } },
  endpoints: fromOpenApi(spec),
});
```

You can also mix: use `fromOpenApi` as a base and spread in manual overrides or additions.

```typescript
endpoints: [
  ...fromOpenApi(spec),
  { name: "custom_tool", description: "...", method: "POST", path: "/custom" },
]
```

---

## Claude skill

A Claude Code slash command is included to generate a server file from a plain-English description of an API.

Copy `.claude/commands/create-mcp-server.md` to:
- `~/.claude/commands/` for global use across all projects
- `.claude/commands/` inside a specific project

Then run:

```
/create-mcp-server The Stripe API for payments — docs at stripe.com/docs/api
```

Claude will fetch the docs, infer the endpoints, and write a ready-to-run `server.ts` for you.

---

## TypeScript

All config types are exported for use in typed projects:

```typescript
import type { RestMcpConfig, EndpointDef, ParamDef, AuthStrategy } from "rest-mcp-wrapper";

const endpoints: EndpointDef[] = [ ... ];

const config: RestMcpConfig = {
  server: { name: "my-api", version: "1.0.0" },
  api: { baseUrl: "https://api.example.com" },
  endpoints,
};
```

---

## License

MIT
