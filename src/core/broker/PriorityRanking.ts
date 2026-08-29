export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type Severity = 'info' | 'warning' | 'error' | 'blocker';

export type PriorityLevel = Priority;
export type SeverityLevel = Severity;

export interface RankedMessage {
  id: string;
  sourcePluginId: string;
  priority: Priority;
  severity: Severity;
  content?: string;
  payload?: Record<string, any>;
  timestamp?: number;
  createdAt?: number;
}

const SEVERITY_WEIGHTS: Record<Severity, number> = {
  blocker: 40,
  error: 30,
  warning: 20,
  info: 10,
};

const PRIORITY_WEIGHTS: Record<Priority, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

/**
 * Calculates ranking score based on severity (40/30/20/10) + priority (4/3/2/1).
 */
export function calculateRankingScore(severity: Severity, priority: Priority): number {
  const sevWeight = SEVERITY_WEIGHTS[severity] ?? 10;
  const prioWeight = PRIORITY_WEIGHTS[priority] ?? 1;
  return sevWeight + prioWeight;
}

/**
 * Utility function supporting calculateEventScore(priority, severity) or (severity, priority).
 */
export function calculateEventScore(
  param1: PriorityLevel | SeverityLevel,
  param2: PriorityLevel | SeverityLevel
): number {
  if ((param1 === 'blocker' || param1 === 'error' || param1 === 'warning' || param1 === 'info') &&
      (param2 === 'critical' || param2 === 'high' || param2 === 'medium' || param2 === 'low')) {
    return calculateRankingScore(param1 as Severity, param2 as Priority);
  }
  return calculateRankingScore(param2 as Severity, param1 as Priority);
}

/**
 * Ranks/sorts messages by composite score (descending) with timestamp tiebreaker (ascending/chronological).
 */
export function rankMessages<T extends RankedMessage>(messages: T[]): T[] {
  return [...messages].sort((a, b) => {
    const scoreA = calculateRankingScore(a.severity, a.priority);
    const scoreB = calculateRankingScore(b.severity, b.priority);

    if (scoreB !== scoreA) {
      return scoreB - scoreA;
    }

    const timeA = a.timestamp ?? a.createdAt ?? 0;
    const timeB = b.timestamp ?? b.createdAt ?? 0;
    return timeA - timeB;
  });
}

export const sortQueueByRanking = rankMessages;
