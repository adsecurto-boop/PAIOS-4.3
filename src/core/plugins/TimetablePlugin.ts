import { PAIOSStorage } from '../../storage';
import { PreContextBroker } from '../broker/PreContextBroker';

export interface TimetableBlock {
  id: string;
  startTime?: string;
  endTime?: string;
  start?: string;
  end?: string;
  title?: string;
  activity?: string;
  category?: string;
  status?: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED' | 'planned';
  isAiProposed?: boolean;
  duration_minutes?: number;
  goal?: string;
  priority?: string;
  reason?: string;
}

export interface ScheduleProposal {
  id: string;
  generatedAt: number;
  expiresAt: number;
  status: 'pending' | 'accepted' | 'rejected' | 'lapsed';
  blocks: TimetableBlock[];
  explanation: string;
}

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

export interface TimetablePluginOptions {
  initialSchedule?: TimetableBlock[];
  onDispatchToPit?: (event: any) => void;
}

export class TimetablePlugin {
  private static STORAGE_KEY = 'paios_timetable_proposals';

  // Instance State
  private activeSchedule: TimetableBlock[] = [];
  private currentProposal: ScheduleProposal | null = null;
  private inboundPitDispatcher: ((event: any) => void) | null = null;

  constructor(options?: TimetablePluginOptions) {
    this.activeSchedule = options?.initialSchedule ? [...options.initialSchedule] : [];
    this.inboundPitDispatcher = options?.onDispatchToPit || null;
  }

  // --- Instance Methods ---

  public proposeSchedule(blocks: TimetableBlock[], explanation = ''): ScheduleProposal {
    const now = Date.now();
    this.currentProposal = {
      id: `prop_${now}_${Math.random().toString(36).substring(2, 7)}`,
      generatedAt: now,
      expiresAt: now + 60000,
      status: 'pending',
      blocks: [...blocks],
      explanation,
    };
    return this.currentProposal;
  }

  public checkLapse(): void {
    if (this.currentProposal && this.currentProposal.status === 'pending') {
      if (Date.now() >= this.currentProposal.expiresAt) {
        this.currentProposal.status = 'lapsed';
      }
    }
  }

  public acceptProposal(proposalId: string): boolean {
    this.checkLapse();
    if (
      this.currentProposal &&
      this.currentProposal.id === proposalId &&
      this.currentProposal.status === 'pending'
    ) {
      this.currentProposal.status = 'accepted';
      this.activeSchedule = [...this.currentProposal.blocks];
      return true;
    }
    return false;
  }

  public rejectProposal(proposalId: string): boolean {
    this.checkLapse();
    if (
      this.currentProposal &&
      this.currentProposal.id === proposalId &&
      this.currentProposal.status === 'pending'
    ) {
      this.currentProposal.status = 'rejected';
      return true;
    }
    return false;
  }

  public getActiveSchedule(): TimetableBlock[] {
    return this.activeSchedule;
  }

  public getProposal(): ScheduleProposal | null {
    this.checkLapse();
    return this.currentProposal;
  }

  public markBlockComplete(blockId: string): void {
    const block = this.activeSchedule.find((b) => b.id === blockId);
    if (block) {
      block.status = 'COMPLETED';
    }

    if (this.inboundPitDispatcher) {
      this.inboundPitDispatcher({
        sourcePluginId: 'timetable-plugin',
        priority: 'medium',
        severity: 'info',
        payload: {
          action: 'block_completed',
          blockId,
        },
      });
    }
  }

  // --- Static Methods ---

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
      expiresAtMillis: now + 60000,
      status: 'pending',
    };

    const list = this.getProposals();
    list.unshift(proposal);
    PAIOSStorage.setItem(this.STORAGE_KEY, list);

    PreContextBroker.enqueuePIT({
      source_plugin_id: 'timetable_plugin',
      priority: 'high',
      severity: 'warning',
      payload: { action: 'PROPOSAL_CREATED', proposalId: proposal.id, activity: proposal.activity },
    });

    this.notifyUpdate();
    return proposal;
  }

  static acceptProposal(proposalId: string): TimetableProposal | null {
    const list = this.getProposals();
    const proposal = list.find((p) => p.id === proposalId);

    if (!proposal || proposal.status !== 'pending') {
      return null;
    }

    proposal.status = 'accepted';
    PAIOSStorage.setItem(this.STORAGE_KEY, list);

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

  static getActiveProposal(): TimetableProposal | null {
    this.checkProposalLapse();
    const list = this.getProposals();
    return list.find((p) => p.status === 'pending') || null;
  }

  static getProposals(): TimetableProposal[] {
    return PAIOSStorage.getItem<TimetableProposal[]>(this.STORAGE_KEY, []) || [];
  }

  private static notifyUpdate(): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('timetable_proposal_updated', {
          detail: { active: this.getActiveProposal(), timestamp: Date.now() },
        })
      );
    }
  }

  static clear(): void {
    PAIOSStorage.removeItem(this.STORAGE_KEY);
  }
}

export default TimetablePlugin;
