import { PAIOSStorage } from '../../storage';
import { PreContextBroker } from '../broker/PreContextBroker';

export interface TimetableProposal {
  id: string;
  activity: string;
  category: string;
  start: string;
  end: string;
  reason: string;
  goal?: string;
  priority?: string;
  createdAtMillis: number;
  expiresAtMillis: number;
  status: 'pending' | 'accepted' | 'rejected' | 'lapsed';
}

export class TimetablePlugin {
  private static STORAGE_KEY = 'paios_timetable_proposals';

  /**
   * Rule B1: Creates a 60s Contextual Schedule Proposal.
   * Auto-lapses if not accepted within 60 seconds.
   */
  static createProposal(params: {
    activity: string;
    category?: string;
    start: string;
    end: string;
    reason: string;
    goal?: string;
    priority?: string;
  }): TimetableProposal {
    const now = Date.now();
    const proposal: TimetableProposal = {
      id: `prop_${now}_${Math.random().toString(36).substring(2, 6)}`,
      activity: params.activity,
      category: params.category || 'Work',
      start: params.start,
      end: params.end,
      reason: params.reason,
      goal: params.goal,
      priority: params.priority || 'HIGH',
      createdAtMillis: now,
      expiresAtMillis: now + 60000, // 60s countdown
      status: 'pending',
    };

    const list = this.getProposals();
    list.unshift(proposal);
    PAIOSStorage.setItem(this.STORAGE_KEY, list);

    // Dispatch PreContext PIT Event
    PreContextBroker.enqueuePIT({
      source_plugin_id: 'timetable_plugin',
      priority: 'high',
      severity: 'warning',
      payload: { action: 'PROPOSAL_CREATED', proposalId: proposal.id, activity: proposal.activity },
    });

    this.notifyUpdate();
    return proposal;
  }

  /**
   * Accepts a pending proposal and applies it to the timetable.
   */
  static acceptProposal(proposalId: string): TimetableProposal | null {
    const list = this.getProposals();
    const proposal = list.find((p) => p.id === proposalId);

    if (!proposal || proposal.status !== 'pending') {
      return null;
    }

    proposal.status = 'accepted';
    PAIOSStorage.setItem(this.STORAGE_KEY, list);

    // Apply block to active timetable
    const currentTimetable = PAIOSStorage.getAdaptiveTimetable() || {
      dateString: new Date().toISOString().split('T')[0],
      generatedAtTimeStr: '10:00',
      explanation: 'Updated via Timetable Plugin Proposal Accept',
      blocks: [],
    };

    currentTimetable.blocks.unshift({
      id: `block_${Date.now()}`,
      start: proposal.start,
      end: proposal.end,
      duration_minutes: 30,
      activity: proposal.activity,
      category: proposal.category,
      goal: proposal.goal,
      priority: (proposal.priority as any) || 'HIGH',
      reason: proposal.reason,
      status: 'planned',
    });

    PAIOSStorage.saveAdaptiveTimetable(currentTimetable);
    this.notifyUpdate();
    return proposal;
  }

  /**
   * Rejects a pending proposal.
   */
  static rejectProposal(proposalId: string): TimetableProposal | null {
    const list = this.getProposals();
    const proposal = list.find((p) => p.id === proposalId);

    if (!proposal || proposal.status !== 'pending') {
      return null;
    }

    proposal.status = 'rejected';
    PAIOSStorage.setItem(this.STORAGE_KEY, list);
    this.notifyUpdate();
    return proposal;
  }

  /**
   * Rule B1 Auto-Lapse Engine: Checks and lapses pending proposals whose 60s window has expired.
   */
  static checkProposalLapse(): TimetableProposal[] {
    const now = Date.now();
    const list = this.getProposals();
    let updated = false;

    list.forEach((p) => {
      if (p.status === 'pending' && now >= p.expiresAtMillis) {
        p.status = 'lapsed';
        updated = true;
      }
    });

    if (updated) {
      PAIOSStorage.setItem(this.STORAGE_KEY, list);
      this.notifyUpdate();
    }

    return list;
  }

  /**
   * Retrieves current active/pending proposal if available.
   */
  static getActiveProposal(): TimetableProposal | null {
    this.checkProposalLapse();
    const list = this.getProposals();
    return list.find((p) => p.status === 'pending') || null;
  }

  /**
   * Retrieves all proposals list.
   */
  static getProposals(): TimetableProposal[] {
    return PAIOSStorage.getItem<TimetableProposal[]>(this.STORAGE_KEY, []) || [];
  }

  /**
   * Dispatches CustomEvent for UI notifications.
   */
  private static notifyUpdate(): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('timetable_proposal_updated', {
          detail: { active: this.getActiveProposal(), timestamp: Date.now() },
        })
      );
    }
  }

  /**
   * Resets proposal store.
   */
  static clear(): void {
    PAIOSStorage.removeItem(this.STORAGE_KEY);
  }
}

export default TimetablePlugin;
