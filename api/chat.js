export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Browsers hitting /api/chat directly will use GET.
  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      message: 'Use POST with JSON body: { "message": "..." }',
    });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const message = req.body?.message || '';

    const context = `You are the AI assistant for Orbyn, a premium web design studio.
Orbyn builds: Brand Identity, Web Design & Development, Motion & 3D, Strategy & GTM.
Keep replies short (2-4 sentences), friendly, and professional.
Pricing: projects start from $2,000, full brand + web from $8,000+.
Timeline: typically 2-6 weeks depending on scope.
Contact: vibecodexx@gmail.com`;

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
          contents: [{ parts: [{ text: context + '\n\nUser: ' + message }] }],
        }),
      }
    );

    const data = await r.json();
    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Email us at vibecodexx@gmail.com!';

    return res.status(200).json({ reply });
  } catch {
    return res.status(200).json({ reply: 'Email us at vibecodexx@gmail.com!' });
  }
}

