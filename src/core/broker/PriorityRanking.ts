export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type Severity = 'info' | 'warning' | 'error' | 'blocker';

export type PriorityLevel = 'critical' | 'high' | 'medium' | 'low';
export type SeverityLevel = 'blocker' | 'error' | 'warning' | 'info';

export interface RankedMessage {
  id: string;
  sourcePluginId?: string;
  priority: Priority;
  severity: Severity;
  content?: string;
  payload?: Record<string, any>;
  timestamp?: number;
  createdAt?: number;
  created_at?: number;
  [key: string]: any;
}

export interface RankableItem {
  id: string;
  priority: PriorityLevel;
  severity: SeverityLevel;
  created_at?: number;
  createdAt?: number;
  timestamp?: number;
  [key: string]: any;
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

const PRIORITY_SCORES: Record<PriorityLevel, number> = {
  critical: 100,
  high: 75,
  medium: 50,
  low: 25,
};

const SEVERITY_SCORES: Record<SeverityLevel, number> = {
  blocker: 100,
  error: 75,
  warning: 50,
  info: 25,
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
  if (
    (param1 === 'blocker' || param1 === 'error' || param1 === 'warning' || param1 === 'info') &&
    (param2 === 'critical' || param2 === 'high' || param2 === 'medium' || param2 === 'low')
  ) {
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

    const timeA = a.timestamp ?? a.createdAt ?? a.created_at ?? 0;
    const timeB = b.timestamp ?? b.createdAt ?? b.created_at ?? 0;
    return timeA - timeB;
  });
}

export const sortQueueByRanking = rankMessages;

export class PriorityRanking {
  static calculateRankingScore = calculateRankingScore;
  static calculateEventScore = calculateEventScore;
  static rankMessages = rankMessages;

  /**
   * Calculates composite priority/severity score:
   * Composite = (PriorityScore * 0.6) + (SeverityScore * 0.4)
   */
  static calculateCompositeScore(item: Partial<RankableItem>): number {
    const priority = item.priority && PRIORITY_SCORES[item.priority] ? item.priority : 'medium';
    const severity = item.severity && SEVERITY_SCORES[item.severity] ? item.severity : 'info';

    const pScore = PRIORITY_SCORES[priority];
    const sScore = SEVERITY_SCORES[severity];

    return pScore * 0.6 + sScore * 0.4;
  }

  /**
   * Ranks an array of items by composite score (highest score first).
   * Tiebreaker: Equal scores are sorted descending by created_at timestamp.
   */
  static rankItems<T extends RankableItem>(items: T[]): T[] {
    return [...items].sort((a, b) => {
      const scoreA = this.calculateCompositeScore(a);
      const scoreB = this.calculateCompositeScore(b);

      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }

      const timeA = a.created_at ?? a.createdAt ?? a.timestamp ?? 0;
      const timeB = b.created_at ?? b.createdAt ?? b.timestamp ?? 0;
      return timeB - timeA;
    });
  }
}

export default PriorityRanking;
