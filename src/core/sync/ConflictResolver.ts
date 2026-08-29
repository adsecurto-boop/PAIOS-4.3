export interface SyncStorageRecord<T = any> {
  key: string;
  payload: T;
  version: number;
  updatedAt: number;
  clientDeviceId?: string;
}

export interface ConflictResolutionResult<T = any> {
  resolvedPayload: T;
  winner: 'local' | 'remote' | 'merged';
  resolvedVersion: number;
  resolvedUpdatedAt: number;
}

export class ConflictResolver {
  // Loop prevention flag to stop circular sync-echo writes
  private static _isApplyingRemoteUpdate = false;

  public static isApplyingRemoteUpdate(): boolean {
    return this._isApplyingRemoteUpdate;
  }

  public static setApplyingRemoteUpdate(value: boolean): void {
    this._isApplyingRemoteUpdate = value;
  }

  public static async withRemoteUpdateLock<R>(fn: () => Promise<R> | R): Promise<R> {
    this._isApplyingRemoteUpdate = true;
    try {
      return await fn();
    } finally {
      this._isApplyingRemoteUpdate = false;
    }
  }

  /**
   * Deterministically resolves conflict between local and remote storage records.
   */
  public static resolve<T = any>(
    localRecord: SyncStorageRecord<T> | null | undefined,
    remoteRecord: SyncStorageRecord<T> | null | undefined
  ): ConflictResolutionResult<T> {
    if (!localRecord && remoteRecord) {
      return {
        resolvedPayload: remoteRecord.payload,
        winner: 'remote',
        resolvedVersion: remoteRecord.version,
        resolvedUpdatedAt: remoteRecord.updatedAt,
      };
    }

    if (localRecord && !remoteRecord) {
      return {
        resolvedPayload: localRecord.payload,
        winner: 'local',
        resolvedVersion: localRecord.version,
        resolvedUpdatedAt: localRecord.updatedAt,
      };
    }

    if (!localRecord && !remoteRecord) {
      throw new Error('Cannot resolve conflict between two null records.');
    }

    const local = localRecord!;
    const remote = remoteRecord!;

    // 1. Critical Invariant: Hard-stored goals non-destructive protection
    if (local.key === 'paios_goals' || local.key.includes('goal')) {
      return this.resolveGoals(local, remote);
    }

    // 2. Version hierarchy resolution
    if (remote.version > local.version) {
      return {
        resolvedPayload: remote.payload,
        winner: 'remote',
        resolvedVersion: remote.version,
        resolvedUpdatedAt: remote.updatedAt,
      };
    }

    if (local.version > remote.version) {
      return {
        resolvedPayload: local.payload,
        winner: 'local',
        resolvedVersion: local.version,
        resolvedUpdatedAt: local.updatedAt,
      };
    }

    // 3. Same version -> Merge non-conflicting dictionary keys if object
    if (
      local.payload &&
      remote.payload &&
      typeof local.payload === 'object' &&
      typeof remote.payload === 'object' &&
      !Array.isArray(local.payload) &&
      !Array.isArray(remote.payload)
    ) {
      // Merge non-conflicting dictionary keys (e.g. separate plugin keys)
      const mergedPayload: any = { ...local.payload };
      for (const [k, v] of Object.entries(remote.payload)) {
        if (mergedPayload[k] === undefined || remote.updatedAt >= local.updatedAt) {
          mergedPayload[k] = v;
        }
      }

      return {
        resolvedPayload: mergedPayload,
        winner: 'merged',
        resolvedVersion: Math.max(local.version, remote.version) + 1,
        resolvedUpdatedAt: Math.max(local.updatedAt, remote.updatedAt),
      };
    }

    // 4. Timestamp tie-break
    if (remote.updatedAt > local.updatedAt) {
      return {
        resolvedPayload: remote.payload,
        winner: 'remote',
        resolvedVersion: remote.version,
        resolvedUpdatedAt: remote.updatedAt,
      };
    }

    return {
      resolvedPayload: local.payload,
      winner: 'local',
      resolvedVersion: local.version,
      resolvedUpdatedAt: local.updatedAt,
    };
  }

  /**
   * Special merger for goals to ensure permanent goals are never overwritten by empty/partial transient state.
   */
  private static resolveGoals<T = any>(
    local: SyncStorageRecord<T>,
    remote: SyncStorageRecord<T>
  ): ConflictResolutionResult<T> {
    const localGoals: any[] = Array.isArray(local.payload) ? local.payload : [];
    const remoteGoals: any[] = Array.isArray(remote.payload) ? remote.payload : [];

    const goalMap = new Map<string, any>();

    // Index all local goals first
    for (const g of localGoals) {
      const id = g.id || g.title;
      if (id) goalMap.set(id, g);
    }

    // Merge or update with remote goals without deleting existing hard-stored goals
    for (const g of remoteGoals) {
      const id = g.id || g.title;
      if (!id) continue;
      if (!goalMap.has(id)) {
        goalMap.set(id, g);
      } else {
        const existing = goalMap.get(id);
        const mergedSubprojects = this.mergeSubprojects(existing.subprojects, g.subprojects);
        goalMap.set(id, {
          ...existing,
          ...g,
          subprojects: mergedSubprojects,
        });
      }
    }

    const mergedList = Array.from(goalMap.values());
    const winner =
      remote.updatedAt > local.updatedAt
        ? 'merged'
        : localGoals.length >= remoteGoals.length
        ? 'local'
        : 'remote';

    return {
      resolvedPayload: mergedList as any,
      winner,
      resolvedVersion: Math.max(local.version, remote.version) + 1,
      resolvedUpdatedAt: Math.max(local.updatedAt, remote.updatedAt),
    };
  }

  private static mergeSubprojects(localSubs?: any[], remoteSubs?: any[]): any[] {
    const subsMap = new Map<string, any>();
    for (const s of localSubs || []) {
      const id = s.id || s.title;
      if (id) subsMap.set(id, s);
    }
    for (const s of remoteSubs || []) {
      const id = s.id || s.title;
      if (!id) continue;
      if (!subsMap.has(id)) {
        subsMap.set(id, s);
      } else {
        subsMap.set(id, { ...subsMap.get(id), ...s });
      }
    }
    return Array.from(subsMap.values());
  }
}

export default ConflictResolver;
