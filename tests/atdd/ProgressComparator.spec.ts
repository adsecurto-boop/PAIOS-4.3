import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PreContextBroker } from '../../src/core/broker/PreContextBroker';
import { PAIOSStorage } from '../../src/storage';

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

let ProgressComparator: any = class MockProgressComparator {
  static compareActualVsPlanned(input: ProgressComparisonInput): ProgressComparisonResult {
    return {
      plannedHours: 0,
      actualHours: 0,
      completionRatePercent: 0,
      completionDeltaPercent: 0,
      velocityScore: 0,
      identifiedBlockers: [],
      milestonesAchieved: [],
    };
  }

  static dispatchBlockersToInboundPit(blockers: ProgressBlocker[]): number {
    return 0;
  }
};

try {
  // @ts-ignore
  const imported = await import('../../src/core/journal/ProgressComparator');
  if (imported.ProgressComparator) ProgressComparator = imported.ProgressComparator;
} catch {
  // Awaiting AI Studio implementation (RED state)
}

describe('ATDD: Actual vs. Planned Progress Comparator (Step 4)', () => {
  beforeEach(() => {
    PreContextBroker.clearAll();
    PAIOSStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockActiveGoals = [
    {
      id: 'goal_context_broker',
      title: 'Build Context Broker and Ranking Engine',
      subprojects: [
        { id: 'sub_broker', title: 'PreContext Queue Buffer', status: 'COMPLETED' as const },
        { id: 'sub_db_pit', title: 'SQLite Inbound Pit Integration', status: 'BLOCKED' as const },
      ],
    },
    {
      id: 'goal_cloud_sync',
      title: 'PAIOS 5.0 SQLite Backend Sync',
      subprojects: [
        { id: 'sub_jwt_auth', title: 'JWT Authentication Endpoints', status: 'COMPLETED' as const },
      ],
    },
  ];

  const mockPlannedTasks = [
    { id: 'task_1', title: 'Implement 2500ms debounce buffer in broker', targetMinutes: 120, completed: true },
    { id: 'task_2', title: 'Integrate SQLite WAL foreign keys table', targetMinutes: 180, completed: false },
    { id: 'task_3', title: 'Setup PreContext Inbound Pit endpoints', targetMinutes: 60, completed: false },
  ];

  const mockJournalReflection = `
    Today was focused on Step 3 implementation.
    Successfully shipped the 2500ms debounce buffer and Rule B2 force sync trigger.
    However, ran into a critical blocker: "SQLite WAL lock contention caused 500 error when multiple plugins wrote simultaneously".
    Need to review db transaction isolation. Also felt minor fatigue due to context switching.
  `;

  describe('Progress Comparison & Variance Metric Contract', () => {
    it('calculates planned vs actual completion delta and structured velocity metrics', () => {
      const result = ProgressComparator.compareActualVsPlanned({
        journalText: mockJournalReflection,
        plannedTasks: mockPlannedTasks,
        activeGoals: mockActiveGoals,
      });

      // Planned 360 mins (6.0 hrs), completed 120 mins (2.0 hrs)
      expect(result.plannedHours).toBeCloseTo(6.0, 1);
      expect(result.actualHours).toBeCloseTo(2.0, 1);
      expect(result.completionRatePercent).toBeCloseTo(33.33, 1);
      expect(result.completionDeltaPercent).toBeCloseTo(-66.67, 1);
      expect(result.velocityScore).toBeGreaterThan(0);
    });

    it('parses journal text and task state to identify blockers with appropriate severity and priority', () => {
      const result = ProgressComparator.compareActualVsPlanned({
        journalText: mockJournalReflection,
        plannedTasks: mockPlannedTasks,
        activeGoals: mockActiveGoals,
      });

      expect(result.identifiedBlockers.length).toBeGreaterThanOrEqual(1);

      const criticalBlocker = result.identifiedBlockers.find((b: ProgressBlocker) =>
        /SQLite WAL lock|lock contention|transaction/i.test(b.description)
      );

      expect(criticalBlocker).toBeDefined();
      expect(criticalBlocker?.severity).toBe('blocker');
      expect(criticalBlocker?.priority).toBe('critical');
    });

    it('extracts accomplished milestones from reflection matching active goal subprojects', () => {
      const result = ProgressComparator.compareActualVsPlanned({
        journalText: mockJournalReflection,
        plannedTasks: mockPlannedTasks,
        activeGoals: mockActiveGoals,
      });

      expect(result.milestonesAchieved.length).toBeGreaterThanOrEqual(1);
      expect(result.milestonesAchieved).toEqual(
        expect.arrayContaining([expect.stringMatching(/debounce buffer|Rule B2 force sync/i)])
      );
    });
  });

  describe('Direct Dispatch of Blockers into PreContextBroker Inbound PIT', () => {
    it('dispatches identified blockers directly to PreContextBroker for downstream AI attention', () => {
      const comparison = ProgressComparator.compareActualVsPlanned({
        journalText: mockJournalReflection,
        plannedTasks: mockPlannedTasks,
        activeGoals: mockActiveGoals,
      });

      const dispatchedCount = ProgressComparator.dispatchBlockersToInboundPit(comparison.identifiedBlockers);
      expect(dispatchedCount).toBeGreaterThanOrEqual(1);

      // Verify staged records in PreContextBroker buffer
      expect(PreContextBroker.getBufferCount()).toBeGreaterThanOrEqual(1);

      // Verify immediate flush on force sync
      PreContextBroker.triggerForceSync();
      const synced = PreContextBroker.getSyncedRecords();
      expect(synced.length).toBeGreaterThanOrEqual(1);

      const blockerRecord = synced.find((r) => r.severity === 'blocker' || r.priority === 'critical');
      expect(blockerRecord).toBeDefined();
      expect(blockerRecord?.source_plugin_id).toMatch(/journal|progress_comparator/i);
    });
  });
});
