import { PAIOSStorage } from '../../storage';

export interface PluginSchemaField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'string[]' | 'object';
  required: boolean;
  aiPromptHint?: string;
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  category?: 'productivity' | 'wellness' | 'finance' | 'learning' | 'utility';
  schemaFields: PluginSchemaField[];
  storageKey: string;
  isMarketplace?: boolean;
}

export interface PluginRegistration {
  manifest: PluginManifest;
  enabled: boolean;
  installedAtMillis: number;
}

export class PluginRegistry {
  public static STORAGE_KEY = 'paios_installed_plugins';
  private static store: Map<string, PluginRegistration> = new Map();

  /**
   * Registers a custom plugin manifest at runtime.
   */
  public static register(manifest: PluginManifest, enabled: boolean = true): PluginRegistration {
    const registration: PluginRegistration = {
      manifest,
      enabled,
      installedAtMillis: Date.now(),
    };
    this.store.set(manifest.id, registration);
    this.persist();
    return registration;
  }

  /**
   * Enables a registered plugin.
   */
  public static enable(pluginId: string): boolean {
    const reg = this.store.get(pluginId);
    if (!reg) return false;
    reg.enabled = true;
    this.persist();
    return true;
  }

  /**
   * Disables a registered plugin.
   */
  public static disable(pluginId: string): boolean {
    const reg = this.store.get(pluginId);
    if (!reg) return false;
    reg.enabled = false;
    this.persist();
    return true;
  }

  /**
   * Uninstalls a plugin, removing its registration and clearing isolated storage.
   */
  public static uninstall(pluginId: string): boolean {
    if (!this.store.has(pluginId)) return false;
    this.store.delete(pluginId);
    PAIOSStorage.removeItem(`plugin_${pluginId}`);
    this.persist();
    return true;
  }

  /**
   * Returns the registration for a specific plugin ID.
   */
  public static getRegistration(pluginId: string): PluginRegistration | null {
    return this.store.get(pluginId) || null;
  }

  /**
   * Returns all currently active/enabled plugins.
   */
  public static getActivePlugins(): PluginRegistration[] {
    return Array.from(this.store.values()).filter((r) => r.enabled);
  }

  /**
   * Returns all registered plugins.
   */
  public static getAllPlugins(): PluginRegistration[] {
    return Array.from(this.store.values());
  }

  /**
   * Writes data into an isolated plugin storage partition.
   */
  public static writePluginStorage(pluginId: string, data: Record<string, any>): void {
    PAIOSStorage.setItem(`plugin_${pluginId}`, data);
  }

  /**
   * Reads data from an isolated plugin storage partition.
   */
  public static readPluginStorage<T = any>(pluginId: string): T | null {
    return PAIOSStorage.getItem<T>(`plugin_${pluginId}`, null);
  }

  /**
   * Clears in-memory registry and stored plugins.
   */
  public static clearAll(): void {
    this.store.clear();
    PAIOSStorage.removeItem(this.STORAGE_KEY);
  }

  private static persist(): void {
    PAIOSStorage.setItem(this.STORAGE_KEY, Array.from(this.store.values()));
  }
}

export default PluginRegistry;
