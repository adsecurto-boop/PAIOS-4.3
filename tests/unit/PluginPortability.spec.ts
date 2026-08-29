import { describe, it, expect } from 'vitest';
import { PluginPortability, PluginExportManifest } from '../../src/core/plugins/PluginPortability';

describe('Unit Test: PluginPortability Versioned Manifest Engine', () => {
  it('exports plugin data into a versioned JSON manifest string with valid checksum', () => {
    const pluginId = 'timetable_plugin_v1';
    const data = {
      settings: { autoSync: true },
      blocksCount: 5,
    };

    const manifestJson = PluginPortability.exportPluginData(pluginId, data);
    expect(manifestJson).toBeDefined();

    const parsed: PluginExportManifest = JSON.parse(manifestJson);
    expect(parsed.version).toBe(1);
    expect(parsed.pluginId).toBe(pluginId);
    expect(parsed.checksum).toContain('chk_');
    expect(parsed.data).toEqual(data);
  });

  it('imports and validates a valid versioned JSON manifest', () => {
    const pluginId = 'study_plugin';
    const data = { topic: 'ISTQB', cardCount: 20 };
    const manifestJson = PluginPortability.exportPluginData(pluginId, data);

    const importResult = PluginPortability.importPluginData(manifestJson);

    expect(importResult.success).toBe(true);
    expect(importResult.manifest).toBeDefined();
    expect(importResult.manifest!.pluginId).toBe(pluginId);
    expect(importResult.manifest!.data).toEqual(data);
  });

  it('calculates deterministic checksum for identical data', () => {
    const json1 = PluginPortability.exportPluginData('p_1', { a: 1 });
    const json2 = PluginPortability.exportPluginData('p_1', { a: 1 });

    const m1 = JSON.parse(json1);
    const m2 = JSON.parse(json2);

    expect(m1.checksum).toBe(m2.checksum);
  });

  it('rejects manifest if version is invalid or <= 0', () => {
    const invalidVersionManifest = { version: 0, pluginId: 'p1', data: {}, checksum: 'chk_0' };
    expect(PluginPortability.validateManifest(invalidVersionManifest)).toBe(false);
  });

  it('rejects manifest with checksum mismatch if payload was tampered', () => {
    const originalJson = PluginPortability.exportPluginData('p_tamper', { original: true });
    const manifest = JSON.parse(originalJson);
    manifest.data = { original: false, tampered: true }; // Tamper with data without updating checksum

    const tamperedJson = JSON.stringify(manifest);
    const result = PluginPortability.importPluginData(tamperedJson);

    expect(result.success).toBe(false);
    expect(result.error).toContain('checksum mismatch');
  });

  it('rejects invalid or tampered JSON manifests', () => {
    const invalidJson = '{ "version": 1, "pluginId": "fake", "checksum": "chk_bad" }';
    const result = PluginPortability.importPluginData(invalidJson);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('rejects empty or malformed manifest strings', () => {
    expect(PluginPortability.importPluginData('').success).toBe(false);
    expect(PluginPortability.importPluginData('not-json').success).toBe(false);
  });
});
