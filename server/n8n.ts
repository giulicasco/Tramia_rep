import fetch from "node-fetch";

const N8N_BASE = process.env.N8N_BASE;
const INTERNAL_KEY = process.env.INTERNAL_KEY;

export const N8N_ENABLED = Boolean(N8N_BASE && INTERNAL_KEY);

export async function callN8N(path: string, payload?: any, init: RequestInit = {}) {
  if (!N8N_ENABLED) {
    throw new Error("n8n_disabled");
  }
  const url = `${N8N_BASE}${path}`;
  const method = init.method || (payload ? "POST" : "GET");
  const headers = {
    "content-type": "application/json",
    "x-internal-key": INTERNAL_KEY!,
    ...(init.headers || {}),
  };
  const res = await fetch(url, { method, headers, body: payload ? JSON.stringify(payload) : undefined });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`n8n ${res.status}: ${text || res.statusText}`);
  }
  return res.json();
}