import { NextRequest, NextResponse } from "next/server";

// The VEX events API (formerly RobotEvents). Same data model, new host.
const BASE = "https://events.vex.com/api/v2";

/**
 * Server-side proxy to the VEX events API. Injects the secret Bearer token
 * (never exposed to the browser) and forwards the request. Set VEX_API_TOKEN
 * in the environment to enable it.
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const token = process.env.VEX_API_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "VEX API token not configured. Set VEX_API_TOKEN on the server." },
      { status: 503 },
    );
  }

  const { path } = await ctx.params;
  const target = `${BASE}/${path.map(encodeURIComponent).join("/")}${req.nextUrl.search}`;

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      next: { revalidate: 30 },
    });
  } catch {
    return NextResponse.json({ error: "Failed to reach the VEX events API." }, { status: 502 });
  }

  const body = await upstream.text();
  return new NextResponse(body, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
    },
  });
}
