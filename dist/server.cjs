"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server.ts
var server_exports = {};
__export(server_exports, {
  default: () => server_default,
  requireAuth: () => requireAuth
});
module.exports = __toCommonJS(server_exports);
var import_express = __toESM(require("express"), 1);
var import_path2 = __toESM(require("path"), 1);
var import_genai = require("@google/genai");
var import_jsonwebtoken = __toESM(require("jsonwebtoken"), 1);
var import_bcryptjs = __toESM(require("bcryptjs"), 1);

// src/server/db.ts
var import_better_sqlite3 = __toESM(require("better-sqlite3"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var dbPath = process.env.SQLITE_DB_PATH || process.env.DB_PATH || import_path.default.join(process.cwd(), "data", "paios5.sqlite");
function createDatabaseInstance() {
  if (dbPath !== ":memory:") {
    const dir = import_path.default.dirname(dbPath);
    if (!import_fs.default.existsSync(dir)) {
      import_fs.default.mkdirSync(dir, { recursive: true });
    }
  }
  try {
    const instance = new import_better_sqlite3.default(dbPath);
    try {
      instance.pragma("journal_mode = WAL");
    } catch (_) {
    }
    instance.pragma("foreign_keys = ON");
    return instance;
  } catch (err) {
    console.warn("[DB] SQLite open failed. Attempting shm/wal clean recovery...", err);
    if (dbPath !== ":memory:") {
      try {
        if (import_fs.default.existsSync(`${dbPath}-shm`)) import_fs.default.unlinkSync(`${dbPath}-shm`);
        if (import_fs.default.existsSync(`${dbPath}-wal`)) import_fs.default.unlinkSync(`${dbPath}-wal`);
      } catch (_) {
      }
    }
    const instance = new import_better_sqlite3.default(dbPath);
    try {
      instance.pragma("journal_mode = WAL");
    } catch (_) {
    }
    instance.pragma("foreign_keys = ON");
    return instance;
  }
}
var db = createDatabaseInstance();
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    display_name TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS user_storage (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    storage_key TEXT NOT NULL,
    payload TEXT NOT NULL DEFAULT '{}',
    version INTEGER NOT NULL DEFAULT 1,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_user_storage_uid ON user_storage(user_id);
  CREATE INDEX IF NOT EXISTS idx_user_storage_key ON user_storage(user_id, storage_key);

  CREATE TABLE IF NOT EXISTS plugin_inbound_pit (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    source_plugin_id TEXT NOT NULL,
    target_plugin_id TEXT,
    priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'blocker')),
    payload TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'staged' CHECK (status IN ('staged', 'synced', 'rejected')),
    created_at INTEGER NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_plugin_pit_user ON plugin_inbound_pit(user_id, status);
`);
var db_default = db;

// server.ts
var _dirname = typeof __dirname !== "undefined" ? __dirname : process.cwd();
var app = (0, import_express.default)();
var PORT = process.env.PORT || 3001;
var JWT_SECRET = process.env.JWT_SECRET || "paios5_ubuntu_sqlite_jwt_secret";
app.use(import_express.default.json());
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: Authorization Bearer token is required" });
  }
  const token = authHeader.substring(7).trim();
  if (!token) {
    return res.status(401).json({ error: "Unauthorized: Bearer token is required" });
  }
  try {
    const decoded = import_jsonwebtoken.default.verify(token, JWT_SECRET);
    const user = db_default.prepare("SELECT id, email, display_name, created_at FROM users WHERE id = ?").get(decoded.id);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized: User session no longer exists" });
    }
    req.user = {
      id: user.id,
      email: user.email.toLowerCase(),
      displayName: user.display_name || user.email.split("@")[0],
      created_at: user.created_at
    };
    req.userId = user.id;
    next();
  } catch (err) {
    return res.status(403).json({ error: "Forbidden: Invalid or expired token" });
  }
}
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", app: "PAIOS" });
});
app.post("/api/auth/register", (req, res) => {
  const { email, password, displayName } = req.body || {};
  if (!email || typeof email !== "string" || !email.trim()) {
    return res.status(400).json({ error: "Email is required" });
  }
  if (!password || typeof password !== "string") {
    return res.status(400).json({ error: "Password is required" });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters long" });
  }
  const cleanEmail = email.trim().toLowerCase();
  const existingUser = db_default.prepare("SELECT id FROM users WHERE email = ?").get(cleanEmail);
  if (existingUser) {
    return res.status(409).json({ error: "This email is already registered. Please login." });
  }
  const id = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const passwordHash = import_bcryptjs.default.hashSync(password, 10);
  const now = Date.now();
  const cleanDisplayName = displayName?.trim() || cleanEmail.split("@")[0];
  db_default.prepare(`
    INSERT INTO users (id, email, password_hash, display_name, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, cleanEmail, passwordHash, cleanDisplayName, now, now);
  const token = import_jsonwebtoken.default.sign({ id, email: cleanEmail }, JWT_SECRET, { expiresIn: "60d" });
  res.status(201).json({
    token,
    user: {
      id,
      email: cleanEmail,
      displayName: cleanDisplayName,
      created_at: now
    }
  });
});
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body || {};
  if (!email || typeof email !== "string" || !email.trim()) {
    return res.status(400).json({ error: "Email is required" });
  }
  if (!password || typeof password !== "string") {
    return res.status(400).json({ error: "Password is required" });
  }
  const cleanEmail = email.trim().toLowerCase();
  const user = db_default.prepare("SELECT * FROM users WHERE email = ?").get(cleanEmail);
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials. User not found." });
  }
  const validPassword = import_bcryptjs.default.compareSync(password, user.password_hash);
  if (!validPassword) {
    return res.status(401).json({ error: "Invalid credentials. Incorrect password." });
  }
  const token = import_jsonwebtoken.default.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "60d" });
  res.status(200).json({
    token,
    user: {
      id: user.id,
      email: user.email.toLowerCase(),
      displayName: user.display_name || user.email.split("@")[0],
      created_at: user.created_at
    }
  });
});
app.get("/api/auth/me", requireAuth, (req, res) => {
  const user = req.user;
  res.status(200).json({ user });
});
app.post("/api/sync/push", requireAuth, (req, res) => {
  const userId = req.userId;
  const { key, payload, version } = req.body || {};
  if (!key || typeof key !== "string" || !key.trim()) {
    return res.status(400).json({ error: "Storage key is required" });
  }
  if (payload === void 0 || payload === null) {
    return res.status(400).json({ error: "Storage payload is required" });
  }
  const storageKey = key.trim();
  const compositeId = `${userId}:${storageKey}`;
  const payloadStr = typeof payload === "string" ? payload : JSON.stringify(payload);
  const v = Number.isInteger(version) ? version : 1;
  const now = Date.now();
  db_default.prepare(`
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
    syncedAt: now
  });
});
app.get("/api/sync/pull", requireAuth, (req, res) => {
  const userId = req.userId;
  const rows = db_default.prepare("SELECT storage_key, payload, version, updated_at FROM user_storage WHERE user_id = ?").all(userId);
  const data = {};
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
    pulledAt: Date.now()
  });
});
app.delete("/api/sync/data", requireAuth, (req, res) => {
  const userId = req.userId;
  const key = req.query.key || req.body?.key;
  if (key && typeof key === "string" && key.trim()) {
    const storageKey = key.trim();
    db_default.prepare("DELETE FROM user_storage WHERE user_id = ? AND storage_key = ?").run(userId, storageKey);
  } else {
    db_default.prepare("DELETE FROM user_storage WHERE user_id = ?").run(userId);
    db_default.prepare("DELETE FROM plugin_inbound_pit WHERE user_id = ?").run(userId);
  }
  res.status(200).json({
    success: true,
    message: key ? `Key ${key} removed` : "All user data dropped"
  });
});
var currentServerVersion = {
  version: "1.0.0",
  buildTimestamp: 17874635e5,
  gitCommit: "c9f81a2",
  releaseNotes: "PAIOS Production Build - Auto-Update & Cross-Device Sync Ready",
  mandatory: false
};
app.get("/api/version", (_req, res) => {
  res.json(currentServerVersion);
});
app.post("/api/version/publish", (req, res) => {
  const { version, gitCommit, releaseNotes, mandatory } = req.body || {};
  const nextVersion = version || `1.0.${Math.floor(Math.random() * 90) + 10}`;
  const nextCommit = gitCommit || `commit_${Math.random().toString(36).substring(2, 8)}`;
  currentServerVersion = {
    version: nextVersion,
    buildTimestamp: Date.now(),
    gitCommit: nextCommit,
    releaseNotes: releaseNotes || "Latest Git commit build published with performance and sync enhancements.",
    mandatory: Boolean(mandatory)
  };
  res.json({
    success: true,
    message: "New PAIOS version published successfully!",
    serverVersion: currentServerVersion
  });
});
var vaultStore = /* @__PURE__ */ new Map();
var userStore = /* @__PURE__ */ new Map();
var authStore = /* @__PURE__ */ new Map();
app.get("/api/sync/vault/:code", (req, res) => {
  const code = req.params.code.trim().toUpperCase();
  const record = vaultStore.get(code);
  res.json({
    success: true,
    snapshot: record?.snapshot || null,
    updatedAt: record?.updatedAt || 0
  });
});
app.post("/api/sync/vault/:code", (req, res) => {
  const code = req.params.code.trim().toUpperCase();
  const { snapshot } = req.body;
  if (!snapshot) {
    res.status(400).json({ error: "Missing snapshot" });
    return;
  }
  const updatedAt = Date.now();
  vaultStore.set(code, { snapshot, updatedAt });
  res.json({ success: true, snapshot, updatedAt });
});
app.get("/api/sync/user/:userId", (req, res) => {
  const userId = req.params.userId.trim();
  const record = userStore.get(userId);
  res.json({
    success: true,
    snapshot: record?.snapshot || null,
    updatedAt: record?.updatedAt || 0
  });
});
app.post("/api/sync/user/:userId", (req, res) => {
  const userId = req.params.userId.trim();
  const { snapshot } = req.body;
  if (!snapshot) {
    res.status(400).json({ error: "Missing snapshot" });
    return;
  }
  const updatedAt = Date.now();
  userStore.set(userId, { snapshot, updatedAt });
  res.json({ success: true, snapshot, updatedAt });
});
app.post("/api/sync/auth", (req, res) => {
  const { action, email, password, displayName } = req.body;
  if (action === "guest") {
    const guestUid = `guest_${Math.random().toString(36).substring(2, 9)}`;
    const user = { uid: guestUid, email: null, displayName: "Guest User" };
    res.json({ success: true, user });
    return;
  }
  if (action === "signup") {
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }
    const lowerEmail = email.toLowerCase();
    if (authStore.has(lowerEmail)) {
      res.status(400).json({ error: "This email is already registered. Please sign in instead." });
      return;
    }
    const uid = `user_${Math.random().toString(36).substring(2, 11)}`;
    const newUser = { uid, email: lowerEmail, password, displayName: displayName || email.split("@")[0] };
    authStore.set(lowerEmail, newUser);
    res.json({ success: true, user: { uid: newUser.uid, email: newUser.email, displayName: newUser.displayName } });
    return;
  }
  if (action === "login") {
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }
    const lowerEmail = email.toLowerCase();
    const existing = authStore.get(lowerEmail);
    if (!existing || existing.password !== password) {
      res.status(401).json({ error: "Invalid email or password." });
      return;
    }
    res.json({ success: true, user: { uid: existing.uid, email: existing.email, displayName: existing.displayName } });
    return;
  }
  res.status(400).json({ error: "Invalid action" });
});
app.post("/api/ai/chat", requireAuth, async (req, res) => {
  try {
    const { message, userText, userContext, modelName, role, taskComplexity, history } = req.body || {};
    const promptText = message !== void 0 ? message : userText;
    if (!promptText || typeof promptText !== "string" || !promptText.trim()) {
      return res.status(400).json({ error: "Message payload is required and cannot be empty" });
    }
    const cleanUserText = promptText.trim();
    const redFlagRegexes = [
      { category: "CARDIOVASCULAR", pattern: /\b(chest pain|crushing chest|chest pressure|left arm numb|passed out|syncope)\b/i },
      { category: "ANAPHYLAXIS", pattern: /\b(throat closing|swollen lips|swollen tongue|cannot breathe|hives all over)\b/i },
      { category: "NEUROLOGICAL", pattern: /\b(slurred speech|face drooping|sudden vision loss|seizure|convulsing)\b/i },
      { category: "SEROTONIN_TOXICITY", pattern: /\b(severe tremor|rigid muscles|fever and agitation|serotonin syndrome)\b/i },
      { category: "PSYCHIATRIC_CRISIS", pattern: /\b(want to end my life|suicidal thoughts|plan to harm myself)\b/i }
    ];
    for (const flag of redFlagRegexes) {
      if (flag.pattern.test(cleanUserText)) {
        const emergencyText = `\u{1F6A8} EMERGENCY MEDICAL ALERT (${flag.category}): The symptoms you described may indicate a medical emergency. Please call emergency services (911 or 112) or go to the nearest emergency room immediately. PAIOS cannot provide emergency treatment.`;
        return res.json({
          reply: emergencyText,
          text: emergencyText,
          actionType: null,
          actionPayloadJson: null
        });
      }
    }
    const apiKey = process.env.GEMINI_API_KEY;
    if (process.env.NODE_ENV === "test" || !apiKey || apiKey.startsWith("test-")) {
      const mockReply = `Server-side AI response for: ${cleanUserText}`;
      return res.status(200).json({
        reply: mockReply,
        text: mockReply,
        actionType: null,
        actionPayloadJson: null,
        usage: { totalTokens: 32 }
      });
    }
    const ai = new import_genai.GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
    let modelCandidates = [];
    const lowerModel = (modelName || "").toLowerCase();
    const mode = taskComplexity || (lowerModel.includes("pro") ? "complex" : lowerModel.includes("lite") ? "fast" : "general");
    if (mode === "complex") {
      modelCandidates = ["gemini-3.1-pro-preview", "gemini-3.7-flash", "gemini-3.5-flash"];
    } else if (mode === "fast") {
      modelCandidates = ["gemini-3.1-flash-lite", "gemini-3.7-flash", "gemini-3.5-flash"];
    } else {
      modelCandidates = ["gemini-3.7-flash", "gemini-3.5-flash", "gemini-3.1-flash-lite"];
    }
    let roleDescription = "You are PAIOS (Personal AI Operating System), a calm, highly intelligent personal productivity, life, and health assistant.";
    if (role === "sdet_mentor") {
      roleDescription = "You are PAIOS SDET & ISTQB Mentor, an expert software test automation lead and engineering study coach specializing in ISTQB CTFL certification, Playwright/Python/Selenium automation, test strategy, and code review.";
    } else if (role === "health_specialist") {
      roleDescription = "You are PAIOS Health & Wellness Companion, an empathetic health-tracking assistant specializing in non-prescriptive medication logs, symptom tracking, refill alerts, and lifestyle wellness.";
    } else if (role === "creative_coach") {
      roleDescription = "You are PAIOS Creative Brainstormer & Performance Coach, an energetic coach focused on problem-solving, career goal execution, habit design, and high-impact project ideas.";
    }
    const serverNow = /* @__PURE__ */ new Date();
    const systemInstruction = `
${roleDescription}
You have direct access to the user's real-time local PAIOS context (activities, timeline, tasks, health/medications, check-ins, reviews, journal).

CRITICAL HEALTH & CLINICAL SAFETY BOUNDARIES:
1. STRICT NON-PRESCRIPTIVE POLICY: NEVER suggest altering, increasing, decreasing, or stopping any medication. NEVER diagnose conditions or assert direct clinical causality.
2. MISSED DOSE PROTOCOL: NEVER tell a user to take a double dose to make up for a missed pill. Quote standard FDA leaflet guidance: "Take as soon as remembered unless close to the next scheduled dose; never double up."
3. HEALTH-AWARE TASK PRIORITIZATION: If dizziness, sedation, or grogginess is logged in the user context, advise caution regarding physical hazards (driving, heavy machinery).
4. EPISTEMIC PROVENANCE: Treat prescription records, RxNorm CUIs, and adherence logs as authoritative ground truth. Never invent missing doses or false refill numbers.

CRITICAL TIME-BASED GROUNDING RULES:
1. ALWAYS reference the explicit CURRENT LOCAL TIME & DATE METADATA provided in the context below (Server Time: ${serverNow.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} ${serverNow.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}).
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
${userContext || "No context available."}
`.trim();
    const contents = [];
    if (Array.isArray(history) && history.length > 0) {
      const recentHistory = history.slice(-14);
      for (const msg of recentHistory) {
        if (msg && msg.text && typeof msg.text === "string" && msg.text.trim()) {
          const roleTag = msg.isUser || msg.sender === "USER" || msg.role === "user" ? "user" : "model";
          contents.push({
            role: roleTag,
            parts: [{ text: msg.text }]
          });
        }
      }
    }
    if (contents.length === 0 || contents[contents.length - 1].parts[0].text !== cleanUserText) {
      contents.push({
        role: "user",
        parts: [{ text: cleanUserText }]
      });
    }
    let fullText = "";
    let lastError = null;
    let usageMetadata = null;
    for (const targetModel of modelCandidates) {
      try {
        const callConfig = {
          systemInstruction,
          temperature: 0.7
        };
        if (targetModel === "gemini-3.1-pro-preview" || mode === "complex") {
          callConfig.thinkingConfig = {
            thinkingLevel: import_genai.ThinkingLevel.HIGH
          };
        }
        const response = await ai.models.generateContent({
          model: targetModel,
          contents,
          config: callConfig
        });
        fullText = response.text || "";
        usageMetadata = response.usageMetadata;
        if (fullText) break;
      } catch (err) {
        lastError = err;
        console.warn(`Model ${targetModel} call failed, trying next candidate:`, err?.message || err);
        await new Promise((r) => setTimeout(r, 300));
      }
    }
    if (!fullText) {
      return res.status(502).json({
        error: `AI gateway communication failed: ${lastError?.message || "502 Bad Gateway"}`
      });
    }
    let actionType = null;
    let actionPayloadJson = null;
    const actionRegex = /\[\[ACTION:\s*(\{.*?\})\s*\]\]/s;
    const match = actionRegex.exec(fullText);
    if (match) {
      actionPayloadJson = match[1];
      if (actionPayloadJson.includes("ADD_TASK")) actionType = "ADD_TASK";
      else if (actionPayloadJson.includes("START_ACTIVITY")) actionType = "START_ACTIVITY";
      else if (actionPayloadJson.includes("SAVE_NOTE")) actionType = "SAVE_NOTE";
    }
    const cleanText = fullText.replace(actionRegex, "").trim();
    res.status(200).json({
      reply: cleanText,
      text: cleanText,
      actionType,
      actionPayloadJson,
      usage: usageMetadata
    });
  } catch (err) {
    console.error("Gemini API Error:", err);
    res.status(503).json({
      error: `AI Service Unavailable: ${err.message || "Internal Server Error"}`
    });
  }
});
app.post("/api/ai/analyze-content", async (req, res) => {
  try {
    const { prompt, content, taskComplexity = "general", customApiKey } = req.body;
    if (!content || typeof content !== "string") {
      res.status(400).json({ error: "content is required" });
      return;
    }
    const apiKey = customApiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.json({
        success: false,
        error: "No Gemini API key available.",
        resultText: "API key missing. Please check server configuration or Settings."
      });
      return;
    }
    const ai = new import_genai.GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
    let modelName = "gemini-3.5-flash";
    const config = { temperature: 0.3 };
    if (taskComplexity === "complex") {
      modelName = "gemini-3.1-pro-preview";
      config.thinkingConfig = {
        thinkingLevel: import_genai.ThinkingLevel.HIGH
      };
    } else if (taskComplexity === "fast") {
      modelName = "gemini-3.1-flash-lite";
    }
    const instruction = prompt || "Analyze, summarize, or edit the following user text for clarity, key insights, and actionable steps:";
    const response = await ai.models.generateContent({
      model: modelName,
      contents: `${instruction}

---
${content}`,
      config
    });
    res.json({
      success: true,
      modelUsed: modelName,
      taskComplexity,
      resultText: response.text || ""
    });
  } catch (err) {
    console.error("Gemini Content Analysis Error:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Internal Server Error",
      resultText: `Content analysis failed: ${err.message}`
    });
  }
});
function parseTimeToMinutes(timeStr) {
  if (!timeStr) return 615;
  const clean = timeStr.trim().toLowerCase();
  let hours = 0;
  let minutes = 0;
  if (clean.includes("am") || clean.includes("pm")) {
    const isPm = clean.includes("pm");
    const parts = clean.replace(/am|pm/g, "").trim().split(":");
    hours = parseInt(parts[0], 10) || 0;
    minutes = parseInt(parts[1], 10) || 0;
    if (isPm && hours < 12) hours += 12;
    if (!isPm && hours === 12) hours = 0;
  } else {
    const parts = clean.split(":");
    hours = parseInt(parts[0], 10) || 0;
    minutes = parseInt(parts[1], 10) || 0;
  }
  return hours * 60 + minutes;
}
function formatMinutesToTime(mins) {
  const norm = (mins + 24 * 60) % (24 * 60);
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}
function generateLocalFallbackTimetable(params) {
  const {
    currentTimeStr = "10:15",
    isWorkday = true,
    officeStartTime = "13:00",
    officeEndTime = "22:00",
    bedtime = "00:00"
  } = params;
  let cursor = parseTimeToMinutes(currentTimeStr);
  let endDayMins = parseTimeToMinutes(bedtime);
  if (endDayMins <= cursor) {
    endDayMins += 24 * 60;
  }
  const officeStartMins = parseTimeToMinutes(officeStartTime);
  const officeEndMins = parseTimeToMinutes(officeEndTime);
  const blocks = [];
  let blockIdx = 1;
  const addBlock = (durationMins, activity, category, priority, reason, goal) => {
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
      goal: goal || (category === "Study" ? "ISTQB Certification" : category === "Coding" ? "Build PAIOS" : void 0),
      priority,
      reason,
      status: "planned"
    });
    cursor = blockEnd;
  };
  addBlock(15, "Freshen up / Prepare for focus", "Personal", "RECOVERY", "Transition into active routine from current time");
  if (isWorkday) {
    if (cursor < officeStartMins) {
      const timeBeforeOffice = officeStartMins - cursor;
      if (timeBeforeOffice >= 90) {
        addBlock(75, "ISTQB Focused Active Recall Study", "Study", "HIGH", "Top-priority learning goal before office shift", "ISTQB Certification");
        addBlock(15, "Short Rest Break", "Break", "RECOVERY", "Mental recovery between study and preparation");
      }
      if (cursor < officeStartMins - 30) {
        addBlock(30, "Lunch & Office Preparation", "Personal", "RECOVERY", "Nutritional intake and preparation for office shift");
      }
      if (cursor < officeStartMins) {
        addBlock(officeStartMins - cursor, "Commute / Transition to Office", "Work", "FIXED", "Travel and shift check-in");
      }
    }
    if (cursor < officeEndMins) {
      const shiftDur = officeEndMins - cursor;
      addBlock(shiftDur, "Office Shift", "Work", "FIXED", "Required office schedule commitment");
    }
    if (cursor < endDayMins) {
      addBlock(30, "Commute Home & Dinner", "Personal", "RECOVERY", "Post-work recovery, family time, and meal");
      if (endDayMins - cursor >= 90) {
        addBlock(45, "PAIOS Architecture & Testing", "Coding", "HIGH", "Daily engineering sprint for career and skills", "Build PAIOS");
        addBlock(15, "Short Rest Break", "Break", "RECOVERY", "Relaxation break");
      }
    }
  } else {
    addBlock(90, "ISTQB Active Recall & Mock Tests", "Study", "HIGH", "Deep learning block using spaced repetition", "ISTQB Certification");
    addBlock(15, "Hydration & Stretch Break", "Break", "RECOVERY", "Short mental rest");
    addBlock(45, "Lunch & Family Time", "Personal", "RECOVERY", "Nutritional meal and social relaxation");
    addBlock(90, "PAIOS Development & Automation", "Coding", "HIGH", "Hands-on Playwright/Python engineering", "Build PAIOS");
    addBlock(15, "Rest & Recovery Break", "Break", "RECOVERY", "Recovery time");
    addBlock(60, "Playwright & Software Testing Skills", "Testing", "FLEXIBLE", "Automation framework practice", "SDET Career");
    addBlock(45, "Dinner & Recreation", "Personal", "RECOVERY", "Evening relaxation with family");
  }
  if (endDayMins - cursor >= 45) {
    const remainingBeforeWinddown = endDayMins - cursor - 45;
    if (remainingBeforeWinddown > 0) {
      addBlock(remainingBeforeWinddown, "Flexible Personal Routine & Reading", "Personal", "OPTIONAL", "Personal hobbies or light reading");
    }
    addBlock(15, "Daily Evening Review & Tomorrow Prep", "Personal", "FLEXIBLE", "Reflect on accomplishments and plan next day");
    addBlock(30, "Wind Down / Sleep Preparation", "Personal", "RECOVERY", "Prepare mind and body for sleep at target bedtime");
  } else if (endDayMins - cursor > 0) {
    addBlock(endDayMins - cursor, "Wind Down / Sleep Preparation", "Personal", "RECOVERY", "Prepare for sleep at target bedtime");
  }
  return {
    explanation: "Generated using PAIOS adaptive local schedule engine (AI service busy/unavailable). Schedule starts strictly from current time and optimizes study, work, and recovery until bedtime.",
    blocks
  };
}
app.post("/api/ai/generate-timeline", async (req, res) => {
  try {
    const {
      userContext,
      currentTimeStr = "10:15",
      currentDateStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
      isWorkday = true,
      officeStartTime = "13:00",
      officeEndTime = "22:00",
      bedtime = "00:00",
      wakeTime = "07:30",
      adaptationReason,
      customApiKey,
      modelName
    } = req.body;
    const apiKey = customApiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      const fallback = generateLocalFallbackTimetable({
        currentTimeStr,
        isWorkday,
        officeStartTime,
        officeEndTime,
        bedtime
      });
      res.json({
        success: true,
        dateString: currentDateStr,
        generatedAtTimeStr: currentTimeStr,
        explanation: "Generated using local adaptive engine (No Gemini API Key provided).",
        blocks: fallback.blocks
      });
      return;
    }
    const ai = new import_genai.GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
    const modelCandidates = ["gemini-3.5-flash", "gemini-3.1-pro-preview", "gemini-3.1-flash-lite"];
    if (modelName && typeof modelName === "string") {
      if (modelName.includes("pro")) {
        modelCandidates.unshift("gemini-3.1-pro-preview");
      } else if (modelName.includes("lite")) {
        modelCandidates.unshift("gemini-3.1-flash-lite");
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
   - Day Mode: ${isWorkday ? "WORKDAY" : "WEEK-OFF / REST & STUDY DAY"}.
   ${isWorkday ? `- Office Shift is FIXED from ${officeStartTime} to ${officeEndTime}. Include commute/prep before and after.` : "- Today is a Week-Off! Prioritize deep ISTQB active recall study, PAIOS development, family time, and relaxation."}
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
   ${adaptationReason ? `- Adaptation context provided: "${adaptationReason}". Re-optimize the remaining timetable from ${currentTimeStr} accordingly.` : "- Generating full daily timetable starting now."}

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
    let resultJsonText = "";
    let lastError = null;
    for (const targetModel of modelCandidates) {
      try {
        const config = {
          systemInstruction,
          temperature: 0.3,
          responseMimeType: "application/json"
        };
        if (targetModel === "gemini-3.1-pro-preview") {
          config.thinkingConfig = {
            thinkingLevel: import_genai.ThinkingLevel.HIGH
          };
        }
        const response = await ai.models.generateContent({
          model: targetModel,
          contents: promptText,
          config
        });
        resultJsonText = response.text || "";
        if (resultJsonText) break;
      } catch (err) {
        lastError = err;
        console.warn(`Timetable generation on model ${targetModel} failed, trying candidate fallback:`, err?.message || err);
        await new Promise((r) => setTimeout(r, 400));
      }
    }
    if (!resultJsonText) {
      console.warn("All Gemini AI model attempts failed. Executing local rule-based timetable engine fallback.");
      const fallback = generateLocalFallbackTimetable({
        currentTimeStr,
        isWorkday,
        officeStartTime,
        officeEndTime,
        bedtime
      });
      res.json({
        success: true,
        dateString: currentDateStr,
        generatedAtTimeStr: currentTimeStr,
        explanation: fallback.explanation,
        blocks: fallback.blocks
      });
      return;
    }
    const jsonMatch = resultJsonText.match(/\{[\s\S]*\}/);
    const cleanJson = jsonMatch ? jsonMatch[0] : resultJsonText;
    const parsedData = JSON.parse(cleanJson);
    res.json({
      success: true,
      dateString: currentDateStr,
      generatedAtTimeStr: currentTimeStr,
      explanation: parsedData.explanation || "AI generated adaptive timetable based on current time and goals.",
      blocks: Array.isArray(parsedData.blocks) ? parsedData.blocks : []
    });
  } catch (err) {
    console.error("Timeline Generation Error, using local fallback:", err);
    const fallback = generateLocalFallbackTimetable({
      currentTimeStr: req.body.currentTimeStr || "10:15",
      isWorkday: req.body.isWorkday !== false,
      officeStartTime: req.body.officeStartTime || "13:00",
      officeEndTime: req.body.officeEndTime || "22:00",
      bedtime: req.body.bedtime || "00:00"
    });
    res.json({
      success: true,
      dateString: req.body.currentDateStr || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
      generatedAtTimeStr: req.body.currentTimeStr || "10:15",
      explanation: fallback.explanation,
      blocks: fallback.blocks
    });
  }
});
app.all("/api/*", (req, res) => {
  res.status(404).json({ error: `API endpoint ${req.path} not found` });
});
async function setupMiddleware() {
  if (process.env.NODE_ENV === "test") {
    return;
  }
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path2.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(import_path2.default.join(distPath, "index.html"));
    });
  }
  if (!process.env.VERCEL) {
    app.listen(Number(PORT), "0.0.0.0", () => {
      console.log(`Server listening on http://0.0.0.0:${PORT}`);
    });
  }
}
setupMiddleware().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
var server_default = app;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  requireAuth
});
//# sourceMappingURL=server.cjs.map
