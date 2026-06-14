import { NextRequest, NextResponse } from "next/server";

interface IssuePayload {
  title?: string;
  body?: string;
  labels?: string[];
}

/**
 * Creates a GitHub issue for "Report Issue".
 * Requires GITHUB_TOKEN (repo/issues scope) and GITHUB_ISSUES_REPO ("owner/name").
 */
export async function POST(req: NextRequest) {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_ISSUES_REPO;
  if (!token || !repo) {
    return NextResponse.json(
      { error: "Issue reporting is not configured. Set GITHUB_TOKEN and GITHUB_ISSUES_REPO." },
      { status: 503 },
    );
  }

  let payload: IssuePayload;
  try {
    payload = (await req.json()) as IssuePayload;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const title = (payload.title ?? "").trim();
  if (!title) {
    return NextResponse.json({ error: "A title is required." }, { status: 400 });
  }

  let res: Response;
  try {
    res = await fetch(`https://api.github.com/repos/${repo}/issues`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        title,
        body: payload.body ?? "",
        labels: payload.labels ?? ["user-report"],
      }),
    });
  } catch {
    return NextResponse.json({ error: "Failed to reach GitHub." }, { status: 502 });
  }

  const data = (await res.json().catch(() => ({}))) as { html_url?: string; number?: number; message?: string };
  if (!res.ok) {
    return NextResponse.json({ error: data.message ?? "Failed to create issue." }, { status: res.status });
  }
  return NextResponse.json({ url: data.html_url, number: data.number });
}
