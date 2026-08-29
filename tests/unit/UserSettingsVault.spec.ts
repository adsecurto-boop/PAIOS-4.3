/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { PAIOSStorage } from '../../src/storage';

describe('Unit Test: UserSettingsVault Configuration Management', () => {
  beforeEach(() => {
    PAIOSStorage.clear();
  });

  it('retrieves default user settings', () => {
    const settings = PAIOSStorage.getSettings();
    expect(settings).toBeDefined();
    expect(settings.userName).toBeDefined();
    expect(settings.aiProvider).toBe('GEMINI');
  });

  it('updates partial user settings cleanly', () => {
    PAIOSStorage.updateSettings({
      userName: 'Alex Mercer',
      officeStartTime: '12:00',
      officeEndTime: '21:00',
    });

    const updated = PAIOSStorage.getSettings();
    expect(updated.userName).toBe('Alex Mercer');
    expect(updated.officeStartTime).toBe('12:00');
    expect(updated.officeEndTime).toBe('21:00');
  });

  it('toggles notification preference flags in settings', () => {
    PAIOSStorage.updateSettings({
      morningNotificationEnabled: false,
      eveningNotificationEnabled: true,
    });

    const updated = PAIOSStorage.getSettings();
    expect(updated.morningNotificationEnabled).toBe(false);
    expect(updated.eveningNotificationEnabled).toBe(true);
  });

  it('updates custom API key and AI model preferences', () => {
    PAIOSStorage.updateSettings({
      customApiKey: 'custom_gemini_key_123',
      preferredModel: 'gemini-3.7-flash',
    });

    const updated = PAIOSStorage.getSettings();
    expect(updated.customApiKey).toBe('custom_gemini_key_123');
    expect(updated.preferredModel).toBe('gemini-3.7-flash');
  });

  it('seeds default sample data when requested', () => {
    PAIOSStorage.seedSampleData();
    const tasks = PAIOSStorage.getTasks();
    const timeline = PAIOSStorage.getTimelineEntries();

    expect(tasks.length).toBeGreaterThan(0);
    expect(timeline.length).toBeGreaterThan(0);
  });

  it('exports full backup JSON string', () => {
    const backupJson = PAIOSStorage.exportBackupJson();
    expect(backupJson).toBeDefined();

    const parsed = JSON.parse(backupJson);
    expect(parsed.SETTINGS).toBeDefined();
    expect(parsed.TASKS).toBeDefined();
  });
});
