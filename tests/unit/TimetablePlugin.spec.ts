/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TimetablePlugin } from '../../src/core/plugins/TimetablePlugin';
import { PAIOSStorage } from '../../src/storage';

describe('Unit Test: TimetablePlugin Rule B1 60s Proposal Lifecycle', () => {
  beforeEach(() => {
    TimetablePlugin.clear();
    PAIOSStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a 60s contextual schedule proposal in pending state', () => {
    const proposal = TimetablePlugin.createProposal({
      activity: 'ISTQB Mock Exam Review',
      category: 'Study',
      start: '14:00',
      end: '14:45',
      reason: 'Optimal study window identified based on recent focus metrics.',
    });

    expect(proposal.id).toContain('prop_');
    expect(proposal.status).toBe('pending');
    expect(proposal.expiresAtMillis).toBeGreaterThan(proposal.createdAtMillis);
    expect(proposal.expiresAtMillis - proposal.createdAtMillis).toBe(60000); // 60s
  });

  it('creates proposal with custom goal and priority properties', () => {
    const proposal = TimetablePlugin.createProposal({
      activity: 'Playwright Testing',
      category: 'Testing',
      start: '10:00',
      end: '11:00',
      reason: 'Goal priority',
      goal: 'Master Playwright',
      priority: 'HIGH',
    });

    expect(proposal.goal).toBe('Master Playwright');
    expect(proposal.priority).toBe('HIGH');
  });

  it('accepts a pending proposal and applies block to active timetable', () => {
    const proposal = TimetablePlugin.createProposal({
      activity: 'Playwright Automation Sprint',
      start: '15:00',
      end: '16:00',
      reason: 'Deep coding session',
    });

    const accepted = TimetablePlugin.acceptProposal(proposal.id);

    expect(accepted).not.toBeNull();
    expect(accepted!.status).toBe('accepted');

    const activeTimetable = PAIOSStorage.getAdaptiveTimetable();
    expect(activeTimetable).not.toBeNull();
    expect(activeTimetable!.blocks.some((b) => b.activity === 'Playwright Automation Sprint')).toBe(true);
  });

  it('rejects a pending proposal without modifying active timetable', () => {
    const proposal = TimetablePlugin.createProposal({
      activity: 'Optional Break',
      start: '16:30',
      end: '17:00',
      reason: 'Relaxation',
    });

    const rejected = TimetablePlugin.rejectProposal(proposal.id);

    expect(rejected).not.toBeNull();
    expect(rejected!.status).toBe('rejected');

    const activeProposal = TimetablePlugin.getActiveProposal();
    expect(activeProposal).toBeNull();
  });

  it('returns proposal list with newest proposals first', () => {
    TimetablePlugin.createProposal({ activity: 'First', start: '09:00', end: '09:30', reason: 'A' });
    TimetablePlugin.createProposal({ activity: 'Second', start: '10:00', end: '10:30', reason: 'B' });

    const list = TimetablePlugin.getProposals();
    expect(list).toHaveLength(2);
    expect(list[0].activity).toBe('Second');
  });

  it('Rule B1 Auto-Lapse: lapses pending proposal after 60s expiry window', () => {
    const proposal = TimetablePlugin.createProposal({
      activity: 'Expired Focus Session',
      start: '18:00',
      end: '18:30',
      reason: 'Time sensitive proposal',
    });

    // Mock Date.now to 61s in the future
    const originalNow = Date.now;
    vi.spyOn(Date, 'now').mockReturnValue(proposal.expiresAtMillis + 1000);

    const proposals = TimetablePlugin.checkProposalLapse();
    const target = proposals.find((p) => p.id === proposal.id);

    expect(target!.status).toBe('lapsed');
    expect(TimetablePlugin.getActiveProposal()).toBeNull();

    Date.now = originalNow;
  });

  it('clears all proposals on clear()', () => {
    TimetablePlugin.createProposal({ activity: 'Temp', start: '09:00', end: '09:30', reason: 'Test' });
    expect(TimetablePlugin.getProposals()).toHaveLength(1);

    TimetablePlugin.clear();
    expect(TimetablePlugin.getProposals()).toEqual([]);
  });

  it('dispatches timetable_proposal_updated CustomEvent on creation and state changes', () => {
    const listener = vi.fn();
    window.addEventListener('timetable_proposal_updated', listener);

    const prop = TimetablePlugin.createProposal({
      activity: 'Test Activity',
      start: '10:00',
      end: '10:30',
      reason: 'Test',
    });

    expect(listener).toHaveBeenCalled();

    TimetablePlugin.acceptProposal(prop.id);
    expect(listener).toHaveBeenCalledTimes(2);

    window.removeEventListener('timetable_proposal_updated', listener);
  });
});
