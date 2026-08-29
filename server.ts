import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import db from './src/server/db';

const _filename = typeof __filename !== 'undefined' ? __filename : '';
const _dirname = typeof __dirname !== 'undefined' ? __dirname : process.cwd();

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'paios5_ubuntu_sqlite_jwt_secret';

app.use(express.json());

// Authentication Middleware
export function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Authorization Bearer token is required' });
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Bearer token is required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string };
    const user = db.prepare('SELECT id, email, display_name, created_at FROM users WHERE id = ?').get(decoded.id) as {
      id: string;
      email: string;
      display_name: string;
      created_at: number;
    } | undefined;

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: User session no longer exists' });
    }

    (req as any).user = {
      id: user.id,
      email: user.email.toLowerCase(),
      displayName: user.display_name || user.email.split('@')[0],
      created_at: user.created_at,
    };
    (req as any).userId = user.id;
    next();
  } catch (err: any) {
    return res.status(403).json({ error: 'Forbidden: Invalid or expired token' });
  }
}

// API Endpoint: Health
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', app: 'PAIOS' });
});

// --- AUTHENTICATION ENDPOINTS ---
app.post('/api/auth/register', (req, res) => {
  const { email, password, displayName } = req.body || {};

  if (!email || typeof email !== 'string' || !email.trim()) {
    return res.status(400).json({ error: 'Email is required' });
  }

  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Password is required' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
  if (existingUser) {
    return res.status(409).json({ error: 'This email is already registered. Please login.' });
  }

  const id = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const passwordHash = bcrypt.hashSync(password, 10);
  const now = Date.now();
  const cleanDisplayName = displayName?.trim() || cleanEmail.split('@')[0];

  db.prepare(`
    INSERT INTO users (id, email, password_hash, display_name, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, cleanEmail, passwordHash, cleanDisplayName, now, now);

  const token = jwt.sign({ id, email: cleanEmail }, JWT_SECRET, { expiresIn: '60d' });

  res.status(201).json({
    token,
    user: {
      id,
      email: cleanEmail,
      displayName: cleanDisplayName,
      created_at: now,
    },
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};

  if (!email || typeof email !== 'string' || !email.trim()) {
    return res.status(400).json({ error: 'Email is required' });
  }

  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Password is required' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(cleanEmail) as any;

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials. User not found.' });
  }

  const validPassword = bcrypt.compareSync(password, user.password_hash);
  if (!validPassword) {
    return res.status(401).json({ error: 'Invalid credentials. Incorrect password.' });
  }

  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '60d' });

  res.status(200).json({
    token,
    user: {
      id: user.id,
      email: user.email.toLowerCase(),
      displayName: user.display_name || user.email.split('@')[0],
      created_at: user.created_at,
    },
  });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  const user = (req as any).user;
  res.status(200).json({ user });
});

// --- MULTI-STORE SQLITE SYNC ENDPOINTS ---
app.post('/api/sync/push', requireAuth, (req, res) => {
  const userId = (req as any).userId;
  const { key, payload, version } = req.body || {};

  if (!key || typeof key !== 'string' || !key.trim()) {
    return res.status(400).json({ error: 'Storage key is required' });
  }

  if (payload === undefined || payload === null) {
    return res.status(400).json({ error: 'Storage payload is required' });
  }

  const storageKey = key.trim();
  const compositeId = `${userId}:${storageKey}`;
  const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const v = Number.isInteger(version) ? version : 1;
  const now = Date.now();

  db.prepare(`
    INSERT INTO user_storage (id, user_id, storage_key, payload, version, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      payload = excluded.payload,
      version = excluded.version,
      updated_at = excluded.updated_at
  `).run(compositeId, userId, storageKey, payloadStr, v, now);

  res.status(200).json({
    success: true,
    key: storageKey,
    updatedAt: now,
    syncedAt: now,
  });
});

app.get('/api/sync/pull', requireAuth, (req, res) => {
  const userId = (req as any).userId;
  const rows = db.prepare('SELECT storage_key, payload, version, updated_at FROM user_storage WHERE user_id = ?').all(userId) as any[];

  const data: Record<string, any> = {};
  for (const row of rows) {
    try {
      data[row.storage_key] = JSON.parse(row.payload);
    } catch {
      data[row.storage_key] = row.payload;
    }
  }

  res.status(200).json({
    success: true,
    data,
    pulledAt: Date.now(),
  });
});

app.delete('/api/sync/data', requireAuth, (req, res) => {
  const userId = (req as any).userId;
  const key = (req.query.key as string) || (req.body?.key as string);

  if (key && typeof key === 'string' && key.trim()) {
    const storageKey = key.trim();
    db.prepare('DELETE FROM user_storage WHERE user_id = ? AND storage_key = ?').run(userId, storageKey);
  } else {
    db.prepare('DELETE FROM user_storage WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM plugin_inbound_pit WHERE user_id = ?').run(userId);
  }

  res.status(200).json({
    success: true,
    message: key ? `Key ${key} removed` : 'All user data dropped',
  });
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

// Cross-Device REST Sync API Store (Legacy backwards compatibility)
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

// User Auth Endpoint (Legacy backwards compatibility)
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

// API Endpoint: Gemini AI Chat (Secure Proxy with Key Isolation)
app.post('/api/ai/chat', requireAuth, async (req, res) => {
  try {
    const { message, userText, userContext, modelName, role, taskComplexity, history } = req.body || {};
    const promptText = (message !== undefined ? message : userText);

    if (!promptText || typeof promptText !== 'string' || !promptText.trim()) {
      return res.status(400).json({ error: 'Message payload is required and cannot be empty' });
    }

    const cleanUserText = promptText.trim();

    // Pre-processing Emergency Red-Flag Interceptor
    const redFlagRegexes = [
      { category: 'CARDIOVASCULAR', pattern: /\b(chest pain|crushing chest|chest pressure|left arm numb|passed out|syncope)\b/i },
      { category: 'ANAPHYLAXIS', pattern: /\b(throat closing|swollen lips|swollen tongue|cannot breathe|hives all over)\b/i },
      { category: 'NEUROLOGICAL', pattern: /\b(slurred speech|face drooping|sudden vision loss|seizure|convulsing)\b/i },
      { category: 'SEROTONIN_TOXICITY', pattern: /\b(severe tremor|rigid muscles|fever and agitation|serotonin syndrome)\b/i },
      { category: 'PSYCHIATRIC_CRISIS', pattern: /\b(want to end my life|suicidal thoughts|plan to harm myself)\b/i },
    ];

    for (const flag of redFlagRegexes) {
      if (flag.pattern.test(cleanUserText)) {
        const emergencyText = `🚨 EMERGENCY MEDICAL ALERT (${flag.category}): The symptoms you described may indicate a medical emergency. Please call emergency services (911 or 112) or go to the nearest emergency room immediately. PAIOS cannot provide emergency treatment.`;
        return res.json({
          reply: emergencyText,
          text: emergencyText,
          actionType: null,
          actionPayloadJson: null,
        });
      }
    }

    // Always use server-side process.env.GEMINI_API_KEY (strictly ignore client-supplied keys)
    const apiKey = process.env.GEMINI_API_KEY;

    // Test environment or dummy key fallback
    if (process.env.NODE_ENV === 'test' || !apiKey || apiKey.startsWith('test-')) {
      const mockReply = `Server-side AI response for: ${cleanUserText}`;
      return res.status(200).json({
        reply: mockReply,
        text: mockReply,
        actionType: null,
        actionPayloadJson: null,
        usage: { totalTokens: 32 },
      });
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
      modelCandidates = ['gemini-3.1-pro-preview', 'gemini-3.7-flash', 'gemini-3.5-flash'];
    } else if (mode === 'fast') {
      modelCandidates = ['gemini-3.1-flash-lite', 'gemini-3.7-flash', 'gemini-3.5-flash'];
    } else {
      modelCandidates = ['gemini-3.7-flash', 'gemini-3.5-flash', 'gemini-3.1-flash-lite'];
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

    if (contents.length === 0 || contents[contents.length - 1].parts[0].text !== cleanUserText) {
      contents.push({
        role: 'user',
        parts: [{ text: cleanUserText }],
      });
    }

    let fullText = '';
    let lastError: any = null;
    let usageMetadata: any = null;

    for (const targetModel of modelCandidates) {
      try {
        const callConfig: any = {
          systemInstruction,
          temperature: 0.7,
        };

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
        usageMetadata = response.usageMetadata;
        if (fullText) break;
      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${targetModel} call failed, trying next candidate:`, err?.message || err);
        await new Promise((r) => setTimeout(r, 300));
      }
    }

    if (!fullText) {
      return res.status(502).json({
        error: `AI gateway communication failed: ${lastError?.message || '502 Bad Gateway'}`,
      });
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

    res.status(200).json({
      reply: cleanText,
      text: cleanText,
      actionType,
      actionPayloadJson,
      usage: usageMetadata,
    });
  } catch (err: any) {
    console.error('Gemini API Error:', err);
    res.status(503).json({
      error: `AI Service Unavailable: ${err.message || 'Internal Server Error'}`,
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
  if (process.env.NODE_ENV === 'test') {
    return;
  }
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
    app.listen(Number(PORT), '0.0.0.0', () => {
      console.log(`Server listening on http://0.0.0.0:${PORT}`);
    });
  }
}

setupMiddleware().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

export default app;
