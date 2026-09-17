import type { SyncQueue } from './queue';
import type { SyncConflictStore } from './reconcile';

export interface SyncCycleClient {
  uploadNext(): Promise<boolean>;
  pullAndApply(vaultId: string, limit: number): Promise<{ applied: number; conflicts: number }>;
}

export type SyncCycleResult = {
  uploaded: number;
  applied: number;
  conflicts: number;
  paused: boolean;
};

export class SyncOrchestrator {
  constructor(
    private readonly dependencies: {
      queue: SyncQueue;
      conflicts: SyncConflictStore;
      client: SyncCycleClient;
    },
  ) {}

  async synchronize(vaultId: string, limit: number): Promise<SyncCycleResult> {
    if (await this.dependencies.queue.isPaused()) {
      return { uploaded: 0, applied: 0, conflicts: 0, paused: true };
    }

    let uploaded = 0;
    while (await this.dependencies.client.uploadNext()) {
      uploaded += 1;
    }

    const pulled = await this.dependencies.client.pullAndApply(vaultId, limit);
    return {
      uploaded,
      applied: pulled.applied,
      conflicts: pulled.conflicts,
      paused: false,
    };
  }

  async pause(): Promise<void> {
    await this.dependencies.queue.pause();
  }

  async resume(): Promise<void> {
    await this.dependencies.queue.resume();
  }

  async disable(): Promise<void> {
    await this.dependencies.queue.disable();
    await this.dependencies.conflicts.clear();
  }
}
