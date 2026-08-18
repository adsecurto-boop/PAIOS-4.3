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
