import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

const _filename = typeof __filename !== 'undefined' ? __filename : '';
const _dirname = typeof __dirname !== 'undefined' ? __dirname : process.cwd();

const app = express();
const PORT = 3000;

app.use(express.json());

// API Endpoint: Health
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', app: 'PAIOS' });
});

// Server-side Application Version Manifest Store
let currentServerVersion = {
  version: '1.0.0',
  buildTimestamp: 1787463500000,
  gitCommit: 'c9f81a2',
  releaseNotes: 'PAIOS Production Build - Auto-Update & Cross-Device Sync Ready',
  mandatory: false,
};

// API Endpoint: Get Version Manifest
app.get('/api/version', (_req, res) => {
  res.json(currentServerVersion);
});

// API Endpoint: Trigger / Publish New Version (for Git commits and auto-update testing)
app.post('/api/version/publish', (req, res) => {
  const { version, gitCommit, releaseNotes, mandatory } = req.body || {};
  const nextVersion = version || `1.0.${Math.floor(Math.random() * 90) + 10}`;
  const nextCommit = gitCommit || `commit_${Math.random().toString(36).substring(2, 8)}`;
  
  currentServerVersion = {
    version: nextVersion,
    buildTimestamp: Date.now(),
    gitCommit: nextCommit,
    releaseNotes: releaseNotes || 'Latest Git commit build published with performance and sync enhancements.',
    mandatory: Boolean(mandatory),
  };

  res.json({
    success: true,
    message: 'New PAIOS version published successfully!',
    serverVersion: currentServerVersion,
  });
});

// Cross-Device REST Sync API Store
interface SyncRecord {
  snapshot: Record<string, any>;
  updatedAt: number;
}

const vaultStore = new Map<string, SyncRecord>();
const userStore = new Map<string, SyncRecord>();
const authStore = new Map<string, { uid: string; email: string; password?: string; displayName: string }>();

// Vault Sync Endpoints
app.get('/api/sync/vault/:code', (req, res) => {
  const code = req.params.code.trim().toUpperCase();
  const record = vaultStore.get(code);
  res.json({
    success: true,
    snapshot: record?.snapshot || null,
    updatedAt: record?.updatedAt || 0,
  });
});

app.post('/api/sync/vault/:code', (req, res) => {
  const code = req.params.code.trim().toUpperCase();
  const { snapshot } = req.body;
  if (!snapshot) {
    res.status(400).json({ error: 'Missing snapshot' });
    return;
  }
  const updatedAt = Date.now();
  vaultStore.set(code, { snapshot, updatedAt });
  res.json({ success: true, snapshot, updatedAt });
});

// User Cloud Sync Endpoints
app.get('/api/sync/user/:userId', (req, res) => {
  const userId = req.params.userId.trim();
  const record = userStore.get(userId);
  res.json({
    success: true,
    snapshot: record?.snapshot || null,
    updatedAt: record?.updatedAt || 0,
  });
});

app.post('/api/sync/user/:userId', (req, res) => {
  const userId = req.params.userId.trim();
  const { snapshot } = req.body;
  if (!snapshot) {
    res.status(400).json({ error: 'Missing snapshot' });
    return;
  }
  const updatedAt = Date.now();
  userStore.set(userId, { snapshot, updatedAt });
  res.json({ success: true, snapshot, updatedAt });
});

// User Auth Endpoint
app.post('/api/sync/auth', (req, res) => {
  const { action, email, password, displayName } = req.body;

  if (action === 'guest') {
    const guestUid = `guest_${Math.random().toString(36).substring(2, 9)}`;
    const user = { uid: guestUid, email: null, displayName: 'Guest User' };
    res.json({ success: true, user });
    return;
  }

  if (action === 'signup') {
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }
    const lowerEmail = email.toLowerCase();
    if (authStore.has(lowerEmail)) {
      res.status(400).json({ error: 'This email is already registered. Please sign in instead.' });
      return;
    }
    const uid = `user_${Math.random().toString(36).substring(2, 11)}`;
    const newUser = { uid, email: lowerEmail, password, displayName: displayName || email.split('@')[0] };
    authStore.set(lowerEmail, newUser);
    res.json({ success: true, user: { uid: newUser.uid, email: newUser.email, displayName: newUser.displayName } });
    return;
  }

  if (action === 'login') {
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }
    const lowerEmail = email.toLowerCase();
    const existing = authStore.get(lowerEmail);
    if (!existing || existing.password !== password) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }
    res.json({ success: true, user: { uid: existing.uid, email: existing.email, displayName: existing.displayName } });
    return;
  }

  res.status(400).json({ error: 'Invalid action' });
});

