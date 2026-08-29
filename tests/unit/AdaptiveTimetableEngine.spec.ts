/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { PAIOSStorage } from '../../src/storage';
import { AdaptiveTimetableResponse } from '../../src/types';

describe('Unit Test: AdaptiveTimetable Vault Engine', () => {
  beforeEach(() => {
    PAIOSStorage.clear();
  });

  it('saves and retrieves adaptive timetable response', () => {
    const timetable: AdaptiveTimetableResponse = {
      dateString: '2026-08-29',
      generatedAtTimeStr: '10:00',
      explanation: 'Optimized schedule for ISTQB study',
      blocks: [
        {
          id: 'b1',
          start: '10:15',
          end: '11:00',
          duration_minutes: 45,
          activity: 'ISTQB Active Recall',
          category: 'Study',
          priority: 'HIGH',
          reason: 'Exam prep',
          status: 'planned',
        },
      ],
    };

    PAIOSStorage.saveAdaptiveTimetable(timetable);
    const retrieved = PAIOSStorage.getAdaptiveTimetable();

    expect(retrieved).not.toBeNull();
    expect(retrieved!.blocks).toHaveLength(1);
    expect(retrieved!.blocks[0].activity).toBe('ISTQB Active Recall');
  });

  it('updates timetable block status and logs completion to timeline', () => {
    const timetable: AdaptiveTimetableResponse = {
      dateString: '2026-08-29',
      generatedAtTimeStr: '10:00',
      explanation: 'Test',
      blocks: [
        {
          id: 'b2',
          start: '11:00',
          end: '11:30',
          duration_minutes: 30,
          activity: 'Playwright Testing',
          category: 'Testing',
          priority: 'HIGH',
          reason: 'Test',
          status: 'planned',
        },
      ],
    };

    PAIOSStorage.saveAdaptiveTimetable(timetable);
    PAIOSStorage.updateTimetableBlockStatus('b2', 'completed');

    const updated = PAIOSStorage.getAdaptiveTimetable();
    expect(updated!.blocks[0].status).toBe('completed');

    // Verify logged to timeline
    const timeline = PAIOSStorage.getTimelineEntries();
    expect(timeline.some((e) => e.title.includes('Playwright Testing'))).toBe(true);
  });

  it('transitions timetable block status to deferred', () => {
    const timetable: AdaptiveTimetableResponse = {
      dateString: '2026-08-29',
      generatedAtTimeStr: '10:00',
      explanation: 'Test',
      blocks: [
        {
          id: 'b_defer',
          start: '14:00',
          end: '14:30',
          duration_minutes: 30,
          activity: 'Deferred Block',
          category: 'Work',
          priority: 'FLEXIBLE',
          reason: 'Schedule conflict',
          status: 'planned',
        },
      ],
    };

    PAIOSStorage.saveAdaptiveTimetable(timetable);
    PAIOSStorage.updateTimetableBlockStatus('b_defer', 'deferred');

    const updated = PAIOSStorage.getAdaptiveTimetable();
    expect(updated!.blocks[0].status).toBe('deferred');
  });

  it('transitions timetable block status to in_progress', () => {
    const timetable: AdaptiveTimetableResponse = {
      dateString: '2026-08-29',
      generatedAtTimeStr: '10:00',
      explanation: 'Test',
      blocks: [
        {
          id: 'b_progress',
          start: '15:00',
          end: '15:30',
          duration_minutes: 30,
          activity: 'In Progress Block',
          category: 'Work',
          priority: 'HIGH',
          reason: 'Active session',
          status: 'planned',
        },
      ],
    };

    PAIOSStorage.saveAdaptiveTimetable(timetable);
    PAIOSStorage.updateTimetableBlockStatus('b_progress', 'in_progress');

    const updated = PAIOSStorage.getAdaptiveTimetable();
    expect(updated!.blocks[0].status).toBe('in_progress');
  });

  it('deletes timetable block from current schedule', () => {
    const timetable: AdaptiveTimetableResponse = {
      dateString: '2026-08-29',
      generatedAtTimeStr: '10:00',
      explanation: 'Test',
      blocks: [
        {
          id: 'b3',
          start: '12:00',
          end: '12:30',
          duration_minutes: 30,
          activity: 'Delete Me',
          category: 'Personal',
          priority: 'OPTIONAL',
          reason: 'Test',
          status: 'planned',
        },
      ],
    };

    PAIOSStorage.saveAdaptiveTimetable(timetable);
    PAIOSStorage.deleteTimetableBlock('b3');

    const updated = PAIOSStorage.getAdaptiveTimetable();
    expect(updated!.blocks).toHaveLength(0);
  });

  it('generates rich user context string for AI prompt grounding', () => {
    const contextStr = PAIOSStorage.getUserContextString();
    expect(contextStr).toBeDefined();
    expect(contextStr).toContain('CURRENT LOCAL TIME & DATE METADATA');
    expect(contextStr).toContain('USER LONG-TERM GOALS');
  });
});
