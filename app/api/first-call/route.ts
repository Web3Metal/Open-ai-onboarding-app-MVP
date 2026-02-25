import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const started = Date.now();
  try {
    const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "Missing OPENAI_API_KEY" },
        { status: 500 }
      );
    }
   

    // Defaults + user overrides
    const body = await req.json().catch(() => ({}));
    const prompt: string =
      typeof body?.prompt === "string" && body.prompt.trim()
        ? body.prompt.slice(0, 2000)
        : "Give me one fun sentence proving this OpenAI call works.";
    const temperature =
      typeof body?.temperature === "number" ? Math.min(Math.max(body.temperature, 0), 1) : 0.4;
    const model: string = body?.model || "gpt-4o-mini";

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
              },
      body: JSON.stringify({
        model,
        temperature,
        max_tokens: 250,
        messages: [
          { role: "system", content: "You are a concise, friendly assistant." },
          { role: "user", content: prompt },
        ],
      }),
    });

    const ms = Date.now() - started;
    const raw = await r.text();

    let data: any;
    try {
      data = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { success: false, latencyMs: ms, error: `Non-JSON: ${raw.slice(0, 200)}` },
        { status: 500 }
      );
    }

    if (!r.ok) {
      return NextResponse.json(
        { success: false, latencyMs: ms, error: data?.error || data },
        { status: r.status || 500 }
      );
    }

    const output = data?.choices?.[0]?.message?.content ?? "(no content)";
    const usage = data?.usage || null;

    return NextResponse.json({ success: true, latencyMs: ms, output, usage, model, temperature });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
