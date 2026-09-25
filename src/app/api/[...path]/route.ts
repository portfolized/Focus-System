import type { NextRequest } from "next/server";

/**
 * Forwards /api/* to the Node.js backend (../backend). The browser only ever talks to this site's own
 * origin, so the httpOnly session cookie set by the backend just works.
 *
 * A route handler instead of a next.config rewrite: BACKEND_URL is read at request time (not baked in at
 * build time), redirects are passed through instead of followed, and an unreachable backend gets a clear
 * JSON error instead of a failed fetch in the browser.
 */
export const dynamic = "force-dynamic";

const FORWARD_REQUEST_HEADERS = ["accept", "authorization", "content-type", "cookie", "user-agent", "x-timezone"];
const SKIP_RESPONSE_HEADERS = new Set(["connection", "content-encoding", "content-length", "keep-alive", "transfer-encoding"]);

function backendUrl() {
  const raw = process.env.BACKEND_URL?.trim().replace(/\/+$/, "");
  if (raw) return /^https?:\/\//.test(raw) ? raw : `https://${raw}`;
  return process.env.VERCEL ? null : "http://localhost:4000";
}

async function forward(request: NextRequest) {
  const base = backendUrl();
  if (!base) {
    return Response.json({ error: "Server is misconfigured: BACKEND_URL is not set" }, { status: 500 });
  }

  const headers = new Headers();
  for (const name of FORWARD_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const ip = request.headers.get("x-forwarded-for");
  if (ip) headers.set("x-forwarded-for", ip);

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const target = `${base}${request.nextUrl.pathname}${request.nextUrl.search}`;

  let res: Response;
  try {
    res = await fetch(target, {
      method: request.method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
      redirect: "manual",
      cache: "no-store",
    });
  } catch (err) {
    console.error(`[api proxy] ${request.method} ${target} failed:`, err);
    return Response.json({ error: "Can't reach the Focus System server. Please try again shortly." }, { status: 502 });
  }

  const out = new Headers();
  res.headers.forEach((value, name) => {
    if (!SKIP_RESPONSE_HEADERS.has(name) && name !== "set-cookie") out.set(name, value);
  });
  for (const cookie of res.headers.getSetCookie()) out.append("set-cookie", cookie);

  // Relative redirects from the backend (e.g. /api/auth/logout -> /login) must stay on this site.
  const location = res.headers.get("location");
  if (location?.startsWith(base)) out.set("location", location.slice(base.length) || "/");

  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: out });
}

export const GET = forward;
export const POST = forward;
export const PUT = forward;
export const PATCH = forward;
export const DELETE = forward;
export const OPTIONS = forward;
