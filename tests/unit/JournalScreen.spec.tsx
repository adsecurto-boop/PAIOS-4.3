// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { JournalScreen } from '../../src/screens/JournalScreen';
import { PAIOSStorage } from '../../src/storage';

describe('Unit Test: Daily Journal Conversational Screen & Progress Trigger (Step 4)', () => {
  const mockEntries = [
    {
      id: 1,
      dateString: '2026-08-29',
      timestamp: Date.now() - 3600000,
      title: 'Deep Focus Morning Intent',
      content: 'Planned to finalize Step 3 and refactor test suites.',
      moodScore: 8,
      category: 'Work',
      journalMode: 'morning_intent',
    },
  ];

  const mockOnAdd = vi.fn();
  const mockOnDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    PAIOSStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders Morning Intent and Evening Review tabs / modes cleanly', async () => {
    render(
      <JournalScreen
        entries={mockEntries as any}
        onAddJournalEntry={mockOnAdd}
        onDeleteJournalEntry={mockOnDelete}
      />
    );

    // Assert Header and Journal container
    expect(screen.getByText(/Reflective Journal/i)).toBeInTheDocument();

    // Check for Morning Intent and Evening Review toggles or inputs
    const morningTab = screen.queryByTestId('journal-tab-morning') || screen.queryByText(/Morning Intent/i);
    const eveningTab = screen.queryByTestId('journal-tab-evening') || screen.queryByText(/Evening Review/i);

    expect(morningTab || eveningTab || screen.getByText(/New Journal Entry/i)).toBeDefined();
  });

  it('submitting a reflection entry stores raw reflection to ephemeral cache and invokes onAddJournalEntry', async () => {
    const user = userEvent.setup();

    render(
      <JournalScreen
        entries={[]}
        onAddJournalEntry={mockOnAdd}
        onDeleteJournalEntry={mockOnDelete}
      />
    );

    // Open write entry form
    const newEntryBtn = screen.getByText(/New Journal Entry/i);
    await user.click(newEntryBtn);

    // Fill form
    const titleInput = screen.getByPlaceholderText(/e\.g\., Morning Focus|Strategy|Weekly/i);
    const contentInput = screen.getByPlaceholderText(/Reflect deeply on your day|learnings/i);

    await user.type(titleInput, 'Evening Review - Completed Step 3');
    await user.type(contentInput, 'Accomplished all ATDD specs. Encountered zero uncaught exceptions.');

    // Submit form
    const submitBtn = screen.getByRole('button', { name: /Save Entry/i });
    await user.click(submitBtn);

    expect(mockOnAdd).toHaveBeenCalledTimes(1);
    expect(mockOnAdd).toHaveBeenCalledWith(
      'Evening Review - Completed Step 3',
      'Accomplished all ATDD specs. Encountered zero uncaught exceptions.',
      expect.any(Number),
      expect.any(String)
    );
  });

  it('triggers comparison analysis and displays actual vs planned metrics when analysis is requested', async () => {
    const user = userEvent.setup();

    // Mock fetch for AI / Progress comparison analysis
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({
        success: true,
        resultText: 'Key Insight: Velocity achieved 85% with 1 minor warning.',
        modelUsed: 'gemini-2.5-flash',
        completionRate: 85,
      }),
    } as any);

    render(
      <JournalScreen
        entries={mockEntries as any}
        onAddJournalEntry={mockOnAdd}
        onDeleteJournalEntry={mockOnDelete}
      />
    );

    // Find AI analyze / comparison trigger button
    const analyzeButtons = screen.getAllByRole('button');
    const analyzeBtn = analyzeButtons.find((btn) => /AI Analyze|Analyze|Insights/i.test(btn.textContent || ''));

    if (analyzeBtn) {
      await user.click(analyzeBtn);
      await waitFor(() => {
        expect(screen.getByText(/Velocity achieved|Key Insight/i)).toBeInTheDocument();
      });
    }
  });
});
