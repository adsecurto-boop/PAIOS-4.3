import { describe, it, expect } from 'vitest';
import { GoalExtractor, ParsedGoal } from '../../src/core/ai/GoalExtractor';

describe('Unit Test: GoalExtractor Conversational Probing Engine', () => {
  it('enforces a valid Definition of Done (DoD) for goals', () => {
    const goalWithDod = GoalExtractor.enforceDefinitionOfDone({
      title: 'Pass ISTQB Exam',
      definitionOfDone: 'Score at least 85% on official CTFL mock exam.',
    });
    expect(goalWithDod).toBe('Score at least 85% on official CTFL mock exam.');

    const fallbackDod = GoalExtractor.enforceDefinitionOfDone({
      title: 'Master Playwright Automation',
    });
    expect(fallbackDod).toContain('Successfully complete all key milestones');
  });

  it('generates structured milestone breakdowns for goals', () => {
    const milestones = GoalExtractor.generateMilestones(
      'Build PAIOS 5.0',
      'Deploy backend to Ubuntu server with 100% passing tests.'
    );
    expect(milestones).toHaveLength(3);
    expect(milestones[0].title).toContain('Requirement & Scope Breakdown');
    expect(milestones[1].title).toContain('Execute Implementation Sprint');
    expect(milestones[2].title).toContain('Verify Definition of Done');
    expect(milestones.every((m) => m.completed === false)).toBe(true);
  });

  it('parses conversational goal text into structured ParsedGoal objects', () => {
    const text = 'I want to pass the ISTQB certification test. I plan to build PAIOS desktop app.';
    const goals = GoalExtractor.extractGoalsFromConversation(text);

    expect(goals.length).toBeGreaterThanOrEqual(2);
    expect(goals[0].title).toBeDefined();
    expect(goals[0].definitionOfDone).toBeDefined();
    expect(goals[0].milestones).toHaveLength(3);
  });

  it('detects HIGH priority keywords in conversational text', () => {
    const text = 'Urgent priority goal: Complete security patch for server.';
    const goals = GoalExtractor.extractGoalsFromConversation(text);
    expect(goals.length).toBeGreaterThanOrEqual(1);
    expect(goals[0].priority).toBe('HIGH');
  });

  it('assigns Study category for ISTQB or testing goals', () => {
    const text = 'I want to pass ISTQB foundation level test.';
    const goals = GoalExtractor.extractGoalsFromConversation(text);
    expect(goals[0].category).toBe('Study');
  });

  it('merges goals immutably without mutating input arrays', () => {
    const existing: ParsedGoal[] = [
      {
        id: 'g_1',
        title: 'Existing Goal 1',
        category: 'Work',
        definitionOfDone: 'Done',
        milestones: [],
        priority: 'NORMAL',
        createdAtMillis: 1000,
      },
    ];

    const fresh: ParsedGoal[] = [
      {
        id: 'g_2',
        title: 'New Goal 2',
        category: 'Study',
        definitionOfDone: 'Done',
        milestones: [],
        priority: 'HIGH',
        createdAtMillis: 2000,
      },
    ];

    const merged = GoalExtractor.mergeGoalsImmutably(existing, fresh);

    expect(merged).toHaveLength(2);
    expect(merged[0].id).toBe('g_2');
    expect(merged[1].id).toBe('g_1');
    expect(existing).toHaveLength(1); // Original array remains untouched
    expect(fresh).toHaveLength(1);
  });

  it('handles offline / empty / null inputs gracefully without throwing exceptions', () => {
    expect(() => GoalExtractor.extractGoalsFromConversation('')).not.toThrow();
    expect(GoalExtractor.extractGoalsFromConversation('')).toEqual([]);
    expect(GoalExtractor.extractGoalsFromConversation('   ')).toEqual([]);
  });
});
