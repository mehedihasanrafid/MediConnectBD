const forwardedHeaders = [
  "accept", "authorization", "content-type", "cookie", "idempotency-key", "origin", "user-agent",
];

function httpsOrigin(value) {
  const url = value ? URL.parse(value) : null;
  return url?.protocol === "https:" && url.origin === value ? url : null;
}

function unavailable() {
  return Response.json({
    code: "API_UNAVAILABLE",
    message: "The server may be starting. Wait a moment and try again.",
  }, { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "10" } });
}

export async function onRequest({ request, env }) {
  const incoming = new URL(request.url);
  const upstream = httpsOrigin(env.API_ORIGIN);
  const frontend = httpsOrigin(env.APP_ORIGIN);
  if (!upstream || !frontend || upstream.origin === frontend.origin || !env.PAGES_PROXY_KEY) return unavailable();
  if (incoming.origin !== frontend.origin || !incoming.pathname.startsWith("/api/v1/")) {
    return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  const origin = request.headers.get("origin");
  if (origin && origin !== frontend.origin) {
    return Response.json({ code: "ORIGIN_FORBIDDEN", message: "This request origin is not allowed" },
      { status: 403, headers: { "Cache-Control": "no-store" } });
  }

  upstream.pathname = incoming.pathname;
  upstream.search = incoming.search;
  const headers = new Headers();
  for (const name of forwardedHeaders) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const ip = request.headers.get("cf-connecting-ip");
  if (ip) {
    headers.set("x-mediconnect-client-ip", ip);
    headers.set("x-mediconnect-proxy-key", env.PAGES_PROXY_KEY);
  }

  try {
    const response = await fetch(upstream, {
      method: request.method,
      headers,
      body: request.body,
      redirect: "manual",
      duplex: "half",
      signal: AbortSignal.timeout(70_000),
    });
    if (response.status >= 300 && response.status < 400 && response.status !== 304) return unavailable();
    if (response.status >= 500 && !response.headers.get("content-type")?.includes("json")) return unavailable();
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set("Cache-Control", "no-store");
    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch {
    return unavailable();
  }
}
