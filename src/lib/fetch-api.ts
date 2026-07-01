import { withBasePath } from "@/lib/base-path";

/** Browser-relative path to this app's API (includes basePath when configured). */
export function apiPath(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return withBasePath(normalized);
}

/** `fetch()` wrapper for same-origin API routes under basePath deploys. */
export function fetchApi(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  return fetch(apiPath(path), init);
}
