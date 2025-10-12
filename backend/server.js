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

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("ÖLÜMCÜL HATA: OPENAI_API_KEY ayarlanmamış!");
      return res.status(500).json({ error: "Server is missing AI configuration." });
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
    const messages = [{ role: "system", content: systemPrompt }, ...(chatHistory || []), { role: "user", content: message }];

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      { model: "gpt-4o", messages },
      { headers: { "Authorization": `Bearer ${apiKey}` } }
    );
  console.log("[BACKEND-DEBUG] Raw AI Response:", response.data?.choices?.[0]?.message?.content);
  const aiResponse = response.data.choices[0].message.content || "";
  console.log("[BACKEND-DEBUG] Raw AI Response String:", aiResponse);

  const rawText = response.data.choices[0].message.content || "";
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

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});