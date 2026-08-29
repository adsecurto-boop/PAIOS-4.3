export interface PluginExportBundle<T = any> {
  schemaVersion?: string;
  version?: number;
  pluginId: string;
  exportedAt?: number;
  exportedAtMillis?: number;
  data: T;
  checksum?: string;
}

export interface PluginExportManifest {
  version: number;
  pluginId: string;
  exportedAtMillis: number;
  data: Record<string, any>;
  checksum: string;
}

export interface ImportResult<T = any> {
  success: boolean;
  data?: T;
  manifest?: PluginExportManifest;
  error?: string;
}

const SUPPORTED_MAJOR_VERSION = 1;

/**
 * Generates a simple checksum for export manifest integrity validation.
 */
function generateChecksum(pluginId: string, dataStr: string): string {
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
 * Exports plugin data into a portable, versioned JSON bundle.
 */
export function exportPluginData<T = any>(pluginId: string, data: T): PluginExportBundle<T> {
  const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
  return {
    schemaVersion: '1.0.0',
    version: 1,
    pluginId,
    exportedAt: Date.now(),
    exportedAtMillis: Date.now(),
    data,
    checksum: generateChecksum(pluginId, dataStr),
  };
}

/**
 * Imports and validates a plugin export bundle, restoring isolated state.
 */
export function importPluginData<T = any>(bundle: any): ImportResult<T> {
  let parsed = bundle;
  if (typeof bundle === 'string') {
    try {
      parsed = JSON.parse(bundle);
    } catch (err: any) {
      return {
        success: false,
        error: `JSON parse error: ${err.message || String(err)}`,
      };
    }
  }

  if (!parsed || typeof parsed !== 'object') {
    return {
      success: false,
      error: 'Invalid, missing, or malformed bundle: bundle must be a non-null object.',
    };
  }

  const version = parsed.schemaVersion || (parsed.version !== undefined ? String(parsed.version) : undefined);
  if (!version || typeof version !== 'string') {
    return {
      success: false,
      error: 'Malformed bundle: missing or invalid schemaVersion.',
    };
  }

  if (!parsed.pluginId || typeof parsed.pluginId !== 'string') {
    return {
      success: false,
      error: 'Malformed bundle: missing or invalid pluginId.',
    };
  }

  if (parsed.data === undefined) {
    return {
      success: false,
      error: 'Malformed bundle: missing data payload.',
    };
  }

  const majorVersion = parseInt(version.split('.')[0], 10);
  if (isNaN(majorVersion) || majorVersion > SUPPORTED_MAJOR_VERSION) {
    return {
      success: false,
      error: `Unsupported schema version: ${version}. Supported major version is <= ${SUPPORTED_MAJOR_VERSION}.`,
    };
  }

  return {
    success: true,
    data: parsed.data as T,
    manifest: parsed as PluginExportManifest,
  };
}

export class PluginPortability {
  private static CURRENT_VERSION = 1;

  static exportPluginData(pluginId: string, data: Record<string, any>): string {
    const bundle = exportPluginData(pluginId, data);
    return JSON.stringify(bundle, null, 2);
  }

  static importPluginData(manifestJson: string | any): ImportResult {
    return importPluginData(manifestJson);
  }

  static validateManifest(manifest: any): boolean {
    if (!manifest || typeof manifest !== 'object') return false;
    if (!manifest.pluginId || manifest.data === undefined) return false;
    return true;
  }
}

export default PluginPortability;
