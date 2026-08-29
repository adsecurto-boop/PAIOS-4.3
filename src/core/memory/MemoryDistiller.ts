import { PAIOSStorage } from '../../storage';

export interface DistillationInput {
  userId?: string;
  sessionId?: string;
  journalText: string;
  moodScore?: number;
  completedTasksCount: number;
  blockersEncountered?: string[];
  keyLearnings?: string[];
  recordedAtMillis: number;
}

export interface LongTermMemoryRecord {
  id: string;
  distilledAtMillis: number;
  coreSummary: string;
  milestonesAchieved: string[];
  keyLearnings: string[];
  sentimentScore: number;
  immutabilityHash?: string;
}

export class MemoryDistiller {
  public static STORAGE_KEY = 'paios_longterm_memory';

  /**
   * Distills ephemeral journal thoughts and daily execution logs into structured, immutable long-term memory.
   */
  public static distillEphemeralToLongTerm(input: DistillationInput): LongTermMemoryRecord {
    const now = Date.now();
    const id = `mem_${now}_${Math.random().toString(36).substring(2, 7)}`;
    const journal = input.journalText || '';

    // 1. Build Core Summary
    let coreSummary = journal.trim();
    if (!coreSummary && input.completedTasksCount > 0) {
      coreSummary = `Completed ${input.completedTasksCount} planned focus tasks successfully.`;
    }

    // 2. Extract Milestones
    const milestonesAchieved: string[] = [];
    const sentences = journal
      .split(/(?<=[.!?\n])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);

    sentences.forEach((sentence) => {
      if (/(?:completed|shipped|achieved|finalized|delivered)\s+(.+)/i.test(sentence)) {
        milestonesAchieved.push(sentence);
      }
    });

    if (input.completedTasksCount > 0 && milestonesAchieved.length === 0) {
      milestonesAchieved.push(`Completed ${input.completedTasksCount} planned tasks`);
    }

    // 3. Extract Key Learnings
    const keyLearnings: string[] = [...(input.keyLearnings || [])];
    sentences.forEach((sentence) => {
      if (/learned(?: that)?\s+(.+)/i.test(sentence)) {
        if (!keyLearnings.includes(sentence)) {
          keyLearnings.push(sentence);
        }
      }
    });

    // 4. Generate Immutability Hash
    const rawContentToHash = `${id}|${coreSummary}|${now}`;
    let hash = 0;
    for (let i = 0; i < rawContentToHash.length; i++) {
      const char = rawContentToHash.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    const immutabilityHash = `sha256_${Math.abs(hash).toString(16)}_${now}`;

    const record: LongTermMemoryRecord = {
      id,
      distilledAtMillis: now,
      coreSummary,
      milestonesAchieved,
      keyLearnings,
      sentimentScore: input.moodScore ?? 5,
      immutabilityHash,
    };

    // 5. Permanent Persistence to Storage Key
    const existing = PAIOSStorage.getItem<LongTermMemoryRecord[]>(MemoryDistiller.STORAGE_KEY, []) || [];
    const updated = [record, ...existing];
    PAIOSStorage.setItem(MemoryDistiller.STORAGE_KEY, updated);

    return record;
  }

  /**
   * Retrieves all permanent distilled memories.
   */
  public static getLongTermMemories(): LongTermMemoryRecord[] {
    return PAIOSStorage.getItem<LongTermMemoryRecord[]>(MemoryDistiller.STORAGE_KEY, []) || [];
  }

  /**
   * Clears permanent distilled memories.
   */
  public static clearLongTermMemories(): void {
    PAIOSStorage.removeItem(MemoryDistiller.STORAGE_KEY);
  }
}

export default MemoryDistiller;
