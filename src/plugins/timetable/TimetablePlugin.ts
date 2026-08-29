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

export interface TimetablePluginOptions {
  initialSchedule?: TimetableBlock[];
  onDispatchToPit?: (event: any) => void;
}

export class TimetablePlugin {
  private activeSchedule: TimetableBlock[] = [];
  private currentProposal: ScheduleProposal | null = null;
  private inboundPitDispatcher: ((event: any) => void) | null = null;

  constructor(options?: TimetablePluginOptions) {
    this.activeSchedule = options?.initialSchedule ? [...options.initialSchedule] : [];
    this.inboundPitDispatcher = options?.onDispatchToPit || null;
  }

  public proposeSchedule(blocks: TimetableBlock[], explanation = ''): ScheduleProposal {
    const now = Date.now();
    this.currentProposal = {
      id: `prop_${now}_${Math.random().toString(36).substring(2, 7)}`,
      generatedAt: now,
      expiresAt: now + 60000, // 60s TTL (Rule B1)
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
}
