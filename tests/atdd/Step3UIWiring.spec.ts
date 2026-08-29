/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PreContextBroker } from '../../src/core/broker/PreContextBroker';
import { TimetablePlugin } from '../../src/core/plugins/TimetablePlugin';
import { PAIOSStorage } from '../../src/storage';

describe('ATDD Integration Suite: Step 3 UI Wiring & End-to-End Event Contracts', () => {
  beforeEach(() => {
    PreContextBroker.clearAll();
    TimetablePlugin.clear();
    PAIOSStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('triggers Rule B2 Force Sync from header trigger and emits precontext_pit_synced event', async () => {
    const eventSpy = vi.fn();
    window.addEventListener('precontext_pit_synced', eventSpy);

    // Enqueue items into inbound broker
    PreContextBroker.enqueuePIT({
      source_plugin_id: 'user_action_header',
      priority: 'high',
      severity: 'info',
      payload: { action: 'FORCE_SYNC_CLICK' },
    });

    // Execute force sync call
    const result = await PreContextBroker.triggerForceSync();

    expect(result.success).toBe(true);
    expect(result.count).toBe(1);

    expect(eventSpy).toHaveBeenCalledTimes(1);
    const event = eventSpy.mock.calls[0][0] as CustomEvent;
    expect(event.detail.count).toBe(1);

    window.removeEventListener('precontext_pit_synced', eventSpy);
  });

  it('buffers multiple PIT events and flushes them together on force sync', async () => {
    PreContextBroker.enqueuePIT({ source_plugin_id: 'p1', payload: { id: 1 } });
    PreContextBroker.enqueuePIT({ source_plugin_id: 'p2', payload: { id: 2 } });

    expect(PreContextBroker.getBufferCount()).toBe(2);

    const result = await PreContextBroker.triggerForceSync();
    expect(result.count).toBe(2);
    expect(PreContextBroker.getBufferCount()).toBe(0);
  });

  it('manages 60s proposal banner lifecycle: create -> emit -> accept -> timetable update', () => {
    const proposalEventSpy = vi.fn();
    window.addEventListener('timetable_proposal_updated', proposalEventSpy);

    // 1. Create 60s proposal
    const proposal = TimetablePlugin.createProposal({
      activity: 'ISTQB Active Recall Review',
      category: 'Study',
      start: '11:00',
      end: '11:45',
      reason: 'Rule B1 Context Proposal',
    });

    expect(proposalEventSpy).toHaveBeenCalled();
    expect(TimetablePlugin.getActiveProposal()).not.toBeNull();

    // 2. Accept proposal via UI action
    const accepted = TimetablePlugin.acceptProposal(proposal.id);
    expect(accepted).not.toBeNull();
    expect(accepted!.status).toBe('accepted');

    // 3. Verify timetable updated with proposal block
    const activeTimetable = PAIOSStorage.getAdaptiveTimetable();
    expect(activeTimetable!.blocks.some((b) => b.activity === 'ISTQB Active Recall Review')).toBe(true);

    window.removeEventListener('timetable_proposal_updated', proposalEventSpy);
  });

  it('manages proposal declination lifecycle: create -> decline -> active proposal cleared', () => {
    const proposal = TimetablePlugin.createProposal({
      activity: 'Declined Session',
      start: '12:00',
      end: '12:30',
      reason: 'To be declined',
    });

    const rejected = TimetablePlugin.rejectProposal(proposal.id);
    expect(rejected!.status).toBe('rejected');
    expect(TimetablePlugin.getActiveProposal()).toBeNull();
  });

  it('calculates proposal countdown seconds remaining accurately', () => {
    const proposal = TimetablePlugin.createProposal({
      activity: 'Timed Session',
      start: '13:00',
      end: '13:30',
      reason: 'Countdown test',
    });

    const secondsLeft = Math.max(0, Math.ceil((proposal.expiresAtMillis - Date.now()) / 1000));
    expect(secondsLeft).toBeGreaterThan(0);
    expect(secondsLeft).toBeLessThanOrEqual(60);
  });

  it('ensures precontext_pit_synced events trigger reactive storage updates without infinite render loops', async () => {
    let reRenderCount = 0;
    const renderHandler = () => {
      reRenderCount++;
    };

    window.addEventListener('precontext_pit_synced', renderHandler);

    PreContextBroker.enqueuePIT({
      source_plugin_id: 'loop_safety_test',
      payload: { data: 'test' },
    });

    await PreContextBroker.triggerForceSync();

    expect(reRenderCount).toBe(1); // Fired exactly once per sync trigger, no infinite loops

    window.removeEventListener('precontext_pit_synced', renderHandler);
  });
});
