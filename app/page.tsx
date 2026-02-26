"use client";

import { useState } from "react";

type StackOption = {
  value: string;
  label: string;
  bestAt: string;
};

const WANTS = [
  { value: "chat assistant",   label: "Chat Assistant",   help: "A conversational helper that answers questions or chats with users." },
  { value: "ai knowledge app", label: "AI Knowledge App", help: "Searches docs or sites and answers questions about them (RAG-style)." },
  { value: "support bot",      label: "Support Bot",      help: "A customer-help assistant living in Slack, Discord, or your site." },
  { value: "automation tool",  label: "Automation Tool",  help: "A background worker that processes data or messages automatically." },
  { value: "website starter",  label: "Website Starter",  help: "A simple landing page or product site with AI-generated content." },
  { value: "ai dev helper",    label: "AI Dev Helper",    help: "Reads GitHub issues/PRs, writes summaries or suggested responses." },
];

const STACKS: StackOption[] = [
  { value: "nextjs",         label: "Next.js (Web)",              bestAt: "Best for polished websites and web apps with pages, navigation, and UI." },
  { value: "node-express",   label: "Node.js + Express (Server)", bestAt: "Runs backend logic — perfect for bots, APIs, and background tasks." },
  { value: "python-fastapi", label: "Python + FastAPI (AI Ready)",bestAt: "Great for AI projects, chatbots, and anything needing Python libraries." },
  { value: "python-flask",   label: "Python + Flask (Simple)",    bestAt: "Very lightweight — ideal for tiny prototypes and quick bots." },
  { value: "deno-fresh",     label: "Deno + Fresh (Modern)",      bestAt: "New, secure, lightweight stack for JavaScript/TypeScript projects." },
  { value: "bun-elysia",     label: "Bun + Elysia (Experimental)",bestAt: "Extremely fast JS/TS runtime — great for tinkering and high speed." },
];

const RECOMMENDED: Record<string, string> = {
  "chat assistant":   "nextjs",
  "ai knowledge app": "python-fastapi",
  "support bot":      "node-express",
  "automation tool":  "node-express",
  "website starter":  "nextjs",
  "ai dev helper":    "python-fastapi",
};

function getStackLabel(v: string) {
  return STACKS.find(s => s.value === v)?.label ?? v;
}
function getStackHelp(v: string) {
  return STACKS.find(s => s.value === v)?.bestAt ?? "";
}
function getWantHelp(v: string) {
  return WANTS.find(w => w.value === v)?.help ?? "";
}

