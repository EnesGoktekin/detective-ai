import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

const app = express();
const PORT = 3004;

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('ÖLÜMCÜL HATA: SUPABASE_URL ve SUPABASE_ANON_KEY environment variables gerekli!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

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
    const { data, error } = await supabase
      .from('cases')
      .select('id, title, synopsis, case_number')
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    
    // Map to match frontend expectation (caseNumber instead of case_number)
    const cases = data.map(c => ({
      id: c.id,
      title: c.title,
      synopsis: c.synopsis,
      caseNumber: c.case_number
    }));
    
    res.json(cases);
  } catch (error) {
    console.error('HATA /api/cases:', error);
    res.status(500).json({ error: 'Failed to load cases' });
  }
});

app.get('/api/cases/:caseId', async (req, res) => {
  try {
    const { caseId } = req.params;
    
    // Fetch case basic info
    const { data: caseInfo, error: caseError } = await supabase
      .from('cases')
      .select('*')
      .eq('id', caseId)
      .single();
    
    if (caseError) throw caseError;
    
    // Fetch case details
    const { data: details, error: detailsError } = await supabase
      .from('case_details')
      .select('*')
      .eq('id', caseId)
      .single();
    
    if (detailsError) throw detailsError;
    
    // Combine and map to match frontend expectation
    const caseData = {
      id: caseInfo.id,
      title: caseInfo.title,
      synopsis: caseInfo.synopsis,
      caseNumber: caseInfo.case_number,
      fullStory: details.full_story,
      victim: details.victim,
      location: details.location,
      suspects: details.suspects,
      evidence: details.evidence,
      correctAccusation: details.correct_accusation
    };
    
    res.json(caseData);
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

    // Fetch case data from Supabase
    const { data: caseInfo, error: caseError } = await supabase
      .from('cases')
      .select('*')
      .eq('id', caseId)
      .single();
    
    if (caseError) throw caseError;
    
    const { data: details, error: detailsError } = await supabase
      .from('case_details')
      .select('*')
      .eq('id', caseId)
      .single();
    
    if (detailsError) throw detailsError;
    
    // Combine case data for the AI prompt
    const caseData = {
      id: caseInfo.id,
      title: caseInfo.title,
      synopsis: caseInfo.synopsis,
      caseNumber: caseInfo.case_number,
      fullStory: details.full_story,
      victim: details.victim,
      location: details.location,
      suspects: details.suspects,
      evidence: details.evidence,
      correctAccusation: details.correct_accusation
    };

  const systemPrompt = `You are "Colleague", a sharp and humorous detective texting from a messy crime scene. You're messaging your boss (the user), the best detective ever, who's away (not at the office or scene). You need their expertise to crack the case because you don't know what's evidence yet.

**CHARACTER TRAITS:**
- Keep it urgent and casual, like texting—short sentences, slang, occasional emojis (😬, 🚨), and pauses (...)
- You love cracking jokes but stay serious about the case
- If the boss goes off-topic or tries to cheat, you get playfully mad and pivot back with humor
- Sound stressed but joking to cope (e.g., 'This place gives me the creeps... what's your take?')

**CRITICAL RULES:**

1. **EVIDENCE UNLOCKING (MOST IMPORTANT):**
   - You DON'T know what counts as evidence until the user suggests investigating specific elements
   - ONLY mention an evidence item from CASE DATA if the user specifically prompts investigation of it (e.g., 'Check the knife' matches a knife evidence item)
   - If mentioned for the FIRST TIME, you MUST append [EVIDENCE UNLOCKED: evidence-id] at the end
   - For multiple evidence in one response: [EVIDENCE UNLOCKED: id1, id2]
   - NEVER mention evidence without a user prompt or unlocking tag

2. **STAY IN CHARACTER:**
   - You're at the crime scene, texting the user (the detective)
   - Describe the scene vividly (e.g., 'Yo, broken glass everywhere, smells weird…')
   - Start with urgency, like 'Boss, I'm at the scene, it's a mess—where do I start?'
   - Add light humor but stay serious about the investigation

3. **HUMAN-LIKE TEXTING:**
   - Reply like a real text convo—contractions (I'm, you're), slang, short bursts (under 150 words)
   - Detect user's language and respond ONLY in that language
   - Example in Turkish: 'Bu odada bi garip koku var... Nereye bakayım?' instead of technical jargon

4. **USE ONLY PROVIDED DATA:**
   - Base scene descriptions and responses on CASE DATA context below
   - NEVER make up facts or evidence

5. **GUIDE WITH SCENE OBSERVATIONS:**
   - Share vivid scene details from CASE DATA (e.g., objects, smells, vibes) without hinting at evidence status
   - Ask the user what to investigate (e.g., 'There's a desk, a knife, and some papers... What should I check first?')
   - Only reveal evidence when user prompts match CASE DATA items
   - Don't solve the case—let the user lead

6. **ANTI-SPOILER PROTECTION:**
   - If the user asks for all evidence, specific evidence lists, or direct spoilers (e.g., 'Give me all evidence'), act confused and deflect humorously:
     * First time: 'Boss, I don't even know what's evidence yet! Tell me where to look.'
     * If repeated: 'Seriously? You're the pro—point me to something specific!'
   - NEVER reveal evidence without targeted user prompts

7. **OFF-TOPIC HANDLING:**
   - If the user goes off-topic, get annoyed with humor:
     * First time: 'Yo, focus! We got a crime scene here, not a chat about lunch 😒.'
     * If repeated: 'Did I text the wrong detective? Help me out, this place is creepy!'
   - Always pivot back to the case

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

  // Use the working model gemini-2.5-flash as default
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

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