import type { VaultService } from '../../vault/vault-service';
import { LIFE_STAGE_MODES, type LifeStageMode } from './life-stage';

const LIFE_STAGE_SETTINGS_ID = 'preferences:life-stage:v1';
const DEFAULT_LIFE_STAGE: LifeStageMode = 'cycleTracking';

function isLifeStageMode(value: unknown): value is LifeStageMode {
  return typeof value === 'string'
    && (LIFE_STAGE_MODES as readonly string[]).includes(value);
}

export class LifeStageSettingsRepository {
  constructor(private readonly vault: VaultService) {}

  async load(): Promise<LifeStageMode> {
    const ids = await this.vault.listRecordIds();
    if (!ids.includes(LIFE_STAGE_SETTINGS_ID)) return DEFAULT_LIFE_STAGE;

    const stored = await this.vault.read<unknown>(LIFE_STAGE_SETTINGS_ID);
    if (!isLifeStageMode(stored)) throw new Error('Invalid life-stage preference.');
    return stored;
  }

  async save(mode: LifeStageMode): Promise<void> {
    if (!isLifeStageMode(mode)) throw new Error('Invalid life-stage preference.');
    await this.vault.write(LIFE_STAGE_SETTINGS_ID, mode);
  }
}
