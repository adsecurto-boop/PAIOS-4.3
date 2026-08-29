import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

export interface TimetableBlock {
  id: string;
  startTime: string;
  endTime: string;
  title: string;
  category: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';
  isAiProposed?: boolean;
}

export interface ScheduleProposal {
  id: string;
  generatedAt: number;
  expiresAt: number; // 60,000ms expiration window (Rule B1)
  status: 'pending' | 'accepted' | 'rejected' | 'lapsed';
  blocks: TimetableBlock[];
  explanation: string;
}

// Module resolver for target TimetablePlugin service
let TimetablePlugin: any = class MockTimetablePlugin {
  private activeSchedule: TimetableBlock[] = [];
  private currentProposal: ScheduleProposal | null = null;
  private inboundPitDispatcher: ((event: any) => void) | null = null;

  constructor(options?: { initialSchedule?: TimetableBlock[]; onDispatchToPit?: (e: any) => void }) {
    this.activeSchedule = options?.initialSchedule || [];
    this.inboundPitDispatcher = options?.onDispatchToPit || null;
  }

  proposeSchedule(blocks: TimetableBlock[], explanation = ''): ScheduleProposal {
    // Scaffold fallback
    const now = Date.now();
    this.currentProposal = {
      id: `prop_${now}`,
      generatedAt: now,
      expiresAt: now + 60000,
      status: 'pending',
      blocks,
      explanation,
    };
    return this.currentProposal;
  }

  checkLapse(): void {
    if (this.currentProposal && this.currentProposal.status === 'pending') {
      if (Date.now() >= this.currentProposal.expiresAt) {
        this.currentProposal.status = 'lapsed';
      }
    }
  }

  acceptProposal(proposalId: string): boolean {
    return false;
  }

  rejectProposal(proposalId: string): boolean {
    return false;
  }

  getActiveSchedule(): TimetableBlock[] {
    return this.activeSchedule;
  }

  getProposal(): ScheduleProposal | null {
    this.checkLapse();
    return this.currentProposal;
  }

  markBlockComplete(blockId: string): void {
    // Scaffold fallback
  }
};

try {
  // @ts-ignore
  const imported = await import('../../src/plugins/timetable/TimetablePlugin');
  if (imported.TimetablePlugin) TimetablePlugin = imported.TimetablePlugin;
} catch {
  // Awaiting AI Studio implementation (RED state)
}

describe('ATDD: Timetable Plugin & Context Proposal Lifecycle (Step 3)', () => {
  let plugin: any;
  const initialSchedule: TimetableBlock[] = [
    {
      id: 'block_1',
      startTime: '09:00',
      endTime: '10:30',
      title: 'Morning Code Sprint',
      category: 'Work',
      status: 'SCHEDULED',
    },
    {
      id: 'block_2',
      startTime: '11:00',
      endTime: '12:00',
      title: 'Architecture Review',
      category: 'Work',
      status: 'SCHEDULED',
    },
  ];

  beforeEach(() => {
    vi.useFakeTimers();
    plugin = new TimetablePlugin({ initialSchedule });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Rule B1: Proposal Auto-Lapse Lifecycle (60s Window)', () => {
    const proposedBlocks: TimetableBlock[] = [
      {
        id: 'prop_block_1',
        startTime: '10:00',
        endTime: '11:30',
        title: 'Adjusted Focus Block',
        category: 'DeepWork',
        status: 'SCHEDULED',
        isAiProposed: true,
      },
    ];

    it('creates proposal in "pending" status with 60000ms TTL', () => {
      const proposal = plugin.proposeSchedule(proposedBlocks, 'Shifted for sleep recovery');

      expect(proposal.status).toBe('pending');
      expect(proposal.blocks).toEqual(proposedBlocks);
      expect(proposal.expiresAt - proposal.generatedAt).toBe(60000);
      expect(plugin.getActiveSchedule()).toEqual(initialSchedule); // Unaltered
    });

    it('transitions proposal to "lapsed" and preserves active schedule if unaccepted after 60s', () => {
      plugin.proposeSchedule(proposedBlocks, 'Optimized afternoon slots');

      // Advance time by 59 seconds (still pending)
      vi.advanceTimersByTime(59000);
      expect(plugin.getProposal()?.status).toBe('pending');
      expect(plugin.getActiveSchedule()).toEqual(initialSchedule);

      // Advance past 60s
      vi.advanceTimersByTime(2000);
      expect(plugin.getProposal()?.status).toBe('lapsed');
      expect(plugin.getActiveSchedule()).toEqual(initialSchedule); // Active schedule strictly untouched
    });

    it('overwrites active schedule and confirms state when user clicks Accept within 60s window', () => {
      const proposal = plugin.proposeSchedule(proposedBlocks, 'Accepted optimization');

      // User accepts at 25 seconds
      vi.advanceTimersByTime(25000);

      const accepted = plugin.acceptProposal(proposal.id);
      expect(accepted).toBe(true);

      const currentProposal = plugin.getProposal();
      expect(currentProposal?.status).toBe('accepted');
      expect(plugin.getActiveSchedule()).toEqual(proposedBlocks); // Overwrites active schedule
    });
  });

  describe('Bidirectional State Mutation into Inbound Pit', () => {
    it('dispatches an event into the Inbound Pit when a task/block is marked complete', () => {
      const pitDispatchSpy = vi.fn();
      const interactivePlugin = new TimetablePlugin({
        initialSchedule,
        onDispatchToPit: pitDispatchSpy,
      });

      interactivePlugin.markBlockComplete('block_1');

      expect(pitDispatchSpy).toHaveBeenCalledTimes(1);
      const dispatchedEvent = pitDispatchSpy.mock.calls[0][0];
      expect(dispatchedEvent).toMatchObject({
        sourcePluginId: 'timetable-plugin',
        priority: expect.stringMatching(/high|medium|low/),
        severity: expect.stringMatching(/info|warning/),
        payload: {
          action: 'block_completed',
          blockId: 'block_1',
        },
      });
    });
  });
});
