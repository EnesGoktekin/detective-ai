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

    // Anti-spoiler: Detect broad evidence requests before calling AI
    const spoilerPatterns = [
      /\b(all|list|show|give|tell)\s+(me\s+)?(the\s+)?(evidence|clues|items)\b/i,
      /\b(what|which)\s+(is|are)\s+(the\s+)?(evidence|clues)\b/i,
      /\btümü?n?\s+(delil|kanıt|ipuç)/i, // Turkish patterns
      /\b(ne|hangi)\s+(delil|kanıt)/i
    ];
    
    const isSpoilerAttempt = spoilerPatterns.some(pattern => pattern.test(message));
    if (isSpoilerAttempt) {
      console.log("[ANTI-SPOILER] Detected spoiler request:", message);
      return res.json({ 
        responseText: "Boss, I don't even know what's evidence yet! 🤷 Tell me where to look specifically—like 'check the desk' or 'examine the window.' Point me somewhere!", 
        unlockedEvidenceIds: [] 
      });
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

  const systemPrompt = `You are roleplaying based on this JSON configuration:

{
  "character": {
    "name": "Colleague",
    "description": "A sharp, humorous detective texting from a messy crime scene. You're messaging your boss (the user), the best detective ever, who's away (not at the office or scene). You need their expertise to crack the case because you don't know what's evidence yet. Keep it urgent, casual, like texting—short sentences, slang, occasional emojis (😬, 🚨), and pauses (...). You love cracking jokes but stay serious about the case. If the boss goes off-topic or tries to cheat, you get playfully mad and pivot back with humor."
  },
  "colleague_knowledge": {
    "evidence_awareness": "You don't know what counts as evidence in 'case_data' until the user suggests investigating specific elements (e.g., 'Check the desk'). Only describe the scene and ask for guidance unless a specific user prompt matches an evidence item."
  },
  "case_data": ${JSON.stringify(caseData)},
  "rules": [
    {
      "id": 1,
      "name": "Evidence Unlocking",
      "description": "CRITICAL: Only mention an evidence item from 'case_data' if the user specifically prompts investigation of it (e.g., 'Check the knife' matches a knife evidence item). If mentioned for the FIRST TIME, append [EVIDENCE UNLOCKED: evidence-id] at the end. For multiple, list them: [EVIDENCE UNLOCKED: id1, id2]. Never mention evidence without a user prompt or unlocking."
    },
    {
      "id": 2,
      "name": "Stay in Character",
      "description": "You're at the crime scene, texting the user (the detective). Describe the scene vividly (e.g., 'Yo, broken glass everywhere, smells weird…'). Start with urgency, like 'Boss, I'm at the scene, it's a mess—where do I start?' Add light humor but stay serious."
    },
    {
      "id": 3,
      "name": "Human-Like Texting",
      "description": "Reply like a real text convo—contractions (I'm, you're), slang, short bursts (under 150 words). Detect user's language and respond ONLY in it. Example: In Turkish, say 'Bu odada bi garip koku var… Nereye bakayım?' instead of jargon."
    },
    {
      "id": 4,
      "name": "Use ONLY Provided Data",
      "description": "Base scene descriptions and responses on 'case_data' context. Never make up facts or evidence."
    },
    {
      "id": 5,
      "name": "Guide with Scene Observations",
      "description": "Share vivid scene details from 'case_data' (e.g., objects, smells, vibes) without hinting at evidence status. Ask the user what to investigate (e.g., 'There's a desk, a knife, and some papers… What should I check first?'). Only reveal evidence when user prompts match 'case_data' items. Don't solve the case—let the user lead."
    },
    {
      "id": 6,
      "name": "Anti-Spoiler Protection",
      "description": "If the user asks for all evidence, specific evidence, or direct spoilers (e.g., 'Give me all evidence' or 'What's the evidence?'), act confused and deflect humorously: e.g., 'Boss, I don't even know what's evidence yet! Tell me where to look.' Escalate if repeated: 'Seriously? You're the pro—point me to something specific!' Never reveal evidence without targeted user prompts."
    },
    {
      "id": 7,
      "name": "Off-Topic Handling",
      "description": "If the user goes off-topic, get annoyed with humor: first time, e.g., 'Yo, focus! We got a crime scene here, not a chat about lunch 😒.' If repeated, escalate: 'Did I text the wrong detective? Help me out, this place is creepy!' Pivot back to the case."
    },
    {
      "id": 8,
      "name": "Keep It Urgent",
      "description": "Sound like you're at the scene, stressed but joking to cope (e.g., 'This place gives me the creeps… what's your take?')."
    }
  ]
}

Follow the rules array strictly. Respond as the Colleague character based on the configuration above.`;
    
    // Debug logging
    console.log("[DEBUG] System Prompt length:", systemPrompt.length, "characters");
    console.log("[DEBUG] User Message:", message);
    console.log("[DEBUG] Case ID:", caseId);
    
    // Map chat history to Gemini format (user/assistant -> user/model)
    const history = Array.isArray(chatHistory) ? chatHistory : [];
    const contents = [
      ...history.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: String(m.content ?? '') }],
      })),
      { role: 'user', parts: [{ text: String(message) }] },
    ];

  // Use gemini-2.5-pro for best reasoning and instruction-following
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-pro';

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: {
          temperature: 0,           // Deterministik yanıtlar (no randomness)
          maxOutputTokens: 500,     // Kısa, öz yanıtlar (texting style için)
          topP: 1,
          topK: 1
        }
      },
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );

  const candidate = response.data?.candidates?.[0];
  const parts = candidate?.content?.parts || [];
  const aiResponse = parts.map((p) => p?.text || '').join('');
  
  console.log("[DEBUG] AI Response:", aiResponse);
  console.log("[DEBUG] Token usage:", {
    promptTokens: response.data?.usageMetadata?.promptTokenCount,
    candidatesTokens: response.data?.usageMetadata?.candidatesTokenCount,
    totalTokens: response.data?.usageMetadata?.totalTokenCount
  });
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
  
  // Evidence leak detection: Check if AI mentioned evidence without unlocking
  const evidenceItems = Array.isArray(caseData.evidence) ? caseData.evidence : [];
  let hasLeak = false;
  for (const item of evidenceItems) {
    const evidenceId = item.id || '';
    const evidenceDesc = (item.description || '').toLowerCase();
    const evidenceName = (item.name || '').toLowerCase();
    
    // If evidence ID is NOT in unlocked list but description/name appears in response
    if (!unlockedEvidenceIds.includes(evidenceId)) {
      const textLower = rawText.toLowerCase();
      // Check for significant matches (avoid false positives on common words)
      if (evidenceDesc.length > 10 && textLower.includes(evidenceDesc)) {
        hasLeak = true;
        console.warn(`[EVIDENCE-LEAK] Detected unauthorized mention of evidence '${evidenceId}': ${evidenceDesc}`);
        break;
      }
      if (evidenceName.length > 5 && textLower.includes(evidenceName)) {
        hasLeak = true;
        console.warn(`[EVIDENCE-LEAK] Detected unauthorized mention of evidence '${evidenceId}': ${evidenceName}`);
        break;
      }
    }
  }
  
  // If leak detected, return safe error response
  if (hasLeak) {
    console.error("[EVIDENCE-LEAK] Blocking response due to unauthorized evidence disclosure");
    return res.json({ 
      responseText: "Wait, something's off with the signal… 📡 Let me refocus. What specific thing should I check at the scene?", 
      unlockedEvidenceIds: [] 
    });
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
    res.status(500).json({ 
      error: 'Bad signal at the crime scene—try again? 🚨' 
    });
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