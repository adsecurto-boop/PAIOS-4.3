import { PriorityLevel } from '../../types';

export interface Milestone {
  id: string;
  title: string;
  completed: boolean;
}

export interface ParsedGoal {
  id: string;
  title: string;
  category: string;
  definitionOfDone: string;
  milestones: Milestone[];
  priority: 'HIGH' | 'NORMAL' | 'LOW';
  targetDate?: string;
  createdAtMillis: number;
}

export interface SubProject {
  id: string;
  title: string;
  status?: 'TODO' | 'IN_PROGRESS' | 'COMPLETED';
  isLocked?: boolean;
}

export interface Goal {
  id: string;
  title: string;
  projects: (SubProject | string)[];
  definitionOfDone: string;
  priority: PriorityLevel;
  category?: string;
  createdAtMillis?: number;
  isLocked?: boolean;
}

export interface ExtractedGoal {
  title: string;
  projects: string[];
  definitionOfDone: string;
  priority: PriorityLevel;
  category?: string;
  isComplete: boolean;
  missingFields: ('title' | 'definitionOfDone' | 'projects' | 'priority')[];
}

export interface ImmutabilityValidationResult {
  isValid: boolean;
  error?: string;
}

export class GoalExtractor {
  /**
   * Enforces Definition of Done (DoD) for a goal.
   * Ensures every goal has a measurable criterion for completion.
   */
  static enforceDefinitionOfDone(goal: Partial<ParsedGoal | Goal>): string {
    if (goal.definitionOfDone && goal.definitionOfDone.trim().length > 5) {
      return goal.definitionOfDone.trim();
    }
    const title = goal.title || 'Goal';
    return `Successfully complete all key milestones and verify functional outcomes for "${title}".`;
  }

  /**
   * Generates structured milestone breakdowns for a goal.
   */
  static generateMilestones(goalTitle: string, definitionOfDone: string): Milestone[] {
    const now = Date.now();
    return [
      {
        id: `ms_${now}_1`,
        title: `Requirement & Scope Breakdown for ${goalTitle}`,
        completed: false,
      },
      {
        id: `ms_${now}_2`,
        title: `Execute Implementation Sprint for ${goalTitle}`,
        completed: false,
      },
      {
        id: `ms_${now}_3`,
        title: `Verify Definition of Done: ${definitionOfDone.slice(0, 60)}...`,
        completed: false,
      },
    ];
  }

