import { GoogleGenAI } from '@google/genai';

export interface AiResponse {
  text: string;
  actionType?: string | null;
  actionPayloadJson?: string | null;
  error?: string;
}

// Client-Side Direct Gemini Call Fallback
export async function sendClientGeminiChat(params: {
  userText: string;
  userContext?: string;
  modelName?: string;
  customApiKey?: string;
  role?: string;
  taskComplexity?: string;
  history?: any[];
}): Promise<AiResponse> {
  const { userText, userContext, customApiKey, role, history } = params;

  // Check for client-side environment variable or user-provided key in Settings
  const apiKey =
    customApiKey ||
    (import.meta as any).env?.VITE_GEMINI_API_KEY ||
    (typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : undefined);

  if (!apiKey) {
    return {
      text: 'AI server is operating in standalone mobile/offline mode. To enable AI Chat on this device, please enter your Gemini API Key in Settings.',
      actionType: null,
      actionPayloadJson: null,
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    let roleDescription =
      'You are PAIOS (Personal AI Operating System), a calm, highly intelligent personal productivity, life, and health assistant.';
    if (role === 'sdet_mentor') {
      roleDescription =
        'You are PAIOS SDET & ISTQB Mentor, an expert software test automation lead and engineering study coach specializing in ISTQB CTFL certification, Playwright/Python/Selenium automation, test strategy, and code review.';
    } else if (role === 'health_specialist') {
      roleDescription =
        'You are PAIOS Health & Wellness Companion, an empathetic health-tracking assistant specializing in non-prescriptive medication logs, symptom tracking, refill alerts, and lifestyle wellness.';
    } else if (role === 'creative_coach') {
      roleDescription =
        'You are PAIOS Creative Brainstormer & Performance Coach, an energetic coach focused on problem-solving, career goal execution, habit design, and high-impact project ideas.';
    }

    const systemInstruction = `
${roleDescription}
You have direct access to the user's real-time local PAIOS context (activities, timeline, tasks, health/medications, check-ins, reviews, journal).

CRITICAL TIME-BASED GROUNDING RULES:
1. Reference the user's local device date and time.
2. Answer user questions directly, objectively, and accurately based on their real PAIOS data.

SUPPORTED STRUCTURED ACTION FORMATS (Include at the VERY END of your response if an action is requested):
[[ACTION: {"type": "ADD_TASK", "title": "Finish API testing", "category": "Testing"}]]
or
[[ACTION: {"type": "START_ACTIVITY", "name": "Study ISTQB", "category": "Study"}]]
or
[[ACTION: {"type": "SAVE_NOTE", "text": "Investigate API timeout issue"}]]

Active PAIOS Context:
${userContext || 'No context available.'}
`.trim();

    const contents: any[] = [];
    if (Array.isArray(history) && history.length > 0) {
      const recentHistory = history.slice(-10);
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

    if (contents.length === 0 || contents[contents.length - 1].parts[0].text !== userText) {
      contents.push({
        role: 'user',
        parts: [{ text: userText }],
      });
    }

    const modelCandidates = ['gemini-2.5-flash', 'gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-2.5-pro'];
    let fullText = '';
    let lastError: any = null;

    for (const targetModel of modelCandidates) {
      try {
        const response = await ai.models.generateContent({
          model: targetModel,
          contents,
          config: {
            systemInstruction,
            temperature: 0.7,
          },
        });
        fullText = response.text || '';
        if (fullText) break;
      } catch (err: any) {
        lastError = err;
        console.warn(`Client model ${targetModel} call failed, trying fallback:`, err);
      }
    }

    if (!fullText) {
      return {
        text: `Unable to connect to Gemini AI services: ${lastError?.message || 'Network Error'}. Please check your connection or API key in Settings.`,
      };
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

    return {
      text: cleanText,
      actionType,
      actionPayloadJson,
    };
  } catch (err: any) {
    console.error('Client Gemini Call Exception:', err);
    return {
      text: `Error invoking client Gemini model: ${err.message || 'Unknown Error'}`,
    };
  }
}

// Client-Side Adaptive Timetable Generator
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

export function generateClientFallbackTimetable(params: {
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
      id: `client_block_${blockIdx++}`,
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
      addBlock(30, 'Commute Home & Dinner', 'Personal', 'RECOVERY', 'Post-work recovery and meal');
      if (endDayMins - cursor >= 90) {
        addBlock(45, 'PAIOS Architecture & Testing', 'Coding', 'HIGH', 'Daily engineering sprint for career and skills', 'Build PAIOS');
        addBlock(15, 'Short Rest Break', 'Break', 'RECOVERY', 'Relaxation break');
      }
    }
  } else {
    addBlock(90, 'ISTQB Active Recall & Mock Tests', 'Study', 'HIGH', 'Deep learning block using spaced repetition', 'ISTQB Certification');
    addBlock(15, 'Hydration & Stretch Break', 'Break', 'RECOVERY', 'Short mental rest');
    addBlock(45, 'Lunch & Family Time', 'Personal', 'RECOVERY', 'Nutritional meal and relaxation');
    addBlock(90, 'PAIOS Development & Automation', 'Coding', 'HIGH', 'Hands-on engineering', 'Build PAIOS');
    addBlock(15, 'Rest & Recovery Break', 'Break', 'RECOVERY', 'Recovery time');
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
    explanation: 'Generated using PAIOS client-side adaptive engine starting strictly from current time until bedtime.',
    blocks,
  };
}

export async function sendClientGeminiTimetable(params: {
  userContext?: string;
  currentTimeStr: string;
  currentDateStr: string;
  isWorkday: boolean;
  officeStartTime: string;
  officeEndTime: string;
  bedtime: string;
  wakeTime?: string;
  adaptationReason?: string;
  customApiKey?: string;
  modelName?: string;
}) {
  const {
    userContext,
    currentTimeStr = '10:15',
    currentDateStr,
    isWorkday = true,
    officeStartTime = '13:00',
    officeEndTime = '22:00',
    bedtime = '00:00',
    adaptationReason,
    customApiKey,
  } = params;

  const apiKey =
    customApiKey ||
    (import.meta as any).env?.VITE_GEMINI_API_KEY ||
    (typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : undefined);

  if (!apiKey) {
    return generateClientFallbackTimetable({
      currentTimeStr,
      isWorkday,
      officeStartTime,
      officeEndTime,
      bedtime,
    });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `
You are the PAIOS Adaptive Daily Timetable Engine.
Generate a dynamic adaptive timetable starting strictly at CURRENT TIME (${currentTimeStr}) and ending at BEDTIME (${bedtime}) for date ${currentDateStr}.

Respond ONLY with a valid JSON object matching this structure (no markdown formatting outside JSON):
{
  "explanation": "Why this plan? (2-3 concise sentences)",
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
`.trim();

    const promptText = `
Generate adaptive daily timetable from CURRENT TIME (${currentTimeStr}) to BEDTIME (${bedtime}).
Day mode: ${isWorkday ? 'WORKDAY' : 'WEEK-OFF'}.
${adaptationReason ? `Adaptation reason: "${adaptationReason}"` : ''}
Context: ${userContext || 'No context'}
`.trim();

    const modelCandidates = ['gemini-2.5-flash', 'gemini-3.5-flash', 'gemini-3.1-flash-lite'];
    let resultJsonText = '';

    for (const targetModel of modelCandidates) {
      try {
        const response = await ai.models.generateContent({
          model: targetModel,
          contents: promptText,
          config: {
            systemInstruction,
            temperature: 0.3,
            responseMimeType: 'application/json',
          },
        });
        resultJsonText = response.text || '';
        if (resultJsonText) break;
      } catch (err) {
        console.warn(`Client timetable model ${targetModel} failed:`, err);
      }
    }

    if (!resultJsonText) {
      return generateClientFallbackTimetable({
        currentTimeStr,
        isWorkday,
        officeStartTime,
        officeEndTime,
        bedtime,
      });
    }

    const jsonMatch = resultJsonText.match(/\{[\s\S]*\}/);
    const cleanJson = jsonMatch ? jsonMatch[0] : resultJsonText;
    const parsedData = JSON.parse(cleanJson);

    return {
      explanation: parsedData.explanation || 'AI generated timetable',
      blocks: Array.isArray(parsedData.blocks) ? parsedData.blocks : [],
    };
  } catch (err) {
    console.warn('Client timetable exception, executing local fallback:', err);
    return generateClientFallbackTimetable({
      currentTimeStr,
      isWorkday,
      officeStartTime,
      officeEndTime,
      bedtime,
    });
  }
}
