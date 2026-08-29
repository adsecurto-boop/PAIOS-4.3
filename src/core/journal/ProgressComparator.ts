import { PreContextBroker } from '../broker/PreContextBroker';
import { PriorityLevel, SeverityLevel } from '../broker/PriorityRanking';

export interface ProgressComparisonInput {
  userId?: string;
  journalText: string;
  plannedTasks: Array<{
    id: string;
    title: string;
    targetMinutes: number;
    completed: boolean;
  }>;
  activeGoals: Array<{
    id: string;
    title: string;
    subprojects: Array<{
      id: string;
      title: string;
      status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';
    }>;
  }>;
}

export interface ProgressBlocker {
  id: string;
  description: string;
  severity: 'warning' | 'blocker';
  priority: 'low' | 'medium' | 'high' | 'critical';
  goalId?: string;
  source: 'journal_reflection' | 'task_delta';
}

export interface ProgressComparisonResult {
  plannedHours: number;
  actualHours: number;
  completionRatePercent: number; // 0 - 100
  completionDeltaPercent: number; // positive or negative variance
  velocityScore: number; // calculated velocity metric
  identifiedBlockers: ProgressBlocker[];
  milestonesAchieved: string[];
}

export class ProgressComparator {
  /**
   * Compares actual reflection, completed tasks, and goal subprojects against planned targets.
   */
  public static compareActualVsPlanned(input: ProgressComparisonInput): ProgressComparisonResult {
    const plannedTasks = input.plannedTasks || [];
    const activeGoals = input.activeGoals || [];
    const journalText = input.journalText || '';

    // Calculate Planned vs Actual hours
    const totalPlannedMinutes = plannedTasks.reduce((sum, t) => sum + (t.targetMinutes || 0), 0);
    const totalActualMinutes = plannedTasks
      .filter((t) => t.completed)
      .reduce((sum, t) => sum + (t.targetMinutes || 0), 0);

    const plannedHours = totalPlannedMinutes > 0 ? Number((totalPlannedMinutes / 60).toFixed(2)) : 0;
    const actualHours = totalActualMinutes > 0 ? Number((totalActualMinutes / 60).toFixed(2)) : 0;

    const completionRatePercent =
      totalPlannedMinutes > 0
        ? Number(((totalActualMinutes / totalPlannedMinutes) * 100).toFixed(2))
        : 0;

    const completionDeltaPercent = Number((completionRatePercent - 100).toFixed(2));

    const velocityScore = Number(
      Math.max(1, actualHours * 10 + (completionRatePercent > 0 ? completionRatePercent / 5 : 0)).toFixed(2)
    );

    // Extract Blockers
    const identifiedBlockers: ProgressBlocker[] = [];

    // 1. Blockers from active goals
    activeGoals.forEach((goal) => {
      (goal.subprojects || []).forEach((sub) => {
        if (sub.status === 'BLOCKED') {
          identifiedBlockers.push({
            id: `blk_goal_${sub.id}`,
            description: `${sub.title} (Goal Subproject Blocked)`,
            severity: 'blocker',
            priority: 'critical',
            goalId: goal.id,
            source: 'task_delta',
          });
        }
      });
    });

    // 2. Blockers from journal reflection
    const rawSentences = journalText
      .split(/(?<=[.!?\n])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);

    rawSentences.forEach((sentence, idx) => {
      const lower = sentence.toLowerCase();
      const isCritical =
        /critical blocker|lock contention|wal lock|500 error|deadlock|fatal|crash/i.test(sentence) ||
        (lower.includes('blocker') && (lower.includes('critical') || lower.includes('sqlite') || lower.includes('error')));

      const isWarning =
        /fatigue|warning|context switch|friction|delay|bottleneck|tired|minor/i.test(sentence);

      if (isCritical) {
        // Clean quotation marks if wrapped
        let cleanDesc = sentence;
        const quoteMatch = sentence.match(/"([^"]+)"/);
        if (quoteMatch) {
          cleanDesc = quoteMatch[1];
        }
        identifiedBlockers.push({
          id: `blk_jnl_${idx}_${Date.now()}`,
          description: cleanDesc,
          severity: 'blocker',
          priority: 'critical',
          source: 'journal_reflection',
        });
      } else if (isWarning && !isCritical) {
        identifiedBlockers.push({
          id: `blk_jnl_warn_${idx}_${Date.now()}`,
          description: sentence,
          severity: 'warning',
          priority: 'medium',
          source: 'journal_reflection',
        });
      }
    });

    // Extract Milestones Achieved
    const milestonesAchieved: string[] = [];

    // 1. Completed goal subprojects
    activeGoals.forEach((goal) => {
      (goal.subprojects || []).forEach((sub) => {
        if (sub.status === 'COMPLETED') {
          milestonesAchieved.push(sub.title);
        }
      });
    });

    // 2. Completed planned tasks
    plannedTasks.forEach((t) => {
      if (t.completed && !milestonesAchieved.includes(t.title)) {
        milestonesAchieved.push(t.title);
      }
    });

    // 3. Milestones from reflection text
    rawSentences.forEach((sentence) => {
      if (/(?:shipped|accomplished|completed|finalized|delivered)\s+(.+)/i.test(sentence)) {
        milestonesAchieved.push(sentence);
      }
    });

    return {
      plannedHours,
      actualHours,
      completionRatePercent,
      completionDeltaPercent,
      velocityScore,
      identifiedBlockers,
      milestonesAchieved,
    };
  }

  /**
   * Dispatches identified blockers directly to PreContextBroker Inbound PIT.
   */
  public static dispatchBlockersToInboundPit(blockers: ProgressBlocker[]): number {
    let dispatched = 0;
    for (const blocker of blockers) {
      PreContextBroker.enqueuePIT({
        source_plugin_id: 'journal_progress_comparator',
        priority: blocker.priority === 'critical' ? 'critical' : blocker.priority === 'high' ? 'high' : 'medium',
        severity: blocker.severity === 'blocker' ? 'blocker' : 'warning',
        payload: {
          blockerId: blocker.id,
          description: blocker.description,
          source: blocker.source,
          goalId: blocker.goalId,
        },
      });
      dispatched++;
    }
    return dispatched;
  }
}

export default ProgressComparator;