  /**
   * Conversational goal probing parser.
   * Converts user conversational text into structured ParsedGoal objects.
   */
  static extractGoalsFromConversation(userText: string, defaultCategory: string = 'Career'): ParsedGoal[] {
    if (!userText || !userText.trim()) return [];

    const cleanText = userText.trim();
    const sentences = cleanText
      .split(/(?:\.|\n|;)+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 5);

    const goals: ParsedGoal[] = [];
    const now = Date.now();

    sentences.forEach((sentence, idx) => {
      const lower = sentence.toLowerCase();
      const isGoalPattern =
        lower.includes('goal') ||
        lower.includes('want to') ||
        lower.includes('achieve') ||
        lower.includes('become') ||
        lower.includes('complete') ||
        lower.includes('pass') ||
        lower.includes('build') ||
        lower.includes('master');

      if (isGoalPattern || sentences.length === 1) {
        const title = sentence.replace(/^(my goal is to|i want to|goal:|i plan to)/i, '').trim();
        const dod = this.enforceDefinitionOfDone({ title });
        const milestones = this.generateMilestones(title, dod);

        goals.push({
          id: `goal_${now}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
          title: title.charAt(0).toUpperCase() + title.slice(1),
          category: lower.includes('istqb') || lower.includes('test') ? 'Study' : defaultCategory,
          definitionOfDone: dod,
          milestones,
          priority: lower.includes('priority') || lower.includes('urgent') ? 'HIGH' : 'NORMAL',
          createdAtMillis: now + idx,
        });
      }
    });

    return goals;
  }

  /**
   * Merges new goals into existing goals list immutably.
   */
  static mergeGoalsImmutably(existingGoals: ParsedGoal[], newGoals: ParsedGoal[]): ParsedGoal[] {
    const existingIds = new Set(existingGoals.map((g) => g.id));
    const freshAdditions = newGoals.filter((g) => !existingIds.has(g.id));
    return [...freshAdditions, ...existingGoals];
  }

  /**
   * Parses conversational text or message array to extract structured goal properties.
   */
  static extractGoalFromConversation(
    input: string | Array<{ text: string; isUser?: boolean; sender?: string } | string>
  ): ExtractedGoal {
    let fullText = '';
    if (Array.isArray(input)) {
      const userItems = input.filter((item) => {
        if (typeof item === 'string') return true;
        if (item.isUser === true) return true;
        if (item.sender === 'user') return true;
        return false;
      });

      const itemsToUse = userItems.length > 0 ? userItems : input;
      fullText = itemsToUse
        .map((item) => (typeof item === 'string' ? item : item.text))
        .join('\n');
    } else {
      fullText = input || '';
    }

    const cleanText = fullText.trim();
    let title = '';
    const projects: string[] = [];
    let definitionOfDone = '';
    let priority: PriorityLevel = 'NORMAL';
    let category = 'Work';

    // 1. Check for JSON block in text if AI returned formatted JSON
    const jsonMatch = cleanText.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || cleanText.match(/(\{[\s\S]*"title"[\s\S]*\})/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed.title) title = parsed.title;
        if (Array.isArray(parsed.projects)) {
          projects.push(
            ...parsed.projects.map((p: any) => (typeof p === 'string' ? p : p.title || String(p)))
          );
        }
        if (parsed.definitionOfDone || parsed.dod) {
          definitionOfDone = parsed.definitionOfDone || parsed.dod;
        }
        if (parsed.priority) {
          const prioUpper = String(parsed.priority).toUpperCase();
          if (['LOW', 'NORMAL', 'HIGH', 'CRITICAL'].includes(prioUpper)) {
            priority = prioUpper as PriorityLevel;
          }
        }
        if (parsed.category) category = parsed.category;
      } catch (e) {
        // Fall back to rule-based parser
      }
    }

    // 2. Rule-based Extraction if not fully parsed
    if (!title) {
      const goalMatch = cleanText.match(/(?:goal|objective|aim|target)\s*(?:is|:)?\s*["“]?([^.\n,]+)/i);
      if (goalMatch && goalMatch[1].trim().length > 3) {
        title = goalMatch[1].trim();
      } else {
        const firstLine = cleanText.split('\n')[0];
        if (firstLine && firstLine.length > 5 && firstLine.length < 120) {
          title = firstLine.replace(/^(?:i want to|i aim to|i need to|my goal is)\s*/i, '').trim();
        }
      }
    }

    // Definition of Done (DoD)
    if (!definitionOfDone) {
      const dodMatch = cleanText.match(/(?:definition of done|dod|success criteria|criteria|metric|when is it done|complete when)\s*(?:is|:)?\s*["“]?([^.\n]+)/i);
      if (dodMatch && dodMatch[1].trim().length > 3) {
        definitionOfDone = dodMatch[1].trim();
      }
    }

    // Projects / Sub-projects / Milestones
    if (projects.length === 0) {
      const lines = cleanText.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        const bulletMatch = trimmed.match(/^(?:[-*•]|\d+[.)])\s+(.*)/);
        if (bulletMatch && bulletMatch[1].trim().length > 2) {
          const sub = bulletMatch[1].trim();
          if (!sub.toLowerCase().startsWith('definition of done') && !sub.toLowerCase().startsWith('goal:')) {
            projects.push(sub);
          }
        }
      }

      if (projects.length === 0) {
        const projMatch = cleanText.match(/(?:sub-?projects|milestones|breakdown|steps)\s*(?:are|:)\s*([^\n.]+)/i);
        if (projMatch && projMatch[1]) {
          const parts = projMatch[1].split(/[,;]/).map((p) => p.trim()).filter((p) => p.length > 2);
          projects.push(...parts);
        }
      }
    }

    // Priority Extraction
    const prioMatch = cleanText.match(/(?:priority)\s*(?:is|:)?\s*(CRITICAL|HIGH|NORMAL|LOW)/i);
    if (prioMatch) {
      priority = prioMatch[1].toUpperCase() as PriorityLevel;
    } else if (/\b(urgent|critical|highest priority|p0|asap)\b/i.test(cleanText)) {
      priority = 'CRITICAL';
    } else if (/\b(important|high priority|p1|high)\b/i.test(cleanText)) {
      priority = 'HIGH';
    } else if (/\b(low priority|optional|p3|whenever|low)\b/i.test(cleanText)) {
      priority = 'LOW';
    }

    // Category Extraction
    if (/\b(sdet|test|qa|istqb|bug|playwright)\b/i.test(cleanText)) {
      category = 'Testing';
    } else if (/\b(coding|software|api|database|react|typescript|python)\b/i.test(cleanText)) {
      category = 'Coding';
    } else if (/\b(health|fitness|diet|workout|run|sleep)\b/i.test(cleanText)) {
      category = 'Health';
    } else if (/\b(study|learn|course|certification|book)\b/i.test(cleanText)) {
      category = 'Study';
    }

    const missingFields: ('title' | 'definitionOfDone' | 'projects' | 'priority')[] = [];
    if (!title) missingFields.push('title');
    if (!definitionOfDone) missingFields.push('definitionOfDone');
    if (projects.length === 0) missingFields.push('projects');

    const isComplete = missingFields.length === 0;

    return {
      title,
      projects,
      definitionOfDone,
      priority,
      category,
      isComplete,
      missingFields,
    };
  }

  /**
   * Evaluates missing components in a goal and returns an interactive probing question.
   */
  static probeMissingGoalDetails(goal: Partial<Goal> | ExtractedGoal): string | null {
    if (!goal.title || goal.title.trim().length === 0) {
      return 'What is your primary goal or ambition that you would like PAIOS to help you organize and achieve?';
    }

    if (!goal.definitionOfDone || goal.definitionOfDone.trim().length === 0) {
      return `For "${goal.title}", how do you define success? What is your clear Definition of Done (e.g. passing a specific exam, deploying an app, or hitting a metric)?`;
    }

    const projList = goal.projects || [];
    if (projList.length === 0) {
      return `What key sub-projects, modules, or actionable milestones will break down "${goal.title}" into manageable steps?`;
    }

    if (!goal.priority) {
      return `What priority level should we assign to this goal? (Choose from: CRITICAL, HIGH, NORMAL, or LOW)`;
    }

    return null;
  }

  /**
   * Validates goal immutability constraints between an existing active goal and an update proposal.
   */
  static validateGoalImmutability(
    originalGoal: Goal,
    updatedGoal: Goal
  ): ImmutabilityValidationResult {
    if (originalGoal.isLocked) {
      if (originalGoal.title !== updatedGoal.title) {
        return {
          isValid: false,
          error: `Violation: Cannot modify the title of locked goal "${originalGoal.title}".`,
        };
      }
      if (originalGoal.definitionOfDone !== updatedGoal.definitionOfDone) {
        return {
          isValid: false,
          error: `Violation: Cannot modify the Definition of Done of locked goal "${originalGoal.title}".`,
        };
      }
    }

    const origProjects = originalGoal.projects || [];
    const updatedProjects = updatedGoal.projects || [];

    const getProjTitle = (p: SubProject | string): string => {
      return typeof p === 'string' ? p.trim().toLowerCase() : p.title.trim().toLowerCase();
    };

    const getProjStatus = (p: SubProject | string): string => {
      return typeof p === 'string' ? 'TODO' : p.status || 'TODO';
    };

    for (const origP of origProjects) {
      const origTitle = getProjTitle(origP);
      const origStatus = getProjStatus(origP);

      if (origStatus === 'IN_PROGRESS' || (typeof origP !== 'string' && origP.isLocked)) {
        const stillExists = updatedProjects.some((up) => getProjTitle(up) === origTitle);
        if (!stillExists) {
          return {
            isValid: false,
            error: `Immutability Violation: Cannot delete active project "${typeof origP === 'string' ? origP : origP.title}" while in progress.`,
          };
        }
      }
    }

    return { isValid: true };
  }

  /**
   * Normalizes an extracted goal into a full Goal object.
   */
  static normalizeGoal(extracted: ExtractedGoal | Partial<Goal>): Goal {
    const id = (extracted as Goal).id || `goal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const title = extracted.title || 'Untitled Goal';
    const definitionOfDone = extracted.definitionOfDone || 'Goal completion criteria';
    const priority = extracted.priority || 'NORMAL';
    const category = extracted.category || 'Work';
    const rawProjects = extracted.projects || [];

    const projects: (SubProject | string)[] = rawProjects.map((p, idx) => {
      if (typeof p === 'string') {
        return {
          id: `proj_${idx + 1}_${Date.now()}`,
          title: p,
          status: 'TODO',
        };
      }
      return p;
    });

    return {
      id,
      title,
      projects,
      definitionOfDone,
      priority,
      category,
      createdAtMillis: (extracted as Goal).createdAtMillis || Date.now(),
      isLocked: (extracted as Goal).isLocked || false,
    };
  }

  /**
   * Formats a goal into a clean scannable string representation.
   */
  static formatGoalSummary(goal: Goal | ExtractedGoal): string {
    const title = goal.title || 'Untitled Goal';
    const priority = goal.priority || 'NORMAL';
    const dod = goal.definitionOfDone || 'N/A';
    const projects = (goal.projects || []).map((p) => (typeof p === 'string' ? p : p.title));

    return `[${priority}] ${title}\nDefinition of Done: ${dod}\nProjects:\n${projects.map((p) => `  - ${p}`).join('\n') || '  - None'}`;
  }
}

export default GoalExtractor;
