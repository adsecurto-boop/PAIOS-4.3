/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OnboardingScreen } from '../../src/screens/OnboardingScreen';
import { PAIOSStorage } from '../../src/storage';
import { App } from '../../src/App';
import * as firebaseModule from '../../src/firebase';

describe('Unit Test: Conversational Onboarding & App Routing Logic', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('OnboardingScreen Conversational Engine', () => {
    it('renders initial welcome prompt, quick starters, and goal card preview', () => {
      const onCompleteMock = vi.fn();
      render(<OnboardingScreen onComplete={onCompleteMock} userName="Alex" />);

      expect(screen.getByTestId('onboarding-screen')).toBeInTheDocument();
      expect(screen.getByTestId('onboarding-chat-messages')).toBeInTheDocument();
      expect(screen.getByTestId('onboarding-chat-input')).toBeInTheDocument();
      expect(screen.getByTestId('extracted-goal-card')).toBeInTheDocument();
      expect(screen.getByTestId('onboarding-finish-btn')).toBeInTheDocument();
      expect(screen.getByTestId('onboarding-skip-btn')).toBeInTheDocument();
      expect(screen.getByText(/SDET & Software Automation Career/i)).toBeInTheDocument();
    });

    it('processes user conversation and updates live extracted goal telemetry card', async () => {
      const onCompleteMock = vi.fn();
      render(<OnboardingScreen onComplete={onCompleteMock} userName="Alex" />);

      const starterBtn = screen.getByText(/SDET & Software Automation Career/i);
      await userEvent.click(starterBtn);

      await waitFor(() => {
        expect(screen.getByTestId('extracted-goal-card')).toHaveTextContent(/Lead SDET/i);
        expect(screen.getByTestId('extracted-goal-card')).toHaveTextContent(/ISTQB/i);
        expect(screen.getByTestId('extracted-goal-card')).toHaveTextContent(/HIGH/i);
      });
    });

    it('persists discovered goals and marks onboardingCompleted=true when clicking finish button', async () => {
      const onCompleteMock = vi.fn();
      render(<OnboardingScreen onComplete={onCompleteMock} userName="Alex" />);

      const starterBtn = screen.getByText(/SDET & Software Automation Career/i);
      await userEvent.click(starterBtn);

      const finishBtn = screen.getByTestId('onboarding-finish-btn');
      await userEvent.click(finishBtn);

      expect(onCompleteMock).toHaveBeenCalledTimes(1);
      const settings = PAIOSStorage.getSettings();
      expect(settings.onboardingCompleted).toBe(true);
      expect(settings.goals?.length).toBeGreaterThan(0);
    });

    it('allows skipping directly to dashboard and marks onboardingCompleted=true', async () => {
      const onCompleteMock = vi.fn();
      render(<OnboardingScreen onComplete={onCompleteMock} userName="Alex" />);

      const skipBtn = screen.getByTestId('onboarding-skip-btn');
      await userEvent.click(skipBtn);

      expect(onCompleteMock).toHaveBeenCalledTimes(1);
      const settings = PAIOSStorage.getSettings();
      expect(settings.onboardingCompleted).toBe(true);
    });
  });

  describe('App Shell Onboarding Routing Flow', () => {
    it('mounts OnboardingScreen if user is logged in but onboarding is not completed', async () => {
      // Mock authenticated session
      vi.spyOn(firebaseModule, 'onAuthChange').mockImplementation((cb: any) => {
        cb({
          uid: 'test_user_1',
          email: 'alex@paios.ai',
          displayName: 'Alex',
        });
        return () => {};
      });

      // Explicitly set onboarding incomplete
      const current = PAIOSStorage.getSettings();
      PAIOSStorage.saveSettings({
        ...current,
        onboardingCompleted: false,
        goals: [],
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('onboarding-screen')).toBeInTheDocument();
      });
    });

    it('mounts main workspace / TodayScreen when onboarding is marked completed', async () => {
      // Mock authenticated session
      vi.spyOn(firebaseModule, 'onAuthChange').mockImplementation((cb: any) => {
        cb({
          uid: 'test_user_1',
          email: 'alex@paios.ai',
          displayName: 'Alex',
        });
        return () => {};
      });

      // Mark onboarding as completed
      const current = PAIOSStorage.getSettings();
      PAIOSStorage.saveSettings({
        ...current,
        onboardingCompleted: true,
        goals: ['Master PAIOS Architecture'],
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.queryByTestId('onboarding-screen')).not.toBeInTheDocument();
        expect(screen.getAllByText(/PAIOS Desktop/i).length).toBeGreaterThan(0);
      });
    });
  });
});
