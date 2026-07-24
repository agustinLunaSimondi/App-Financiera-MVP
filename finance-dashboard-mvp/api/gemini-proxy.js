// Proxy de Gemini en Vercel (región US iad1 por default).
//
// Motivo: la IP de egress de Render (aunque el datacenter sea US East/Ohio) aparece
// geolocalizada fuera de US en las bases que usa Google, y Gemini rechaza con
// "User location is not supported for the API use" (FAILED_PRECONDITION → 502).
//
// Este endpoint corre en la infra de Vercel (US), donde Gemini sí acepta la llamada.
// El backend de Render llama acá en vez de llamar a Gemini directo.
//
// Seguridad: requiere el header `x-proxy-secret` igual a GEMINI_PROXY_SECRET para
// que no sea un relay abierto de Gemini. La API key vive solo acá como env var.

import { timingSafeEqual } from "node:crypto";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

// Comparación constant-time: `!==` filtra información de timing que permitiría
// adivinar el secreto carácter por carácter.
function secretsMatch(provided, expected) {
  if (typeof provided !== "string" || typeof expected !== "string") {
    return false;
  }
  const providedBuf = Buffer.from(provided);
  const expectedBuf = Buffer.from(expected);
  if (providedBuf.length !== expectedBuf.length) {
    return false;
  }
  return timingSafeEqual(providedBuf, expectedBuf);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const secret = process.env.GEMINI_PROXY_SECRET;
  if (!secret || !secretsMatch(req.headers["x-proxy-secret"], secret)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return res
      .status(500)
      .json({ error: "GEMINI_API_KEY no configurada en el proxy" });
  }

  try {
    const upstream = await fetch(`${GEMINI_URL}?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });

    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader("Content-Type", "application/json");
    return res.send(text);
  } catch (e) {
    return res
      .status(502)
      .json({ error: "Proxy upstream error", detail: String(e) });
  }
}