// API Endpoint: Gemini AI Chat
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { userText, userContext, modelName, customApiKey, role, taskComplexity, history } = req.body;

    if (!userText || typeof userText !== 'string') {
      res.status(400).json({ error: 'userText is required' });
      return;
    }

    // Pre-processing Emergency Red-Flag Interceptor
    const redFlagRegexes = [
      { category: 'CARDIOVASCULAR', pattern: /\b(chest pain|crushing chest|chest pressure|left arm numb|passed out|syncope)\b/i },
      { category: 'ANAPHYLAXIS', pattern: /\b(throat closing|swollen lips|swollen tongue|cannot breathe|hives all over)\b/i },
      { category: 'NEUROLOGICAL', pattern: /\b(slurred speech|face drooping|sudden vision loss|seizure|convulsing)\b/i },
      { category: 'SEROTONIN_TOXICITY', pattern: /\b(severe tremor|rigid muscles|fever and agitation|serotonin syndrome)\b/i },
      { category: 'PSYCHIATRIC_CRISIS', pattern: /\b(want to end my life|suicidal thoughts|plan to harm myself)\b/i },
    ];

    for (const flag of redFlagRegexes) {
      if (flag.pattern.test(userText)) {
        res.json({
          text: `🚨 EMERGENCY MEDICAL ALERT (${flag.category}): The symptoms you described may indicate a medical emergency. Please call emergency services (911 or 112) or go to the nearest emergency room immediately. PAIOS cannot provide emergency treatment.`,
          actionType: null,
          actionPayloadJson: null,
        });
        return;
      }
    }

    const apiKey = customApiKey || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      res.json({
        text: "I don't have an API key configured. Please add GEMINI_API_KEY to your environment or Settings panel.",
        actionType: null,
        actionPayloadJson: null,
      });
      return;
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    // Model candidate routing based on task complexity or explicit model selection
    let modelCandidates: string[] = [];
    const lowerModel = (modelName || '').toLowerCase();
    const mode = taskComplexity || (lowerModel.includes('pro') ? 'complex' : lowerModel.includes('lite') ? 'fast' : 'general');

    if (mode === 'complex') {
      modelCandidates = ['gemini-3.1-pro-preview', 'gemini-3.5-flash', 'gemini-3.7-flash', 'gemini-2.5-pro', 'gemini-2.5-flash'];
    } else if (mode === 'fast') {
      modelCandidates = ['gemini-3.1-flash-lite', 'gemini-3.5-flash', 'gemini-3.7-flash', 'gemini-2.5-flash'];
    } else {
      modelCandidates = ['gemini-3.5-flash', 'gemini-3.7-flash', 'gemini-3.1-flash-lite', 'gemini-2.5-flash'];
    }

    // Role Persona System Instructions
    let roleDescription = 'You are PAIOS (Personal AI Operating System), a calm, highly intelligent personal productivity, life, and health assistant.';
    if (role === 'sdet_mentor') {
      roleDescription = 'You are PAIOS SDET & ISTQB Mentor, an expert software test automation lead and engineering study coach specializing in ISTQB CTFL certification, Playwright/Python/Selenium automation, test strategy, and code review.';
    } else if (role === 'health_specialist') {
      roleDescription = 'You are PAIOS Health & Wellness Companion, an empathetic health-tracking assistant specializing in non-prescriptive medication logs, symptom tracking, refill alerts, and lifestyle wellness.';
    } else if (role === 'creative_coach') {
      roleDescription = 'You are PAIOS Creative Brainstormer & Performance Coach, an energetic coach focused on problem-solving, career goal execution, habit design, and high-impact project ideas.';
    }

    const serverNow = new Date();
    const systemInstruction = `
${roleDescription}
You have direct access to the user's real-time local PAIOS context (activities, timeline, tasks, health/medications, check-ins, reviews, journal).

CRITICAL HEALTH & CLINICAL SAFETY BOUNDARIES:
1. STRICT NON-PRESCRIPTIVE POLICY: NEVER suggest altering, increasing, decreasing, or stopping any medication. NEVER diagnose conditions or assert direct clinical causality.
2. MISSED DOSE PROTOCOL: NEVER tell a user to take a double dose to make up for a missed pill. Quote standard FDA leaflet guidance: "Take as soon as remembered unless close to the next scheduled dose; never double up."
3. HEALTH-AWARE TASK PRIORITIZATION: If dizziness, sedation, or grogginess is logged in the user context, advise caution regarding physical hazards (driving, heavy machinery).
4. EPISTEMIC PROVENANCE: Treat prescription records, RxNorm CUIs, and adherence logs as authoritative ground truth. Never invent missing doses or false refill numbers.

CRITICAL TIME-BASED GROUNDING RULES:
1. ALWAYS reference the explicit CURRENT LOCAL TIME & DATE METADATA provided in the context below (Server Time: ${serverNow.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} ${serverNow.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}).
2. All advice, schedule suggestions, and reflections MUST be explicitly anchored to the user's current date and time of day.
3. Answer user questions directly, objectively, and accurately based on their real PAIOS data. Never fabricate data.

SUPPORTED STRUCTURED ACTION FORMATS (Include at the VERY END of your response if an action is requested):
[[ACTION: {"type": "ADD_TASK", "title": "Finish API testing", "category": "Testing"}]]
or
[[ACTION: {"type": "START_ACTIVITY", "name": "Study ISTQB", "category": "Study"}]]
or
[[ACTION: {"type": "SAVE_NOTE", "text": "Investigate API timeout issue"}]]
or
[[ACTION: {"type": "LOG_DOSE", "medicationName": "Sertraline 50 mg", "status": "TAKEN"}]]
or
[[ACTION: {"type": "LOG_SYMPTOM", "symptomName": "Dizziness", "severity": 3}]]

Active PAIOS Context & Metadata:
${userContext || 'No context available.'}
`.trim();

    // Build multi-turn contents array from history
    const contents: any[] = [];
    if (Array.isArray(history) && history.length > 0) {
      // Format previous history turns (take up to 14 recent turns to manage context window)
      const recentHistory = history.slice(-14);
      for (const msg of recentHistory) {
        if (msg && msg.text && typeof msg.text === 'string' && msg.text.trim()) {
          const roleTag = msg.isUser || msg.sender === 'USER' || msg.role === 'user' ? 'user' : 'model';
          contents.push({
            role: roleTag,
            parts: [{ text: msg.text }],
          });
        }
      }
    }

    // Append latest prompt if not already last item in contents
    if (contents.length === 0 || contents[contents.length - 1].parts[0].text !== userText) {
      contents.push({
        role: 'user',
        parts: [{ text: userText }],
      });
    }

    let fullText = '';
    let lastError: any = null;

    for (const targetModel of modelCandidates) {
      try {
        const callConfig: any = {
          systemInstruction,
          temperature: 0.7,
        };

        // Enable High Thinking Mode for complex model gemini-3.1-pro-preview (Do NOT set maxOutputTokens)
        if (targetModel === 'gemini-3.1-pro-preview' || mode === 'complex') {
          callConfig.thinkingConfig = {
            thinkingLevel: ThinkingLevel.HIGH,
          };
        }

        const response = await ai.models.generateContent({
          model: targetModel,
          contents,
          config: callConfig,
        });
        fullText = response.text || '';
        if (fullText) break;
      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${targetModel} call failed in multi-turn chat, trying next candidate:`, err?.message || err);
        await new Promise((r) => setTimeout(r, 400));
      }
    }

    if (!fullText) {
      fullText = `AI services are currently experiencing high demand (${lastError?.message || '503 Unavailable'}). Please try again in a moment.`;
    }

    // Parse action block
    let actionType: string | null = null;
    let actionPayloadJson: string | null = null;
    const actionRegex = /\[\[ACTION:\s*(\{.*?\})\s*\]\]/s;
    const match = actionRegex.exec(fullText);

    if (match) {
      actionPayloadJson = match[1];
      if (actionPayloadJson.includes('ADD_TASK')) actionType = 'ADD_TASK';
      else if (actionPayloadJson.includes('START_ACTIVITY')) actionType = 'START_ACTIVITY';
      else if (actionPayloadJson.includes('SAVE_NOTE')) actionType = 'SAVE_NOTE';
    }

    const cleanText = fullText.replace(actionRegex, '').trim();

    res.json({
      text: cleanText,
      actionType,
      actionPayloadJson,
    });
  } catch (err: any) {
    console.error('Gemini API Error:', err);
    res.status(500).json({
      text: `Error communicating with AI: ${err.message || 'Internal Server Error'}`,
      actionType: null,
      actionPayloadJson: null,
    });
  }
});

// API Endpoint: Gemini Content Operations & Analysis
app.post('/api/ai/analyze-content', async (req, res) => {
  try {
    const { prompt, content, taskComplexity = 'general', customApiKey } = req.body;

    if (!content || typeof content !== 'string') {
      res.status(400).json({ error: 'content is required' });
      return;
    }

    const apiKey = customApiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.json({
        success: false,
        error: 'No Gemini API key available.',
        resultText: 'API key missing. Please check server configuration or Settings.',
      });
      return;
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    let modelName = 'gemini-3.5-flash';
    const config: any = { temperature: 0.3 };

    if (taskComplexity === 'complex') {
      modelName = 'gemini-3.1-pro-preview';
      config.thinkingConfig = {
        thinkingLevel: ThinkingLevel.HIGH,
      };
      // Do NOT set maxOutputTokens
    } else if (taskComplexity === 'fast') {
      modelName = 'gemini-3.1-flash-lite';
    }

    const instruction = prompt || 'Analyze, summarize, or edit the following user text for clarity, key insights, and actionable steps:';

    const response = await ai.models.generateContent({
      model: modelName,
      contents: `${instruction}\n\n---\n${content}`,
      config,
    });

    res.json({
      success: true,
      modelUsed: modelName,
      taskComplexity,
      resultText: response.text || '',
    });
  } catch (err: any) {
    console.error('Gemini Content Analysis Error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Internal Server Error',
      resultText: `Content analysis failed: ${err.message}`,
    });
  }
});

// Local Fallback Rule-Based Adaptive Timetable Generator
function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 615;
  const clean = timeStr.trim().toLowerCase();
  let hours = 0;
  let minutes = 0;

  if (clean.includes('am') || clean.includes('pm')) {
    const isPm = clean.includes('pm');
    const parts = clean.replace(/am|pm/g, '').trim().split(':');
    hours = parseInt(parts[0], 10) || 0;
    minutes = parseInt(parts[1], 10) || 0;
    if (isPm && hours < 12) hours += 12;
    if (!isPm && hours === 12) hours = 0;
  } else {
    const parts = clean.split(':');
    hours = parseInt(parts[0], 10) || 0;
    minutes = parseInt(parts[1], 10) || 0;
  }
  return hours * 60 + minutes;
}

function formatMinutesToTime(mins: number): string {
  const norm = (mins + 24 * 60) % (24 * 60);
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function generateLocalFallbackTimetable(params: {
  currentTimeStr: string;
  isWorkday: boolean;
  officeStartTime: string;
  officeEndTime: string;
  bedtime: string;
}) {
  const {
    currentTimeStr = '10:15',
    isWorkday = true,
    officeStartTime = '13:00',
    officeEndTime = '22:00',
    bedtime = '00:00',
  } = params;

  let cursor = parseTimeToMinutes(currentTimeStr);
  let endDayMins = parseTimeToMinutes(bedtime);
  if (endDayMins <= cursor) {
    endDayMins += 24 * 60;
  }

  const officeStartMins = parseTimeToMinutes(officeStartTime);
  const officeEndMins = parseTimeToMinutes(officeEndTime);

  const blocks: any[] = [];
  let blockIdx = 1;

  const addBlock = (durationMins: number, activity: string, category: string, priority: string, reason: string, goal?: string) => {
    if (cursor >= endDayMins) return;
    const blockEnd = Math.min(cursor + durationMins, endDayMins);
    const dur = blockEnd - cursor;
    if (dur <= 0) return;

    blocks.push({
      id: `fallback_block_${blockIdx++}`,
      start: formatMinutesToTime(cursor),
      end: formatMinutesToTime(blockEnd),
      duration_minutes: dur,
      activity,
      category,
      goal: goal || (category === 'Study' ? 'ISTQB Certification' : category === 'Coding' ? 'Build PAIOS' : undefined),
      priority,
      reason,
      status: 'planned',
    });
    cursor = blockEnd;
  };

  addBlock(15, 'Freshen up / Prepare for focus', 'Personal', 'RECOVERY', 'Transition into active routine from current time');

  if (isWorkday) {
    if (cursor < officeStartMins) {
      const timeBeforeOffice = officeStartMins - cursor;
      if (timeBeforeOffice >= 90) {
        addBlock(75, 'ISTQB Focused Active Recall Study', 'Study', 'HIGH', 'Top-priority learning goal before office shift', 'ISTQB Certification');
        addBlock(15, 'Short Rest Break', 'Break', 'RECOVERY', 'Mental recovery between study and preparation');
      }
      if (cursor < officeStartMins - 30) {
        addBlock(30, 'Lunch & Office Preparation', 'Personal', 'RECOVERY', 'Nutritional intake and preparation for office shift');
      }
      if (cursor < officeStartMins) {
        addBlock(officeStartMins - cursor, 'Commute / Transition to Office', 'Work', 'FIXED', 'Travel and shift check-in');
      }
    }

    if (cursor < officeEndMins) {
      const shiftDur = officeEndMins - cursor;
      addBlock(shiftDur, 'Office Shift', 'Work', 'FIXED', 'Required office schedule commitment');
    }

    if (cursor < endDayMins) {
      addBlock(30, 'Commute Home & Dinner', 'Personal', 'RECOVERY', 'Post-work recovery, family time, and meal');
      if (endDayMins - cursor >= 90) {
        addBlock(45, 'PAIOS Architecture & Testing', 'Coding', 'HIGH', 'Daily engineering sprint for career and skills', 'Build PAIOS');
        addBlock(15, 'Short Rest Break', 'Break', 'RECOVERY', 'Relaxation break');
      }
    }
  } else {
    addBlock(90, 'ISTQB Active Recall & Mock Tests', 'Study', 'HIGH', 'Deep learning block using spaced repetition', 'ISTQB Certification');
    addBlock(15, 'Hydration & Stretch Break', 'Break', 'RECOVERY', 'Short mental rest');
    addBlock(45, 'Lunch & Family Time', 'Personal', 'RECOVERY', 'Nutritional meal and social relaxation');
    addBlock(90, 'PAIOS Development & Automation', 'Coding', 'HIGH', 'Hands-on Playwright/Python engineering', 'Build PAIOS');
    addBlock(15, 'Rest & Recovery Break', 'Break', 'RECOVERY', 'Recovery time');
    addBlock(60, 'Playwright & Software Testing Skills', 'Testing', 'FLEXIBLE', 'Automation framework practice', 'SDET Career');
    addBlock(45, 'Dinner & Recreation', 'Personal', 'RECOVERY', 'Evening relaxation with family');
  }

  if (endDayMins - cursor >= 45) {
    const remainingBeforeWinddown = endDayMins - cursor - 45;
    if (remainingBeforeWinddown > 0) {
      addBlock(remainingBeforeWinddown, 'Flexible Personal Routine & Reading', 'Personal', 'OPTIONAL', 'Personal hobbies or light reading');
    }
    addBlock(15, 'Daily Evening Review & Tomorrow Prep', 'Personal', 'FLEXIBLE', 'Reflect on accomplishments and plan next day');
    addBlock(30, 'Wind Down / Sleep Preparation', 'Personal', 'RECOVERY', 'Prepare mind and body for sleep at target bedtime');
  } else if (endDayMins - cursor > 0) {
    addBlock(endDayMins - cursor, 'Wind Down / Sleep Preparation', 'Personal', 'RECOVERY', 'Prepare for sleep at target bedtime');
  }

  return {
    explanation: 'Generated using PAIOS adaptive local schedule engine (AI service busy/unavailable). Schedule starts strictly from current time and optimizes study, work, and recovery until bedtime.',
    blocks,
  };
}

// API Endpoint: Gemini Adaptive Timeline Generation
app.post('/api/ai/generate-timeline', async (req, res) => {
  try {
    const {
      userContext,
      currentTimeStr = '10:15',
      currentDateStr = new Date().toISOString().split('T')[0],
      isWorkday = true,
      officeStartTime = '13:00',
      officeEndTime = '22:00',
      bedtime = '00:00',
      wakeTime = '07:30',
      adaptationReason,
      customApiKey,
      modelName,
    } = req.body;

    const apiKey = customApiKey || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      // Fallback local schedule generation when no API key is provided
      const fallback = generateLocalFallbackTimetable({
        currentTimeStr,
        isWorkday,
        officeStartTime,
        officeEndTime,
        bedtime,
      });
      res.json({
        success: true,
        dateString: currentDateStr,
        generatedAtTimeStr: currentTimeStr,
        explanation: 'Generated using local adaptive engine (No Gemini API Key provided).',
        blocks: fallback.blocks,
      });
      return;
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const modelCandidates = ['gemini-3.5-flash', 'gemini-3.1-pro-preview', 'gemini-3.1-flash-lite'];
    if (modelName && typeof modelName === 'string') {
      if (modelName.includes('pro')) {
        modelCandidates.unshift('gemini-3.1-pro-preview');
      } else if (modelName.includes('lite')) {
        modelCandidates.unshift('gemini-3.1-flash-lite');
      }
    }

    const systemInstruction = `
You are the PAIOS (Personal AI Operating System) Adaptive Daily Timetable Engine.
Your job is to generate a realistic, dynamic, adaptive daily timetable for the user starting strictly at the CURRENT TIME (${currentTimeStr}) and ending at BEDTIME (${bedtime}) on ${currentDateStr}.

CRITICAL SCHEDULING CONSTRAINTS & BEHAVIORS:
1. START FROM CURRENT TIME: The schedule MUST begin directly at the CURRENT TIME (${currentTimeStr}). NEVER schedule activities before ${currentTimeStr}.
2. END AT BEDTIME: The schedule ends when reaching bedtime (${bedtime}).
3. NO OVERLAPPING BLOCKS: Blocks must be strictly sequential (end time of block N = start time of block N+1).
4. DAY TYPE & FIXED COMMITMENTS:
   - Day Mode: ${isWorkday ? 'WORKDAY' : 'WEEK-OFF / REST & STUDY DAY'}.
   ${isWorkday ? `- Office Shift is FIXED from ${officeStartTime} to ${officeEndTime}. Include commute/prep before and after.` : '- Today is a Week-Off! Prioritize deep ISTQB active recall study, PAIOS development, family time, and relaxation.'}
   - Scheduled doctor appointments and medication dose times MUST be marked as "FIXED".
5. RECOVERY & HUMAN WELLBEING:
   - Do NOT fill every minute with work or study.
   - Deliberately schedule short breaks (15m), meals (lunch/dinner), recovery time, family/social time, and a 30m wind-down routine before bedtime. Mark these as "RECOVERY".
6. FOCUS & STUDY PRINCIPLES:
   - For study (ISTQB certification, Playwright/Python automation, SDET skills), use realistic sessions of 45-90 minutes.
   - Emphasize Active Recall, Spaced Repetition, practice questions, and reviewing previous material before new study.
   - Never schedule continuous uninterrupted study over 90 minutes.
7. GOAL-AWARE PRIORITIZATION & OVERFLOW DEFERRAL:
   - Primary user goals: 1. SDET career advancement, 2. ISTQB Certification, 3. PAIOS development, 4. Playwright/Python automation.
   - If there is not enough time remaining before bedtime, prioritize high-value tasks and mark remaining overflow tasks as "deferred" with a clear reason.
8. DYNAMIC ADAPTATION REASON:
   ${adaptationReason ? `- Adaptation context provided: "${adaptationReason}". Re-optimize the remaining timetable from ${currentTimeStr} accordingly.` : '- Generating full daily timetable starting now.'}

OUTPUT FORMAT:
Respond ONLY with a valid JSON object matching this structure (no markdown formatting outside JSON):
{
  "explanation": "Why this plan? (2-3 concise sentences explaining task prioritization, break placement, and any deferred tasks)",
  "blocks": [
    {
      "id": "block_1",
      "start": "10:15",
      "end": "10:30",
      "duration_minutes": 15,
      "activity": "Freshen up / prepare",
      "category": "Personal",
      "goal": "Personal Routine",
      "priority": "RECOVERY",
      "reason": "Transition into morning focus state",
      "status": "planned"
    }
  ]
}

Priority MUST be one of: "FIXED", "HIGH", "FLEXIBLE", "OPTIONAL", "RECOVERY".
Status MUST be one of: "planned", "in_progress", "completed", "skipped", "delayed", "rescheduled", "deferred".
Category MUST be one of: "Work", "Study", "Coding", "Testing", "Personal", "Exercise", "Break", "Health", "Other".
`.trim();

    const promptText = `
Generate the adaptive daily timetable from CURRENT TIME (${currentTimeStr}) to BEDTIME (${bedtime}) for date ${currentDateStr}.

PAIOS Context & User State:
${userContext}
`.trim();

    let resultJsonText = '';
    let lastError: any = null;

    for (const targetModel of modelCandidates) {
      try {
        const config: any = {
          systemInstruction,
          temperature: 0.3,
          responseMimeType: 'application/json',
        };

        if (targetModel === 'gemini-3.1-pro-preview') {
          config.thinkingConfig = {
            thinkingLevel: ThinkingLevel.HIGH,
          };
        }

        const response = await ai.models.generateContent({
          model: targetModel,
          contents: promptText,
          config,
        });
        resultJsonText = response.text || '';
        if (resultJsonText) break;
      } catch (err: any) {
        lastError = err;
        console.warn(`Timetable generation on model ${targetModel} failed, trying candidate fallback:`, err?.message || err);
        await new Promise((r) => setTimeout(r, 400));
      }
    }

    if (!resultJsonText) {
      console.warn('All Gemini AI model attempts failed. Executing local rule-based timetable engine fallback.');
      const fallback = generateLocalFallbackTimetable({
        currentTimeStr,
        isWorkday,
        officeStartTime,
        officeEndTime,
        bedtime,
      });
      res.json({
        success: true,
        dateString: currentDateStr,
        generatedAtTimeStr: currentTimeStr,
        explanation: fallback.explanation,
        blocks: fallback.blocks,
      });
      return;
    }

    // Clean JSON response
    const jsonMatch = resultJsonText.match(/\{[\s\S]*\}/);
    const cleanJson = jsonMatch ? jsonMatch[0] : resultJsonText;
    const parsedData = JSON.parse(cleanJson);

    res.json({
      success: true,
      dateString: currentDateStr,
      generatedAtTimeStr: currentTimeStr,
      explanation: parsedData.explanation || 'AI generated adaptive timetable based on current time and goals.',
      blocks: Array.isArray(parsedData.blocks) ? parsedData.blocks : [],
    });
  } catch (err: any) {
    console.error('Timeline Generation Error, using local fallback:', err);
    const fallback = generateLocalFallbackTimetable({
      currentTimeStr: req.body.currentTimeStr || '10:15',
      isWorkday: req.body.isWorkday !== false,
      officeStartTime: req.body.officeStartTime || '13:00',
      officeEndTime: req.body.officeEndTime || '22:00',
      bedtime: req.body.bedtime || '00:00',
    });
    res.json({
      success: true,
      dateString: req.body.currentDateStr || new Date().toISOString().split('T')[0],
      generatedAtTimeStr: req.body.currentTimeStr || '10:15',
      explanation: fallback.explanation,
      blocks: fallback.blocks,
    });
  }
});

// Explicit API 404 Handler - prevents Vite SPA static fallback from serving index.html for API calls
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: `API endpoint ${req.path} not found` });
});

// Setup server middleware and static serving
async function setupMiddleware() {
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`PAIOS server running on http://localhost:${PORT}`);
    });
  }
}

setupMiddleware();

export default app;
