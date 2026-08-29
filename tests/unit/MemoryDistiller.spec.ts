import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PAIOSStorage } from '../../src/storage';

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

let MemoryDistiller: any = class MockMemoryDistiller {
  static STORAGE_KEY = 'paios_longterm_memory';

  static distillEphemeralToLongTerm(input: DistillationInput): LongTermMemoryRecord {
    return {
      id: `mem_${Date.now()}`,
      distilledAtMillis: Date.now(),
      coreSummary: '',
      milestonesAchieved: [],
      keyLearnings: [],
      sentimentScore: 5,
    };
  }

  static getLongTermMemories(): LongTermMemoryRecord[] {
    return PAIOSStorage.getItem<LongTermMemoryRecord[]>(MockMemoryDistiller.STORAGE_KEY, []) || [];
  }

  static clearLongTermMemories(): void {
    PAIOSStorage.removeItem(MockMemoryDistiller.STORAGE_KEY);
  }
};

try {
  // @ts-ignore
  const imported = await import('../../src/core/memory/MemoryDistiller');
  if (imported.MemoryDistiller) MemoryDistiller = imported.MemoryDistiller;
} catch {
  // Awaiting AI Studio implementation (RED state)
}

describe('Unit Test: Conversational Memory Distillation & Long-Term Persistence (Step 4)', () => {
  beforeEach(() => {
    PAIOSStorage.clear();
    MemoryDistiller.clearLongTermMemories();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const sampleEphemeralInput: DistillationInput = {
    userId: 'usr_alex',
    sessionId: 'session_2026_08_29',
    journalText:
      'Completed the PAIOS 5.0 Step 3 ATDD test suite. Learned that SQLite WAL mode requires busy_timeout handler when tested under high concurrency.',
    moodScore: 9,
    completedTasksCount: 4,
    blockersEncountered: ['SQLite WAL concurrent write contention'],
    keyLearnings: ['Set SQLite pragma busy_timeout to 5000ms for thread safety'],
    recordedAtMillis: 1787900000000,
  };

  it('distills ephemeral journal reflection into structured immutable long-term memory record', () => {
    const memory = MemoryDistiller.distillEphemeralToLongTerm(sampleEphemeralInput);

    expect(memory).toBeDefined();
    expect(memory.id).toMatch(/^mem_/);
    expect(memory.coreSummary).toContain('PAIOS 5.0 Step 3 ATDD');
    expect(memory.keyLearnings).toEqual(
      expect.arrayContaining([expect.stringMatching(/busy_timeout/i)])
    );
    expect(memory.milestonesAchieved.length).toBeGreaterThanOrEqual(1);
    expect(memory.sentimentScore).toBe(9);
  });

  it('persists distilled memories to permanent storage key "paios_longterm_memory"', () => {
    MemoryDistiller.distillEphemeralToLongTerm(sampleEphemeralInput);

    const storedMemories = MemoryDistiller.getLongTermMemories();
    expect(storedMemories).toHaveLength(1);
    expect(storedMemories[0].coreSummary).toContain('Step 3');
  });

  it('guarantees distilled long-term memories survive when ephemeral context cache is completely purged', () => {
    // 1. Distill memory from ephemeral event
    MemoryDistiller.distillEphemeralToLongTerm(sampleEphemeralInput);

    // 2. Simulate 48h ephemeral context cache purge cycle
    PAIOSStorage.removeItem('paios_context_cache');
    PAIOSStorage.removeItem('paios_precontext_pit');

    // 3. Assert long-term memory remains intact and retrievable
    const preservedMemories = MemoryDistiller.getLongTermMemories();
    expect(preservedMemories).toHaveLength(1);
    expect(preservedMemories[0].coreSummary).toBeTruthy();
  });
});
