export type PriorityLevel = 'critical' | 'high' | 'medium' | 'low';
export type SeverityLevel = 'blocker' | 'error' | 'warning' | 'info';

export interface RankableItem {
  id: string;
  priority: PriorityLevel;
  severity: SeverityLevel;
  created_at: number;
  [key: string]: any;
}

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

export class PriorityRanking {
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

      // Tiebreaking by timestamp (newer items rank higher)
      return (b.created_at || 0) - (a.created_at || 0);
    });
  }
}

export default PriorityRanking;
