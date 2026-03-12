Your job is to generate a complete, ready-to-run MCP server file using the `rest-mcp-wrapper` library based on the user's description of an API.

The user's request: $ARGUMENTS

---

## Your process

### Step 1 — Gather information

If $ARGUMENTS is empty or vague, ask the user for the following before generating anything:

1. **API name** — what is the service called?
2. **Base URL** — what is the root URL for all API calls?
3. **Authentication** — how does the API authenticate?
   - No auth
   - Bearer/JWT token (what env var holds it?)
   - API key in a header (which header name?)
   - API key in a query param (which param name?)
   - Basic auth (username + password, from which env vars?)
4. **Endpoints** — list the endpoints to expose. For each, ask (or infer from docs/description):
   - Name (will become the MCP tool name, use snake_case)
   - What it does (description for the LLM)
   - HTTP method
   - URL path (note any path parameters like `/users/{id}`)
   - Parameters: name, where it goes (path/query/body/header), type, whether required

If the user provides a URL to API documentation, use the WebFetch tool to read it and infer the endpoints automatically. Do not ask for information you can infer.

---

### Step 2 — Generate the server file

Create a file named `server.ts` (or `<api-name>-server.ts` if a name is clear) in the current working directory.

The file must follow this exact pattern:

```typescript
import { createRestMcpServer } from "rest-mcp-wrapper";

createRestMcpServer({
  server: { name: "<api-name>", version: "1.0.0" },
  api: {
    baseUrl: "<base-url>",
    // Include only the auth block that applies:
    auth: { type: "bearer", token: process.env.API_TOKEN ?? "" },
    // auth: { type: "apikey", key: process.env.API_KEY ?? "", headerName: "X-Api-Key" },
    // auth: { type: "apikey", key: process.env.API_KEY ?? "", queryParam: "api_key" },
    // auth: { type: "basic", username: process.env.API_USER ?? "", password: process.env.API_PASS ?? "" },
    // auth: { type: "none" },
    defaultHeaders: {
      // Add any headers every request needs, e.g.:
      // Accept: "application/json",
    },
  },
  endpoints: [
    {
      name: "tool_name",
      description: "Clear, specific description of what this tool does and when to use it",
      method: "GET",
      path: "/path/{param}",
      params: {
        param: { in: "path", type: "string", description: "What this param is" },
        optional_query: { in: "query", type: "string", required: false, description: "..." },
      },
    },
    // ... more endpoints
  ],
}).catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
```

**Rules for writing the config:**
- Every endpoint `name` must be unique and snake_case
- Every endpoint `description` must be specific enough for an LLM to know when to use this tool vs others
- All `{placeholder}` segments in `path` must have a matching param with `in: "path"`
- Use `in: "body"` for POST/PUT/PATCH request body fields
- Use `in: "query"` for URL query string parameters
- Use `in: "header"` only for per-request headers that vary (static headers go in `defaultHeaders`)
- Credentials always come from `process.env` — never hardcode secrets
- Include `enum` on params where only specific values are valid
- Include `default` on optional params that have a sensible default
- Remove unused auth blocks and comments from the final output

**Supported param types:** `"string"` | `"number"` | `"integer"` | `"boolean"` | `"array"` | `"object"`

---

### Step 3 — Create a .env.example file

Create `.env.example` in the current directory listing every env var referenced in the server file:

```
# <API Name> MCP Server
API_TOKEN=your_token_here
```

---

### Step 4 — Build the server

After creating the files, output these instructions (substituting real values):

```
## Setup

1. Install the dependency:
   npm install rest-mcp-wrapper

2. Copy and fill in your credentials:
   cp .env.example .env

3. Build and run:
   npx tsc && node --env-file=.env build/server.js
```

---

### Step 5 — Offer Claude Desktop config (optional)

After Step 4, ask the user: *"Would you like instructions for adding this to your local Claude Desktop for testing?"*

Only if they say yes, output:

> **Note:** This is for local testing or personal use only — not part of a production deployment.

```
## Add to Claude Desktop

In ~/Library/Application Support/Claude/claude_desktop_config.json (macOS)
or %APPDATA%\Claude\claude_desktop_config.json (Windows):

{
  "mcpServers": {
    "<api-name>": {
      "command": "node",
      "args": ["/absolute/path/to/build/server.js"],
      "env": {
        "API_TOKEN": "your_token_here"
      }
    }
  }
}
```

---

### Step 6 — Offer OpenAPI shortcut (if applicable)

If the API has a publicly accessible OpenAPI/Swagger spec URL, offer this simpler alternative after generating the manual config:

> **Tip:** If `<API name>` publishes an OpenAPI spec at `<spec-url>`, you can replace the `endpoints` array with:
> ```typescript
> import spec from "./openapi.json" with { type: "json" };
> import { fromOpenApi } from "rest-mcp-wrapper";
> // ...
> endpoints: fromOpenApi(spec),
> ```
> Download the spec with: `curl <spec-url> -o openapi.json`
