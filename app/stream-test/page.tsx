"use client";

/**
 * TEMPORARY streaming test page (Phase 3 verification).
 *
 * Sends a query to POST /api/analysis and consumes the Server-Sent-Events
 * stream progressively, logging each lifecycle event as it arrives. This is a
 * scratch harness to confirm real-time streaming works — NOT the final UI.
 *
 * Because the stream is a POST response body (not a GET, which EventSource
 * requires), consumption uses fetch + reader and a small incremental SSE
 * parser.
 */

import { useState } from "react";

interface LogLine {
  index: number;
  event: string;
  data: string;
}

/** Parse an incremental SSE text chunk into complete frames (split on blank lines). */
function parseFrames(
  buffer: string,
  incoming: string
): { frames: string[]; buffer: string } {
  const all = buffer + incoming;
  const frames: string[] = [];
  let idx = 0;
  while (idx < all.length) {
    const end = all.indexOf("\n\n", idx);
    if (end === -1) break;
    frames.push(all.slice(idx, end));
    idx = end + 2;
  }
  return { frames, buffer: all.slice(idx) };
}

function frameEventAndData(frame: string): { event: string; data: string } {
  let event = "message";
  let data = "";
  for (const line of frame.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) data = line.slice(5).trim();
  }
  return { event, data };
}

export default function StreamTestPage() {
  const [query, setQuery] = useState("Analyze BTC risk");
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [summary, setSummary] = useState<string | null>(null);

  async function run() {
    setRunning(true);
    setLogs([]);
    setSummary(null);
    const lines: LogLine[] = [];

    try {
      const res = await fetch("/api/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      if (!res.ok || !res.body) {
        const body = await res.text();
        lines.push({
          index: lines.length,
          event: "http-error",
          data: `${res.status}: ${body}`,
        });
        setLogs([...lines]);
        setSummary("Request failed before streaming began.");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let index = 0;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const parsed = parseFrames(buffer, decoder.decode(value, { stream: true }));
        buffer = parsed.buffer;
        for (const frame of parsed.frames) {
          const { event, data } = frameEventAndData(frame);
          lines.push({ index: index++, event, data });
          setLogs([...lines]);
          if (event === "done") {
            const payload = data ? JSON.parse(data) : {};
            setSummary(payload.success ? "Stream completed (success)." : "Stream completed (error).");
          }
        }
      }
    } catch (err) {
      lines.push({
        index: lines.length,
        event: "client-error",
        data: err instanceof Error ? err.message : String(err),
      });
      setLogs([...lines]);
    } finally {
      setRunning(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-12">
      <div className="w-full max-w-3xl">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
          Streaming Test
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Sends a query and renders each SSE frame as it streams in.
        </p>

        <div className="mt-6 flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={running}
            className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 outline-none focus:border-[#f0b90b]"
            placeholder="Enter a query, e.g. Analyze BTC risk"
          />
          <button
            onClick={run}
            disabled={running}
            className="rounded-md bg-[#f0b90b] px-4 py-2 font-medium text-zinc-900 disabled:opacity-50"
          >
            {running ? "Streaming…" : "Run"}
          </button>
        </div>

        {summary && (
          <div className="mt-4 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200">
            {summary}
          </div>
        )}

        <div className="mt-6 overflow-hidden rounded-md border border-zinc-700">
          <div className="border-b border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-medium uppercase tracking-widest text-zinc-400">
            Event log (<span>{logs.length}</span>)
          </div>
          <pre className="max-h-[28rem] overflow-auto bg-zinc-950 p-3 text-xs leading-5 text-zinc-300">
            {logs.length === 0
              ? "No events yet — press Run to start streaming."
              : logs
                  .map(
                    (l) =>
                      `${String(l.index).padStart(2, "0")}  <${l.event}>  ${
                        l.event === "agent-complete"
                          ? l.data
                          : l.data.length > 140
                            ? l.data.slice(0, 140) + "…"
                            : l.data
                      }`
                  )
                  .join("\n")}
          </pre>
        </div>
      </div>
    </main>
  );
}
