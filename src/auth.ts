import type { AuthStrategy, ResolvedAuth } from "./types.js";

/**
 * Resolves an auth strategy into concrete headers and query params
 * that can be injected into every request.
 */
export function resolveAuth(auth: AuthStrategy | undefined): ResolvedAuth {
  if (!auth || auth.type === "none") {
    return { headers: {}, queryParams: {} };
  }

  switch (auth.type) {
    case "bearer":
      return {
        headers: { Authorization: `Bearer ${auth.token}` },
        queryParams: {},
      };

    case "apikey":
      if (auth.headerName) {
        return {
          headers: { [auth.headerName]: auth.key },
          queryParams: {},
        };
      }
      if (auth.queryParam) {
        return {
          headers: {},
          queryParams: { [auth.queryParam]: auth.key },
        };
      }
      // Default to X-API-Key header if neither is specified
      return {
        headers: { "X-API-Key": auth.key },
        queryParams: {},
      };

    case "basic": {
      const encoded = Buffer.from(`${auth.username}:${auth.password}`).toString("base64");
      return {
        headers: { Authorization: `Basic ${encoded}` },
        queryParams: {},
      };
    }

    case "custom":
      return {
        headers: { ...auth.headers },
        queryParams: {},
      };
  }
}
