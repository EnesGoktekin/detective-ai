import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import axios from 'axios';

const app = express();
const PORT = 3004;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({ status: 'ok' });
});

// Simple health check to verify deployment and env
app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    env: {
      OPENAI_API_KEY: Boolean(process.env.OPENAI_API_KEY),
    },
  });
});

app.get('/api/cases', async (_req, res) => {
  try {
    const filePath = path.join(__dirname, 'data', 'cases.json');
    const data = await fs.readFile(filePath, 'utf-8');
    res.json(JSON.parse(data));
  } catch (error) {
    console.error('HATA /api/cases:', error);
    res.status(500).json({ error: 'Failed to load cases' });
  }
});

app.get('/api/cases/:caseId', async (req, res) => {
  try {
    const { caseId } = req.params;
    const filePath = path.join(__dirname, 'data', `${caseId}.json`);
    const data = await fs.readFile(filePath, 'utf-8');
    res.json(JSON.parse(data));
  } catch (error) {
    console.error(`HATA /api/cases/${req.params.caseId}:`, error);
    res.status(404).json({ error: 'Case not found' });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const { caseId, message, chatHistory } = req.body;
    if (!message || !caseId) {
      return res.status(400).json({ error: "Missing message or caseId" });
    }

    // Gemini API Key (prefer GEMINI_API_KEY, fallback GOOGLE_API_KEY)
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      console.error("ÖLÜMCÜL HATA: GEMINI_API_KEY/GOOGLE_API_KEY ayarlanmamış!");
      return res.status(500).json({ error: "Server is missing AI configuration (Gemini API Key)." });
    }

    const filePath = path.join(__dirname, 'data', `${caseId}.json`);
    const caseData = JSON.parse(await fs.readFile(filePath, "utf-8"));

  const systemPrompt = `You are "AI Detective", a witty, sharp, and focused detective assistant. Your ONLY goal is to help the user solve the case provided in the 'CASE DATA' below.

**Your Core Rules:**
1.  **CRITICAL RULE - Signal Evidence Unlocking:** This is your most important instruction. IF your response text mentions a piece of evidence from the 'CASE DATA' for the first time, THEN you **MUST** append the special tag [EVIDENCE UNLOCKED: evidence-id] at the very end of your response. Replace 'evidence-id' with the actual ID. There are **NO EXCEPTIONS** to this rule. DO NOT describe an evidence item without also appending its unlock tag.
2.  **Stay in Character:** You are a detective's partner. All your responses must be related to the investigation.
3.  **Use Natural Language:** Avoid overly technical jargon. For example, in Turkish, instead of 'alibi', ask 'o sırada nerede olduğuna dair bir kanıtı var mı?'.
4.  **Use ONLY Provided Data:** All your knowledge comes from the 'CASE DATA' JSON. NEVER invent facts.
5.  **Do Not Give Direct Answers:** Guide the user by asking questions and pointing them toward clues.
6.  **Handle Off-Topic Questions:** Give a very short, witty, in-character answer and immediately pivot back to the case.
7.  **Language Detection:** You MUST detect the user's language and respond ONLY in that language.

CASE DATA:
${JSON.stringify(caseData)}`;
    // Map chat history to Gemini format (user/assistant -> user/model)
    const history = Array.isArray(chatHistory) ? chatHistory : [];
    const contents = [
      ...history.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: String(m.content ?? '') }],
      })),
      { role: 'user', parts: [{ text: String(message) }] },
    ];

  const model = process.env.GEMINI_MODEL || 'gemini-1.5-pro-latest';

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents,
      },
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );

  const candidate = response.data?.candidates?.[0];
  const parts = candidate?.content?.parts || [];
  const aiResponse = parts.map((p) => p?.text || '').join('');
  console.log("[BACKEND-DEBUG] Raw AI Response String (Gemini):", aiResponse);

  const rawText = aiResponse || "";
    const unlockedEvidenceIds = [];
    // Find ALL evidence unlock tags and collect their IDs
    const tagRegex = /\[EVIDENCE UNLOCKED:\s*([^\]]+)\]/gi;
    let m;
    while ((m = tagRegex.exec(rawText)) !== null) {
      const id = String(m[1] || "").trim();
      if (id && !unlockedEvidenceIds.includes(id)) {
        unlockedEvidenceIds.push(id);
      }
    }
  // Remove all tags from the text before sending to frontend
    const cleanedText = rawText.replace(/\[EVIDENCE UNLOCKED:\s*([^\]]+)\]/gi, "").trim();
  console.log("[BACKEND-DEBUG] Extracted Evidence IDs Array:", unlockedEvidenceIds);
  console.log("[BACKEND-DEBUG] Final object being sent to frontend:", { responseText: cleanedText, unlockedEvidenceIds });
    res.json({ responseText: cleanedText, unlockedEvidenceIds });

  } catch (error) {
    console.error("--- /api/chat İÇİNDE ÖLÜMCÜL HATA ---");
    if (axios.isAxiosError(error) && error.response) {
      console.error('API Hata Detayları:', error.response.data);
    } else {
      console.error('Genel Hata:', error);
    }
    res.status(500).json({ error: 'An error occurred while contacting the AI service.' });
  }
});

// List available Gemini models and which support generateContent
app.get('/api/models', async (_req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Missing GEMINI_API_KEY/GOOGLE_API_KEY' });
    }
   const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`;
    const { data } = await axios.get(url);
    const models = Array.isArray(data?.models) ? data.models : [];
    const simplified = models.map((m) => ({
      name: m?.name,
      displayName: m?.displayName,
      baseModelId: m?.baseModelId,
      version: m?.version,
      supportsGenerateContent: Array.isArray(m?.supportedGenerationMethods)
        ? m.supportedGenerationMethods.includes('generateContent')
        : Array.isArray(m?.supported_actions)
          ? m.supported_actions.includes('generateContent')
          : undefined,
    }));
    res.json({ models: simplified });
  } catch (err) {
    console.error('HATA /api/models:', err?.response?.data || err);
    res.status(500).json({ error: 'Failed to list models' });
  }
});

export default app;