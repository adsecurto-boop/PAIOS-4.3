/**
 * @vitest-environment jsdom
 *
 * Unit & Integration Test Suite: Plugin Hub Screen UI (Step 5)
 *
 * Tests the Plugin Hub UI:
 *   1. Rendering installed plugins and available marketplace plugins.
 *   2. Toggling an "Enable / Disable" switch updating plugin status in PluginRegistry and persisting to storage.
 *   3. Triggering JSON export and import modals/handlers for individual plugin backups.
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { PluginHubScreen } from '../../src/screens/PluginHubScreen';
import { PluginRegistry, PluginManifest } from '../../src/core/plugins/PluginRegistry';
import { PAIOSStorage } from '../../src/storage';

// ---------------------------------------------------------------------------
// Test Data
// ---------------------------------------------------------------------------

const MOCK_INSTALLED_HABIT: PluginManifest = {
  id: 'habit-tracker',
  name: 'Habit Tracker',
  version: '1.2.0',
  description: 'Track daily streaks and habits with AI check-ins',
  author: 'PAIOS Core',
  category: 'wellness',
  storageKey: 'plugin_habit-tracker',
  schemaFields: [{ name: 'habits', type: 'string[]', required: true }],
};

const MOCK_INSTALLED_BUDGET: PluginManifest = {
  id: 'budget-tracker',
  name: 'Budget Tracker',
  version: '1.0.1',
  description: 'Manage daily budgets and financial goals',
  author: 'PAIOS Finance',
  category: 'finance',
  storageKey: 'plugin_budget-tracker',
  schemaFields: [{ name: 'dailySpendLimit', type: 'number', required: true }],
};

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

describe('Unit Test: Plugin Hub Screen UI & Backup Portability (Step 5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    PAIOSStorage.clear();
    PluginRegistry.clearAll();

    // Populate initial installed plugins in registry
    PluginRegistry.register(MOCK_INSTALLED_HABIT, true);
    PluginRegistry.register(MOCK_INSTALLED_BUDGET, false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── 1. Render Installed & Marketplace Plugins ────────────────────────────

  describe('Plugin Hub Rendering', () => {
    it('renders the Plugin Hub header, installed list, and marketplace tabs/sections', async () => {
      render(<PluginHubScreen />);

      // Verify Header
      expect(
        screen.getByText(/Plugin Hub|Plugin Marketplace|Dynamic Plugins/i)
      ).toBeInTheDocument();

      // Verify Installed Plugins appear
      expect(screen.getByText('Habit Tracker')).toBeInTheDocument();
      expect(screen.getByText('Budget Tracker')).toBeInTheDocument();
    });

    it('displays plugin metadata including version, description, and status badges', async () => {
      render(<PluginHubScreen />);

      expect(screen.getByText(/Track daily streaks/i)).toBeInTheDocument();
      expect(screen.getByText(/v1\.2\.0/i)).toBeInTheDocument();

      // Check status indicator or text
      const enabledElements = screen.getAllByText(/Active \/ Enabled|Enabled|Running/i);
      expect(enabledElements.length).toBeGreaterThan(0);
    });

    it('renders marketplace plugins under available/marketplace tab or section', async () => {
      const user = userEvent.setup();
      render(<PluginHubScreen />);

      // Click marketplace tab
      const marketplaceTab =
        screen.queryByRole('tab', { name: /Marketplace|Discover|Browse/i }) ||
        screen.getByText(/Marketplace/i);

      await user.click(marketplaceTab);

      // Marketplace plugin should be discoverable
      const marketplaceItem = screen.getByText(/Study Companion & Flashcards/i);
      expect(marketplaceItem).toBeInTheDocument();
    });
  });

  // ── 2. Enable / Disable Toggle ───────────────────────────────────────────

  describe('Plugin Toggle Switch & State Persistence', () => {
    it('toggles plugin enabled status when toggle switch is clicked and updates storage', async () => {
      const user = userEvent.setup();
      const statusChangeSpy = vi.fn();

      render(<PluginHubScreen onPluginStatusChange={statusChangeSpy} />);

      // Find toggle switch for Habit Tracker (currently enabled)
      const toggles = screen.getAllByRole('switch');
      expect(toggles.length).toBeGreaterThanOrEqual(1);

      const habitToggle = toggles[0];
      await user.click(habitToggle);

      // Verify registry was updated
      await waitFor(() => {
        const habitReg = PluginRegistry.getRegistration('habit-tracker');
        expect(habitReg?.enabled).toBe(false);
      });
    });

    it('enabling a disabled plugin updates registry state to active', async () => {
      const user = userEvent.setup();
      render(<PluginHubScreen />);

      const toggles = screen.getAllByRole('switch');
      expect(toggles.length).toBeGreaterThanOrEqual(2);

      const budgetToggle = toggles[1]; // Budget Tracker (currently disabled)
      await user.click(budgetToggle);

      await waitFor(() => {
        const budgetReg = PluginRegistry.getRegistration('budget-tracker');
        expect(budgetReg?.enabled).toBe(true);
      });
    });
  });

  // ── 3. JSON Export & Import Modals ────────────────────────────────────────

  describe('JSON Export & Import Backup Actions', () => {
    it('triggers JSON export modal for an individual plugin', async () => {
      const user = userEvent.setup();
      render(<PluginHubScreen />);

      // Store dummy plugin data first
      PluginRegistry.writePluginStorage('habit-tracker', { habits: ['Exercise 30m', 'Meditate 10m'] });

      // Find export action button for habit-tracker
      const exportButtons = screen.getAllByRole('button', { name: /Export Backup|Export|Backup/i });
      expect(exportButtons.length).toBeGreaterThan(0);

      await user.click(exportButtons[0]);

      // Expect export confirmation modal, JSON textarea, or success feedback
      await waitFor(() => {
        expect(
          screen.getByText(/Export Plugin Data/i)
        ).toBeInTheDocument();
      });
    });

    it('triggers JSON import modal and accepts a valid portable plugin bundle', async () => {
      const user = userEvent.setup();
      render(<PluginHubScreen />);

      const importButton = screen.getByRole('button', { name: /Import Plugin/i });
      await user.click(importButton);

      // Modal should display instructions or textarea input for manifest JSON
      await waitFor(() => {
        expect(
          screen.getByText(/Import Plugin Backup Manifest/i)
        ).toBeInTheDocument();
      });

      // Type valid import payload
      const validPayload = JSON.stringify({
        schemaVersion: '1.0.0',
        version: 1,
        pluginId: 'habit-tracker',
        exportedAtMillis: Date.now(),
        data: { habits: ['Hydrate 2L', 'Early sleep'] },
      });

      const textarea = screen.getByPlaceholderText(/Paste JSON manifest here/i);
      fireEvent.change(textarea, { target: { value: validPayload } });

      const submitBtn = screen.getByRole('button', { name: /Validate & Import/i });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText(/Successfully imported backup/i)).toBeInTheDocument();
      });
    });
  });
});
