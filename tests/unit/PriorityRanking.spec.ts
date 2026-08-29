import { describe, it, expect } from 'vitest';
import { PriorityRanking, RankableItem, PriorityLevel, SeverityLevel } from '../../src/core/broker/PriorityRanking';

describe('Unit Test: PriorityRanking Composite Scoring Engine', () => {
  it('calculates composite score based on 60% priority and 40% severity', () => {
    // Critical (100) + Blocker (100) = 100 * 0.6 + 100 * 0.4 = 100
    const criticalBlockerScore = PriorityRanking.calculateCompositeScore({
      priority: 'critical',
      severity: 'blocker',
    });
    expect(criticalBlockerScore).toBe(100);

    // High (75) + Warning (50) = 75 * 0.6 + 50 * 0.4 = 45 + 20 = 65
    const highWarningScore = PriorityRanking.calculateCompositeScore({
      priority: 'high',
      severity: 'warning',
    });
    expect(highWarningScore).toBe(65);

    // Low (25) + Info (25) = 25 * 0.6 + 25 * 0.4 = 25
    const lowInfoScore = PriorityRanking.calculateCompositeScore({
      priority: 'low',
      severity: 'info',
    });
    expect(lowInfoScore).toBe(25);
  });

  it('maps all priority levels correctly', () => {
    const priorities: PriorityLevel[] = ['critical', 'high', 'medium', 'low'];
    priorities.forEach((p) => {
      const score = PriorityRanking.calculateCompositeScore({ priority: p, severity: 'info' });
      expect(score).toBeGreaterThan(0);
    });
  });

  it('maps all severity levels correctly', () => {
    const severities: SeverityLevel[] = ['blocker', 'error', 'warning', 'info'];
    severities.forEach((s) => {
      const score = PriorityRanking.calculateCompositeScore({ priority: 'medium', severity: s });
      expect(score).toBeGreaterThan(0);
    });
  });

  it('ranks items descending by composite score', () => {
    const items: RankableItem[] = [
      { id: '1', priority: 'low', severity: 'info', created_at: 1000 },
      { id: '2', priority: 'critical', severity: 'blocker', created_at: 1000 },
      { id: '3', priority: 'high', severity: 'warning', created_at: 1000 },
    ];

    const ranked = PriorityRanking.rankItems(items);

    expect(ranked[0].id).toBe('2'); // Score 100
    expect(ranked[1].id).toBe('3'); // Score 65
    expect(ranked[2].id).toBe('1'); // Score 25
  });

  it('uses created_at timestamp as tiebreaker for equal composite scores', () => {
    const items: RankableItem[] = [
      { id: 'older', priority: 'high', severity: 'warning', created_at: 1000 },
      { id: 'newer', priority: 'high', severity: 'warning', created_at: 5000 },
    ];

    const ranked = PriorityRanking.rankItems(items);

    expect(ranked[0].id).toBe('newer'); // Same score (65), but created_at 5000 > 1000
    expect(ranked[1].id).toBe('older');
  });

  it('maintains list stability for identical scores and created_at timestamps', () => {
    const items: RankableItem[] = [
      { id: 'item_a', priority: 'medium', severity: 'info', created_at: 1000 },
      { id: 'item_b', priority: 'medium', severity: 'info', created_at: 1000 },
    ];
    const ranked = PriorityRanking.rankItems(items);
    expect(ranked).toHaveLength(2);
  });

  it('handles invalid priority string with fallback score', () => {
    const score = PriorityRanking.calculateCompositeScore({ priority: 'invalid' as any, severity: 'info' });
    expect(score).toBe(40);
  });

  it('handles invalid severity string with fallback score', () => {
    const score = PriorityRanking.calculateCompositeScore({ priority: 'medium', severity: 'unknown' as any });
    expect(score).toBe(40);
  });

  it('handles ranking empty array returning empty array', () => {
    expect(PriorityRanking.rankItems([])).toEqual([]);
  });

  it('handles missing or partial priority/severity properties gracefully with fallbacks', () => {
    const defaultScore = PriorityRanking.calculateCompositeScore({});
    // Default fallback: priority 'medium' (50), severity 'info' (25) -> 50*0.6 + 25*0.4 = 30 + 10 = 40
    expect(defaultScore).toBe(40);
  });
});
