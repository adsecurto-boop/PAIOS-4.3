export interface PluginExportManifest {
  version: number;
  pluginId: string;
  exportedAtMillis: number;
  data: Record<string, any>;
  checksum: string;
}

export class PluginPortability {
  private static CURRENT_VERSION = 1;

  /**
   * Generates a simple checksum for export manifest integrity validation.
   */
  private static generateChecksum(pluginId: string, dataStr: string): string {
    let hash = 0;
    const combined = `${pluginId}:${dataStr}`;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return `chk_${Math.abs(hash).toString(36)}`;
  }

  /**
   * Exports plugin state into a versioned JSON manifest string.
   */
  static exportPluginData(pluginId: string, data: Record<string, any>): string {
    const dataStr = JSON.stringify(data);
    const manifest: PluginExportManifest = {
      version: this.CURRENT_VERSION,
      pluginId,
      exportedAtMillis: Date.now(),
      data,
      checksum: this.generateChecksum(pluginId, dataStr),
    };
    return JSON.stringify(manifest, null, 2);
  }

  /**
   * Imports and validates a versioned JSON plugin manifest string.
   */
  static importPluginData(manifestJson: string): {
    success: boolean;
    manifest?: PluginExportManifest;
    error?: string;
  } {
    if (!manifestJson || !manifestJson.trim()) {
      return { success: false, error: 'Manifest JSON cannot be empty.' };
    }

    try {
      const manifest: PluginExportManifest = JSON.parse(manifestJson);

      if (!this.validateManifest(manifest)) {
        return { success: false, error: 'Invalid manifest format or checksum mismatch.' };
      }

      return {
        success: true,
        manifest,
      };
    } catch (err: any) {
      return {
        success: false,
        error: `JSON parse error: ${err.message || String(err)}`,
      };
    }
  }

  /**
   * Validates manifest structure, version compatibility, and checksum.
   */
  static validateManifest(manifest: any): boolean {
    if (!manifest || typeof manifest !== 'object') return false;
    if (typeof manifest.version !== 'number' || manifest.version <= 0) return false;
    if (!manifest.pluginId || typeof manifest.pluginId !== 'string') return false;
    if (!manifest.data || typeof manifest.data !== 'object') return false;

    const dataStr = JSON.stringify(manifest.data);
    const expectedChecksum = this.generateChecksum(manifest.pluginId, dataStr);

    return manifest.checksum === expectedChecksum;
  }
}

export default PluginPortability;
