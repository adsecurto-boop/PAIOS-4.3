import { describe, it, expect } from 'vitest';

export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type Severity = 'info' | 'warning' | 'error' | 'blocker';

export interface RankedMessage {
  id: string;
  sourcePluginId: string;
  priority: Priority;
  severity: Severity;
  content: string;
  timestamp?: number;
}

// Module resolver for target PriorityRanking matrix service
let calculateRankingScore: (severity: Severity, priority: Priority) => number = () => 0;
let rankMessages: (messages: RankedMessage[]) => RankedMessage[] = (msgs) => msgs;

try {
  // @ts-ignore
  const imported = await import('../../src/core/broker/PriorityRanking');
  if (imported.calculateRankingScore) calculateRankingScore = imported.calculateRankingScore;
  if (imported.rankMessages) rankMessages = imported.rankMessages;
} catch {
  // Awaiting AI Studio implementation (RED state)
}

describe('Unit Test: Priority & Severity Ranking Matrix (Step 3)', () => {
  describe('Composite Score Calculation Contract', () => {
    it('calculates exact composite scores based on Severity (40/30/20/10) + Priority (4/3/2/1)', () => {
      // Blocker (40) + Critical (4) = 44
      expect(calculateRankingScore('blocker', 'critical')).toBe(44);

      // Blocker (40) + Low (1) = 41
      expect(calculateRankingScore('blocker', 'low')).toBe(41);

      // Error (30) + Critical (4) = 34
      expect(calculateRankingScore('error', 'critical')).toBe(34);

      // Warning (20) + High (3) = 23
      expect(calculateRankingScore('warning', 'high')).toBe(23);

      // Warning (20) + Medium (2) = 22
      expect(calculateRankingScore('warning', 'medium')).toBe(22);

      // Info (10) + Low (1) = 11
      expect(calculateRankingScore('info', 'low')).toBe(11);
    });
  });

  describe('Queue Order Ranking', () => {
    it('correctly ranks mixed priority/severity messages in descending order of composite score', () => {
      const messages: RankedMessage[] = [
        {
          id: 'msg_1',
          sourcePluginId: 'health-plugin',
          severity: 'info',
          priority: 'low',
          content: 'Daily water intake logged', // Score: 10 + 1 = 11
        },
        {
          id: 'msg_2',
          sourcePluginId: 'timetable-plugin',
          severity: 'warning',
          priority: 'high',
          content: 'Upcoming meeting conflict detected', // Score: 20 + 3 = 23
        },
        {
          id: 'msg_3',
          sourcePluginId: 'system',
          severity: 'blocker',
          priority: 'critical',
          content: 'Database lock or battery failure', // Score: 40 + 4 = 44
        },
        {
          id: 'msg_4',
          sourcePluginId: 'tasks-plugin',
          severity: 'error',
          priority: 'medium',
          content: 'Sync rejected by remote', // Score: 30 + 2 = 32
        },
      ];

      const ranked = rankMessages(messages);

      expect(ranked.map((m) => m.id)).toEqual(['msg_3', 'msg_4', 'msg_2', 'msg_1']);
    });

    it('asserts blocker + low (41) ranks higher than error + critical (34)', () => {
      const messages: RankedMessage[] = [
        {
          id: 'msg_error_crit',
          sourcePluginId: 'p1',
          severity: 'error',
          priority: 'critical',
          content: 'Error with critical priority', // Score: 34
        },
        {
          id: 'msg_blocker_low',
          sourcePluginId: 'p2',
          severity: 'blocker',
          priority: 'low',
          content: 'Blocker with low priority', // Score: 41
        },
      ];

      const ranked = rankMessages(messages);
      expect(ranked[0].id).toBe('msg_blocker_low');
      expect(ranked[1].id).toBe('msg_error_crit');
    });

    it('preserves chronological order (timestamp) as a deterministic tiebreaker for equal scores', () => {
      const now = Date.now();
      const messages: RankedMessage[] = [
        {
          id: 'msg_first',
          sourcePluginId: 'p1',
          severity: 'warning',
          priority: 'high',
          content: 'First event',
          timestamp: now - 1000,
        },
        {
          id: 'msg_second',
          sourcePluginId: 'p2',
          severity: 'warning',
          priority: 'high',
          content: 'Second event',
          timestamp: now,
        },
      ];

      const ranked = rankMessages(messages);
      expect(ranked[0].id).toBe('msg_first');
      expect(ranked[1].id).toBe('msg_second');
    });
  });
});
