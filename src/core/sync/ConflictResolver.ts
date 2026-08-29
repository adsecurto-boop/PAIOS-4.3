export interface ConflictOptions {
  localVersion?: number;
  remoteVersion?: number;
  localUpdatedAt?: number;
  remoteUpdatedAt?: number;
  storageKey?: string;
}

export class ConflictResolver {
  private static applyingRemoteUpdate = false;

  /**
   * Returns whether the system is currently applying an inbound remote update.
   */
  static isApplyingRemoteUpdate(): boolean {
    return this.applyingRemoteUpdate;
  }

  /**
   * Sets the applying remote update flag.
   */
  static setApplyingRemoteUpdate(val: boolean): void {
    this.applyingRemoteUpdate = val;
  }

  /**
   * Executes an async operation with the remote update lock engaged.
   */
  static async withRemoteUpdateLock<T>(fn: () => T | Promise<T>): Promise<T> {
    this.applyingRemoteUpdate = true;
    try {
      return await fn();
    } finally {
      this.applyingRemoteUpdate = false;
    }
  }

  /**
   * Alias for resolveConflict.
   */
  static resolve<T = any>(localData: T, remoteData: T, options: ConflictOptions = {}): T {
    return this.resolveConflict(localData, remoteData, options);
  }

  /**
   * Deterministically resolves sync conflicts between local and remote state snapshots.
   *
   * Rules:
   * 1. Absolute Protection for User Goals ('paios_goals'): Preserves local goals and merges new remote goals without loss.
   * 2. Version Dominance: Higher version number takes precedence.
   * 3. Millisecond LWW: Higher updated_at timestamp wins when versions are equal.
   * 4. Non-Conflicting Dictionary Merge: Merges distinct object keys if both sides are plain objects.
   */
  static resolveConflict<T = any>(localData: T, remoteData: T, options: ConflictOptions = {}): T {
    const {
      localVersion = 1,
      remoteVersion = 1,
      localUpdatedAt = 0,
      remoteUpdatedAt = 0,
      storageKey,
    } = options;

    // Rule 1: Absolute protection for hard-stored user goals ('paios_goals')
    if (storageKey === 'paios_goals') {
      return this.resolveGoalsConflict(localData, remoteData) as unknown as T;
    }

    // Handle null/undefined primitives
    if (localData === undefined || localData === null) return remoteData;
    if (remoteData === undefined || remoteData === null) return localData;

    // Rule 2: Version Dominance
    if (remoteVersion > localVersion) {
      return remoteData;
    }
    if (localVersion > remoteVersion) {
      return localData;
    }

    // Rule 3: Millisecond Last-Write-Wins (LWW) Tiebreaking (when versions match)
    if (remoteUpdatedAt > localUpdatedAt) {
      return remoteData;
    }
    if (localUpdatedAt > remoteUpdatedAt) {
      return localData;
    }

    // Rule 4: Non-Conflicting Dictionary Merge for plain objects
    if (
      typeof localData === 'object' &&
      typeof remoteData === 'object' &&
      !Array.isArray(localData) &&
      !Array.isArray(remoteData)
    ) {
      return {
        ...remoteData,
        ...localData,
      } as T;
    }

    // Default fallback: Local state wins
    return localData;
  }

  /**
   * Special protection rule for hard-stored user goals ('paios_goals').
   * Merges local and remote goals immutably by goal ID without deleting local goals.
   */
  private static resolveGoalsConflict(localGoals: any, remoteGoals: any): any[] {
    const localArr = Array.isArray(localGoals) ? localGoals : [];
    const remoteArr = Array.isArray(remoteGoals) ? remoteGoals : [];

    const mergedMap = new Map<string, any>();

    // 1. Add remote goals
    remoteArr.forEach((goal) => {
      if (goal && (goal.id || goal.title)) {
        const id = goal.id || `goal_remote_${goal.title}`;
        mergedMap.set(id, goal);
      }
    });

    // 2. Add/overwrite with local goals (Local goals take precedence and are strictly preserved)
    localArr.forEach((goal) => {
      if (goal && (goal.id || goal.title)) {
        const id = goal.id || `goal_local_${goal.title}`;
        mergedMap.set(id, goal);
      }
    });

    return Array.from(mergedMap.values());
  }
}

export default ConflictResolver;
