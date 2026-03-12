import type { EndpointDef, ApiConfig, ResolvedAuth } from "./types.js";
import { classifyParams } from "./params.js";

const DEFAULT_TIMEOUT = 30_000;

/**
 * Builds and executes an HTTP request for a given endpoint + args,
 * returning the response body as a string.
 */
export async function executeRequest(
  endpoint: EndpointDef,
  apiConfig: ApiConfig,
  args: Record<string, unknown>,
  auth: ResolvedAuth
): Promise<string> {
  const params = endpoint.params ?? {};
  const { pathParams, queryParams, bodyParams, headerParams } = classifyParams(params);

  // 1. Interpolate path
  const interpolatedPath = interpolatePath(endpoint.path, pathParams, args);

  // 2. Build query string
  const queryEntries: Record<string, string> = { ...auth.queryParams };

  for (const name of Object.keys(queryParams)) {
    const value = resolveValue(name, args);
    if (value !== undefined && value !== null) {
      queryEntries[name] = String(value);
    }
  }

  // GET/DELETE: body params are demoted to query params
  const isBodyless = endpoint.method === "GET" || endpoint.method === "DELETE";
  if (isBodyless) {
    for (const name of Object.keys(bodyParams)) {
      const value = resolveValue(name, args);
      if (value !== undefined && value !== null) {
        queryEntries[name] = String(value);
      }
    }
  }

  const url = buildUrl(apiConfig.baseUrl, interpolatedPath, queryEntries);

  // 3. Build headers
  const headers: Record<string, string> = {
    ...apiConfig.defaultHeaders,
    ...auth.headers,
    ...endpoint.headers,
  };

  for (const name of Object.keys(headerParams)) {
    const value = resolveValue(name, args);
    if (value !== undefined && value !== null) {
      headers[name] = String(value);
    }
  }

  // 4. Build body
  let body: BodyInit | undefined;
  if (!isBodyless && Object.keys(bodyParams).length > 0) {
    const bodyData: Record<string, unknown> = {};
    for (const name of Object.keys(bodyParams)) {
      const value = resolveValue(name, args);
      if (value !== undefined) {
        bodyData[name] = value;
      }
    }

    if (endpoint.bodyEncoding === "form") {
      const form = new URLSearchParams();
      for (const [k, v] of Object.entries(bodyData)) {
        form.append(k, String(v));
      }
      body = form;
      headers["Content-Type"] = headers["Content-Type"] ?? "application/x-www-form-urlencoded";
    } else {
      body = JSON.stringify(bodyData);
      headers["Content-Type"] = headers["Content-Type"] ?? "application/json";
    }
  }

  // 5. Execute with timeout
  const timeout = apiConfig.timeout ?? DEFAULT_TIMEOUT;
  const signal = AbortSignal.timeout(timeout);

  let response: Response;
  try {
    response = await fetch(url, {
      method: endpoint.method,
      headers,
      body,
      signal,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "TimeoutError") {
      throw new Error(`Request timed out after ${timeout}ms: ${endpoint.method} ${url}`);
    }
    throw err;
  }

  // 6. Parse response
  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status} ${response.statusText}: ${truncate(responseText, 500)}`
    );
  }

  if (endpoint.responseFormat === "text") {
    return responseText;
  }

  // Try to pretty-print JSON responses
  if (responseText.trim().startsWith("{") || responseText.trim().startsWith("[")) {
    try {
      return JSON.stringify(JSON.parse(responseText), null, 2);
    } catch {
      // Not valid JSON, return as-is
    }
  }

  return responseText;
}

function interpolatePath(
  path: string,
  pathParamDefs: Record<string, unknown>,
  args: Record<string, unknown>
): string {
  return path.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = args[key];
    if (value === undefined || value === null) {
      // Check if there's a default in args (Zod applies defaults before we get here)
      throw new Error(`Missing required path parameter: "${key}"`);
    }
    return encodeURIComponent(String(value));
  });
  void pathParamDefs;
}

function buildUrl(baseUrl: string, path: string, queryEntries: Record<string, string>): string {
  const base = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const fullPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${base}${fullPath}`;

  const queryKeys = Object.keys(queryEntries);
  if (queryKeys.length === 0) return url;

  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(queryEntries)) {
    qs.append(k, v);
  }
  return `${url}?${qs.toString()}`;
}

function resolveValue(name: string, args: Record<string, unknown>): unknown {
  return args[name];
}

function truncate(str: string, maxLen: number): string {
  return str.length > maxLen ? str.slice(0, maxLen) + "…" : str;
}
