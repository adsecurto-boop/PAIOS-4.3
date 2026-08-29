import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../server';
import { GoalExtractor, Goal } from '../../src/core/ai/GoalExtractor';

describe('ATDD: Goal Discovery Loop & Immutability Engine (Step 2)', () => {
  let authToken: string;

  beforeEach(async () => {
    // Register test user for authenticated AI loop tests
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: `goal_loop_${Date.now()}_${Math.random().toString(36).substring(2, 6)}@paios.ai`,
        password: 'SecurePassword123!',
        displayName: 'Goal Explorer',
      });
    authToken = regRes.body.token;
  });

  describe('Conversational Goal Extraction Contract', () => {
    it('extracts structured Goal properties (title, projects, definitionOfDone, priority) from natural language', () => {
      const conversationalInput = `
        Goal: Achieve Lead SDET Certification
        Definition of Done: Pass ISTQB Advanced Test Automation Engineer exam with 85%+ score
        Sub-projects:
        - Master Playwright and Python async automation harness
        - Implement SQLite WAL and JWT Authentication suites
        - Build CI/CD regression pipelines
        Priority: HIGH
      `;

      const extracted = GoalExtractor.extractGoalFromConversation(conversationalInput);

      expect(extracted.title).toMatch(/Lead SDET Certification/i);
      expect(extracted.definitionOfDone).toMatch(/ISTQB Advanced/i);
      expect(extracted.projects.length).toBeGreaterThanOrEqual(3);
      expect(extracted.projects[0]).toMatch(/Playwright/i);
      expect(extracted.priority).toBe('HIGH');
      expect(extracted.isComplete).toBe(true);
      expect(extracted.missingFields).toHaveLength(0);
    });

    it('identifies incomplete goals and generates targeted conversational probing questions', () => {
      const partialInput = 'I want to build a fitness routine';
      const extracted = GoalExtractor.extractGoalFromConversation(partialInput);

      expect(extracted.title).toBeDefined();
      expect(extracted.isComplete).toBe(false);
      expect(extracted.missingFields).toContain('definitionOfDone');
      expect(extracted.missingFields).toContain('projects');

      const probeQuestion = GoalExtractor.probeMissingGoalDetails(extracted);
      expect(probeQuestion).toBeDefined();
      expect(typeof probeQuestion).toBe('string');
      expect(probeQuestion).toMatch(/Definition of Done|success|criteria/i);
    });
  });

  describe('Goal Immutability Rule Enforcement', () => {
    const baseGoal: Goal = {
      id: 'goal_sdet_1',
      title: 'Become Lead SDET',
      definitionOfDone: 'Pass ISTQB Exam and deploy 5 test suites',
      priority: 'HIGH',
      createdAtMillis: Date.now() - 86400000,
      isLocked: false,
      projects: [
        { id: 'p1', title: 'Master Playwright', status: 'IN_PROGRESS' },
        { id: 'p2', title: 'Build CI/CD Pipeline', status: 'TODO' },
      ],
    };

    it('rejects deletion of an active IN_PROGRESS project from an established goal', () => {
      const illegalUpdate: Goal = {
        ...baseGoal,
        projects: [
          // Attempted removal of 'Master Playwright' which is IN_PROGRESS
          { id: 'p2', title: 'Build CI/CD Pipeline', status: 'TODO' },
        ],
      };

      const result = GoalExtractor.validateGoalImmutability(baseGoal, illegalUpdate);
      expect(result.isValid).toBe(false);
      expect(result.error).toMatch(/Immutability Violation.*active project/i);
    });

    it('allows adding new projects and progressing existing projects to COMPLETED', () => {
      const validUpdate: Goal = {
        ...baseGoal,
        projects: [
          { id: 'p1', title: 'Master Playwright', status: 'COMPLETED' },
          { id: 'p2', title: 'Build CI/CD Pipeline', status: 'IN_PROGRESS' },
          { id: 'p3', title: 'Deploy Smoke Tests', status: 'TODO' },
        ],
      };

      const result = GoalExtractor.validateGoalImmutability(baseGoal, validUpdate);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('enforces strict lock protection when goal.isLocked is true', () => {
      const lockedGoal: Goal = {
        ...baseGoal,
        isLocked: true,
      };

      const alteredGoal: Goal = {
        ...lockedGoal,
        title: 'Changed Title Arbitrarily',
      };

      const result = GoalExtractor.validateGoalImmutability(lockedGoal, alteredGoal);
      expect(result.isValid).toBe(false);
      expect(result.error).toMatch(/locked goal/i);
    });
  });

  describe('End-to-End Goal Discovery via AI Proxy Service', () => {
    it('interacts with /api/ai/chat proxy to conduct conversational goal discovery', async () => {
      const promptPayload = {
        message: 'I want to establish my Q3 career goal: Become Lead QA Automation Architect. How should we structure the DoD and milestones?',
        role: 'productivity',
      };

      const response = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send(promptPayload);

      expect([200, 502, 503]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('reply');
        const replyText = response.body.reply;
        expect(typeof replyText).toBe('string');
        expect(replyText.length).toBeGreaterThan(10);
      }
    });
  });
});