export default function Page() {
  const [want, setWant] = useState(WANTS[0].value);
  const [stack, setStack] = useState(RECOMMENDED[WANTS[0].value]);
  const [userOverrodeStack, setUserOverrodeStack] = useState(false);
  const [level, setLevel] = useState("Comfortable");
  const [model, setModel] = useState("gpt-4o-mini");
  const [temperature, setTemperature] = useState(0.4);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("");
  const [snippet, setSnippet] = useState<string>("");
  const [info, setInfo] = useState<{ latencyMs?: number; success?: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onChangeWant(v: string) {
    setWant(v);
    if (!userOverrodeStack) {
      const rec = RECOMMENDED[v];
      if (rec) setStack(rec);
    }
  }

  function onChangeStack(v: string) {
    setUserOverrodeStack(true);
    setStack(v);
  }

  function buildPrompt() {
    return (
      `Goal: ${WANTS.find(w => w.value === want)?.label}. ` +
      `Recommended stack: ${getStackLabel(stack)}. ` +
      `${userOverrodeStack ? "User overrode recommendation. " : "User accepted recommendation. "}` +
      `Experience level: ${level}. ` +
      `Return EXACTLY:\n` +
      `Plan:\n- one short paragraph\n` +
      `Next steps:\n- three bullets\n` +
      `Snippet:\n` +
      "```bash\n# a single, minimal first API call (curl or fetch)\n```\n"
    );
  }

  async function run() {
    setLoading(true);
    setError(null);
    setResult("");
    setSnippet("");
    setInfo(null);

    const prompt = buildPrompt();

    try {
      const r = await fetch("/api/first-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, model, temperature }),
      });

      const data = await r.json();

      if (!r.ok || !data?.success) {
        setError(typeof data?.error === "string" ? data.error : JSON.stringify(data?.error ?? data).slice(0, 400));
        setInfo({ latencyMs: data?.latencyMs, success: false });
        return;
      }

      const o = data.output;
      const parts = [
        o?.use_case && `Use case:\n${o.use_case}`,
        o?.recommended_api_surface && `Recommended API:\n${o.recommended_api_surface}`,
        o?.next_step && `Next step:\n${o.next_step}`,
      ].filter(Boolean).join("\n\n");

      setResult(parts);
      setSnippet(o?.first_call_example ?? "");
      setInfo({ latencyMs: data.latencyMs, success: true });
    } catch (e: any) {
      setError(e?.message ?? "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 820, margin: "40px auto", padding: "0 16px", lineHeight: 1.45 }}>
      <h1 style={{ fontSize: 40, fontWeight: 700, marginBottom: 19 }}>OpenAI Builder Onramp</h1>
      <p style={{ marginBottom: 18 }}>
        Experimental onboarding prototype designed to reduce friction between idea and first API call
      </p>

      <div style={{ fontSize: 18, display: "grid", gap: 12, marginBottom: 16 }}>
        <label>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>What do you want to build?</div>
          <select value={want} onChange={(e) => onChangeWant(e.target.value)} style={{ width: "100%", padding: 8 }}>
            {WANTS.map(w => (
              <option key={w.value} value={w.value}>{w.label}</option>
            ))}
          </select>
          <div style={{ fontSize: 12, color: "#555", marginTop: 6 }}>{getWantHelp(want)}</div>
        </label>

        <label>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>
            Tech stack {!userOverrodeStack && <span style={{ color: "#0a7", fontSize: 14, marginLeft: 8 }}>Recommended</span>}
          </div>
          <select value={stack} onChange={(e) => onChangeStack(e.target.value)} style={{ width: "100%", padding: 8 }}>
            {STACKS.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <div style={{ fontSize: 12, color: "#555", marginTop: 6 }}>
            <b>Why this:</b> {getStackHelp(stack)}
          </div>
          {!userOverrodeStack && (
            <div style={{ fontSize: 19, color: "#185bb3ff", marginTop: 4 }}>
              Preselected based on "{WANTS.find(w => w.value === want)?.label}". You can switch if you prefer Python or another stack.
            </div>
          )}
        </label>

        <label>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>Experience level</div>
          <select value={level} onChange={(e) => setLevel(e.target.value)} style={{ width: "100%", padding: 8 }}>
            <option>New to it</option>
            <option>Comfortable</option>
            <option>Advanced</option>
          </select>
        </label>
      </div>

      <div style={{ display: "grid", gap: 12, margin: "12px 0 8px" }}>
        <label>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>Model</div>
          <select value={model} onChange={(e) => setModel(e.target.value)} style={{ width: "100%", padding: 8 }}>
            <option value="gpt-4o-mini">gpt-4o-mini</option>
            <option value="gpt-4o">gpt-4o</option>
          </select>
        </label>
      </div>

      <details style={{ margin: "8px 0 30px" }}>
        <summary style={{ cursor: "pointer", fontWeight: 600 }}>Advanced</summary>
        <div style={{ marginTop: 10 }}>
          <label>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Temperature</span>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>{temperature.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              style={{ width: "100%" }}
            />
            <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
              Lower = more deterministic · Higher = more creative/variable
            </div>
          </label>
        </div>
      </details>

      <button
        onClick={run}
        disabled={loading}
        style={{
          padding: "10px 16px",
          borderRadius: 6,
          background: loading ? "#777" : "#111",
          color: "#fff",
          border: 0,
          cursor: loading ? "default" : "pointer",
          marginBottom: 16,
        }}
      >
        {loading ? "Running…" : "Run first call"}
      </button>

      {error && (
        <div style={{ background: "#fde8e8", color: "#8a1111", padding: 12, borderRadius: 8, marginBottom: 12 }}>
          <b>Error</b>
          <div>{error}</div>
        </div>
      )}

      {result && (
        <div style={{ background: "#f6f7f9", padding: 12, borderRadius: 8, marginBottom: 12 }}>
          <b>Plan & steps</b>
          <pre style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{result}</pre>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button
              onClick={() => navigator.clipboard.writeText(result)}
              style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #ccc", background: "#fff", cursor: "pointer" }}
            >
              Copy plan
            </button>
          </div>
        </div>
      )}

      {snippet && (
        <div style={{ background: "#eef6ff", padding: 12, borderRadius: 8, marginBottom: 12 }}>
          <b>Snippet</b>
          <pre style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{snippet}</pre>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button
              onClick={() => navigator.clipboard.writeText(snippet)}
              style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #9ec1ff", background: "#fff", cursor: "pointer" }}
            >
              Copy snippet
            </button>
          </div>
        </div>
      )}

      {info && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ background: "#f6f7f9", padding: 12, borderRadius: 8 }}>
            <div style={{ fontSize: 19, color: "#555" }}>Latency ms</div>
            <div style={{ fontWeight: 700 }}>{info.latencyMs ?? "—"}</div>
          </div>
          <div style={{ background: "#f6f7f9", padding: 12, borderRadius: 8 }}>
            <div style={{ fontSize: 19, color: "#555" }}>Success</div>
            <div style={{ fontWeight: 700 }}>{info.success ? "true" : "false"}</div>
          </div>
        </div>
      )}
    </main>
  );
}