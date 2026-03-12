/**
 * Example: GitHub API MCP Server
 *
 * Run with:
 *   GITHUB_TOKEN=ghp_xxx node --env-file=.env build/example/github-server.js
 *
 * Add to Claude Desktop (~/Library/Application Support/Claude/claude_desktop_config.json):
 * {
 *   "mcpServers": {
 *     "github": {
 *       "command": "node",
 *       "args": ["/path/to/build/example/github-server.js"],
 *       "env": { "GITHUB_TOKEN": "ghp_xxx" }
 *     }
 *   }
 * }
 */

import { createRestMcpServer } from "../src/index.js";

createRestMcpServer({
  server: { name: "github-api", version: "1.0.0" },
  api: {
    baseUrl: "https://api.github.com",
    auth: { type: "bearer", token: process.env.GITHUB_TOKEN ?? "" },
    defaultHeaders: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  },
  endpoints: [
    {
      name: "get_user",
      description: "Get a GitHub user's public profile",
      method: "GET",
      path: "/users/{username}",
      params: {
        username: { in: "path", type: "string", description: "GitHub username" },
      },
    },
    {
      name: "list_repos",
      description: "List public repositories for a user",
      method: "GET",
      path: "/users/{username}/repos",
      params: {
        username: { in: "path", type: "string", description: "GitHub username" },
        per_page: {
          in: "query",
          type: "integer",
          required: false,
          description: "Results per page (max 100)",
          default: 30,
        },
        sort: {
          in: "query",
          type: "string",
          required: false,
          description: "Sort field",
          enum: ["created", "updated", "pushed", "full_name"],
        },
      },
    },
    {
      name: "get_repo",
      description: "Get details for a specific repository",
      method: "GET",
      path: "/repos/{owner}/{repo}",
      params: {
        owner: { in: "path", type: "string", description: "Repository owner" },
        repo: { in: "path", type: "string", description: "Repository name" },
      },
    },
    {
      name: "list_issues",
      description: "List issues for a repository",
      method: "GET",
      path: "/repos/{owner}/{repo}/issues",
      params: {
        owner: { in: "path", type: "string", description: "Repository owner" },
        repo: { in: "path", type: "string", description: "Repository name" },
        state: {
          in: "query",
          type: "string",
          required: false,
          enum: ["open", "closed", "all"],
          default: "open",
        },
        per_page: {
          in: "query",
          type: "integer",
          required: false,
          default: 30,
          description: "Results per page (max 100)",
        },
      },
    },
    {
      name: "create_issue",
      description: "Create a new issue in a repository",
      method: "POST",
      path: "/repos/{owner}/{repo}/issues",
      params: {
        owner: { in: "path", type: "string", description: "Repository owner" },
        repo: { in: "path", type: "string", description: "Repository name" },
        title: { in: "body", type: "string", description: "Issue title" },
        body: {
          in: "body",
          type: "string",
          required: false,
          description: "Issue body (markdown supported)",
        },
        labels: {
          in: "body",
          type: "array",
          required: false,
          items: { type: "string" },
          description: "Label names to apply",
        },
      },
    },
    {
      name: "search_repos",
      description: "Search GitHub repositories",
      method: "GET",
      path: "/search/repositories",
      params: {
        q: { in: "query", type: "string", description: "Search query (supports qualifiers like language:typescript)" },
        sort: {
          in: "query",
          type: "string",
          required: false,
          enum: ["stars", "forks", "help-wanted-issues", "updated"],
        },
        per_page: {
          in: "query",
          type: "integer",
          required: false,
          default: 10,
          description: "Results per page (max 100)",
        },
      },
    },
  ],
}).catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
