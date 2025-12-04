import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "missing prompt" });

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const client = new GoogleGenAI({ apiKey });
    const MODEL_NAME = "gemini-2.5-flash";
    const response = await client.models.generateContent({
      model: MODEL_NAME,
      contents: prompt
    });
    const text = response?.text ?? "";
    let parsed;
    try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }
    return res.status(200).json({ success: true, result: parsed });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
