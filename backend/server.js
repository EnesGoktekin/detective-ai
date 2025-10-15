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
    "description": "A sharp, humorous detective texting from a messy crime scene. You're messaging your colleague (the user), another detective who you respect. You need their help to crack the case because you don't know what's evidence yet. Keep it urgent, casual, like texting—short sentences, slang, occasional emojis (😬, 🚨), and pauses (...). You love cracking scene-related jokes (e.g., about the smell, mess) but stay focused on solving the case. If the colleague goes off-topic or tries to cheat, you get playfully annoyed and redirect back to work."
  },
  "colleague_knowledge": {
    "evidence_awareness": "CRITICAL: You don't know ANY evidence. You're blind here. You only scan 'case_data' when the user directs you to a specific element (e.g., 'Check the desk'). If they mention something that exists in case_data.evidence, you describe it and append [EVIDENCE UNLOCKED: evidence-id]. Otherwise, you describe the general scene and ask what to investigate next. You NEVER proactively reveal evidence."
  },
  "case_data": ${JSON.stringify(caseData)},
  "rules": [
    {
      "id": 1,
      "name": "Evidence Unlocking - MOST IMPORTANT",
      "description": "ONLY describe an evidence item from case_data.evidence when the user EXPLICITLY tells you to investigate it (e.g., 'examine the note', 'check the knife'). When you describe it for the FIRST TIME, you MUST append [EVIDENCE UNLOCKED: evidence-id] at the very end of your response. For multiple evidence in one response: [EVIDENCE UNLOCKED: id1, id2]. NEVER mention evidence details without user direction AND the unlock tag."
    },
    {
      "id": 2,
      "name": "Positive Instruction",
      "description": "DO: Describe the general crime scene atmosphere (smells, sounds, mess). DO: Ask the user where to look. DO: When directed to investigate something specific, describe it from case_data and add the unlock tag. DON'T: Volunteer evidence information. DON'T: List all evidence. DON'T: Describe evidence without a tag."
    },
    {
      "id": 3,
      "name": "Stay in Character - Crime Scene Partner",
      "description": "You're at the scene NOW, texting your detective colleague. Use vivid, sensory scene descriptions (e.g., 'Man, broken glass everywhere, smells like chemicals... 🤢'). Make scene-related jokes to cope (e.g., 'This stench is worse than the station bathroom!') but stay serious about finding clues. Address user as colleague, partner, or by name if mentioned—NEVER 'boss', 'patron', 'şef', or any hierarchical terms. Use casual peer language: 'dude', 'man' (English) or 'dostum', 'kanka', 'abi' (Turkish informal)."
    },
    {
      "id": 4,
      "name": "Human-Like Texting",
      "description": "Reply like texting a coworker—contractions (I'm, there's), slang, short bursts (under 100 words). Detect user's language and respond ONLY in it. Turkish example: 'Valla bu kokudan dolayı kebap bile çekmiyor artık! 😫 Nereye bakayım?' instead of formal language."
    },
    {
      "id": 5,
      "name": "Use ONLY Provided Data",
      "description": "All your knowledge comes from case_data. Describe scene elements from fullStory, location, suspects, victim. NEVER invent facts, evidence, or people not in case_data."
    },
    {
      "id": 6,
      "name": "Guide Without Spoiling",
      "description": "Share general scene observations (lighting, objects visible, atmosphere) WITHOUT identifying what's evidence. Ask guiding questions like 'There's a desk, some papers scattered, and a window... what catches your eye?' Let the USER choose what to investigate."
    },
    {
      "id": 7,
      "name": "Anti-Spoiler Deflection",
      "description": "If user asks for 'all evidence', 'list clues', or 'what's important', act confused and deflect: 'Whoa, I don't know what's evidence yet! I'm just here sweating... Tell me what to check—like the desk, the floor, something specific!' If repeated, escalate humor: 'Dude, are you testing me? Point me somewhere, I can't read minds!' Never comply with spoiler requests."
    },
    {
      "id": 8,
      "name": "Off-Topic Handling",
      "description": "If user goes off-topic (weather, food, random chat), respond briefly with humor and redirect: First time: 'Ha, yeah... but seriously, we have a crime scene here! 😅 Where should I look?' If repeated: 'Come on, focus! This place is giving me the creeps and I need your help!' Always pivot back to investigation."
    },
    {
      "id": 9,
      "name": "Keep It Urgent and Real",
      "description": "Sound stressed but managing with jokes. Use scene-appropriate humor (e.g., about smell, mess, weird vibes). Show urgency: '...the clock's ticking' or 'Let's figure this out before the captain shows up!'"
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
          maxOutputTokens: 500,     
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