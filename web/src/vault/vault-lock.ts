export class VaultLock {
  private readonly decrypted = new Map<string, unknown>();
  private unlocked = true;

  get isUnlocked() {
    return this.unlocked;
  }

  unlock() {
    this.unlocked = true;
  }

  remember(id: string, value: unknown) {
    if (!this.unlocked) throw new Error('Sreva vault is locked.');
    this.decrypted.set(id, structuredClone(value));
  }

  peek<T>(id: string): T | undefined {
    const value = this.decrypted.get(id);
    return value === undefined ? undefined : structuredClone(value) as T;
  }

  forget(id: string) {
    this.decrypted.delete(id);
  }

  lock() {
    this.decrypted.clear();
    this.unlocked = false;
  }
}
