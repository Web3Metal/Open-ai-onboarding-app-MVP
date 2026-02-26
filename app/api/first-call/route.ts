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

    const body = await req.json().catch(() => ({}));
    const prompt: string =
      typeof body?.prompt === "string" && body.prompt.trim()
        ? body.prompt.slice(0, 2000)
        : "Give me one fun sentence proving this OpenAI call works.";
    const temperature =
      typeof body?.temperature === "number"
        ? Math.min(Math.max(body.temperature, 0), 1)
        : 0.4;
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
          {
            role: "system",
            content:
              'You are a concise, friendly assistant. Return ONLY valid JSON. No prose, no markdown, no backticks. Schema: {"use_case":"string","recommended_api_surface":"string","first_call_example":"string","next_step":"string"}. All fields required.',
          },
          {
            role: "user",
            content: `A developer wants to build the following:\n\n${prompt}\n\nReturn a structured onboarding recommendation in this exact JSON format:\n\n{"use_case":"...","recommended_api_surface":"...","first_call_example":"...","next_step":"..."}\n\nReturn only valid JSON. No markdown. No explanation.`,
          },
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
        {
          success: false,
          latencyMs: ms,
          error: `Non-JSON from OpenAI: ${raw.slice(0, 200)}`,
        },
        { status: 500 }
      );
    }

    const content = data?.choices?.[0]?.message?.content ?? "";
    const usage = data?.usage || null;

    let output: any;
    try {
      output = JSON.parse(content);
    } catch {
      return NextResponse.json(
        {
          success: false,
          latencyMs: ms,
          error: "Invalid JSON response from model.",
          raw: content,
          usage,
          model,
          temperature,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      latencyMs: ms,
      output,
      usage,
      model,
      temperature,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}