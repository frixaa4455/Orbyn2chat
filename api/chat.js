const SYSTEM = `You are Orby, Orbyn's assistant. Orbyn is a premium creative studio.

Services: Brand Identity · Web Design & Dev · Motion & 3D · Strategy & GTM
Pricing: from $2,000 — full brand + web from $8,000+
Timeline: 2–6 weeks depending on scope
Contact: vibecodexx@gmail.com or scroll to the Contact section

REPLY STYLE:
- 1–3 lines MAX. Sharp, confident, premium. Never salesy or pushy.
- Use bullet points or em-dashes for lists — never long paragraphs.
- Sound like a trusted advisor, not a salesperson.

INSIGHT NUDGES — weave these in naturally when relevant (don't force them every message):
- "76% of people judge a business's credibility by its website design." (Stanford)
- "Companies with a strong brand identity grow revenue 3x faster on average."
- "Over 70% of users browse on mobile — a slow or ugly mobile site loses them in 3 seconds."
- "Businesses with a professional online presence attract up to 40% more customers."
- "First impressions happen in 0.05 seconds — your design either wins or loses before a word is read."
Use these as helpful context, not pressure. Position Orbyn as the solution, not the upsell.

OFF-TOPIC: One witty line + redirect. Example: "Not my lane 😄 — but I can help you make a serious impression online. What are you building?"

NEVER: fabricate clients, write more than 3 sentences, sound like a sales pitch.`;

function parseBody(req) {
  let b = req.body;
  if (typeof b === 'string') {
    try {
      b = JSON.parse(b || '{}');
    } catch {
      b = {};
    }
  }
  return b && typeof b === 'object' ? b : {};
}

function historyToContents(body) {
  const raw = Array.isArray(body.history) ? body.history : [];
  const contents = [];
  for (const m of raw) {
    if (!m || typeof m.content !== 'string' || !m.content.trim()) continue;
    const role = m.role === 'assistant' ? 'model' : m.role === 'user' ? 'user' : null;
    if (!role) continue;
    contents.push({ role, parts: [{ text: m.content }] });
  }
  if (contents.length === 0 && typeof body.message === 'string' && body.message.trim()) {
    contents.push({ role: 'user', parts: [{ text: body.message.trim() }] });
  }
  return contents;
}

function extractReply(data) {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts.map((p) => p?.text).filter(Boolean).join('');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Browsers hitting /api/chat directly will use GET.
  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      message: 'Use POST with JSON body: { "message": "..." } or { "history": [...] }',
    });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const fallback = 'Email us at vibecodexx@gmail.com!';

  try {
    const body = parseBody(req);
    const contents = historyToContents(body);
    if (contents.length === 0) {
      return res.status(400).json({ error: 'Missing message or history' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Missing GEMINI_API_KEY' });
    }

    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM }] },
          contents,
        }),
      }
    );

    const data = await r.json();
    if (data?.error) {
      return res.status(200).json({ reply: fallback });
    }

    const reply = extractReply(data) || fallback;
    return res.status(200).json({ reply });
  } catch {
    return res.status(200).json({ reply: fallback });
  }
}

