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

export class GoalExtractor {
  /**
   * Enforces Definition of Done (DoD) for a goal.
   * Ensures every goal has a measurable criterion for completion.
   */
  static enforceDefinitionOfDone(goal: Partial<ParsedGoal>): string {
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
   * Handles offline / network unavailability gracefully without throwing unhandled rejections.
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
      // Look for goal indicator keywords or extract non-empty sentences
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
   * Ensures parent objects/arrays are never mutated in-place.
   */
  static mergeGoalsImmutably(existingGoals: ParsedGoal[], newGoals: ParsedGoal[]): ParsedGoal[] {
    const existingIds = new Set(existingGoals.map((g) => g.id));
    const freshAdditions = newGoals.filter((g) => !existingIds.has(g.id));
    return [...freshAdditions, ...existingGoals];
  }
}

export default GoalExtractor;
