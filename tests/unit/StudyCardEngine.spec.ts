/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { PAIOSStorage } from '../../src/storage';

describe('Unit Test: StudyCard Active Recall Engine', () => {
  beforeEach(() => {
    PAIOSStorage.clear();
  });

  it('adds and retrieves study flashcards', () => {
    const card = PAIOSStorage.addStudyCard(
      'Software Testing',
      'What is Boundary Value Analysis?',
      'A black-box testing technique testing boundary values at limits.'
    );

    expect(card.id).toBeDefined();
    expect(card.reviewCount).toBe(0);

    const cards = PAIOSStorage.getStudyCards();
    expect(cards.some((c) => c.id === card.id)).toBe(true);
  });

  it('updates confidence rating upon review with EASY rating', () => {
    const card = PAIOSStorage.addStudyCard('Topic', 'Q?', 'A');
    PAIOSStorage.reviewStudyCard(card.id, 'EASY');

    const updated = PAIOSStorage.getStudyCards().find((c) => c.id === card.id);
    expect(updated!.confidence).toBe(10);
    expect(updated!.reviewCount).toBe(1);
  });

  it('updates confidence rating upon review with AGAIN rating', () => {
    const card = PAIOSStorage.addStudyCard('Topic AGAIN', 'Q?', 'A');
    PAIOSStorage.reviewStudyCard(card.id, 'AGAIN');

    const updated = PAIOSStorage.getStudyCards().find((c) => c.id === card.id);
    expect(updated!.confidence).toBe(2);
  });

  it('updates confidence rating upon review with HARD rating', () => {
    const card = PAIOSStorage.addStudyCard('Topic HARD', 'Q?', 'A');
    PAIOSStorage.reviewStudyCard(card.id, 'HARD');

    const updated = PAIOSStorage.getStudyCards().find((c) => c.id === card.id);
    expect(updated!.confidence).toBe(5);
  });

  it('updates confidence rating upon review with GOOD rating', () => {
    const card = PAIOSStorage.addStudyCard('Topic GOOD', 'Q?', 'A');
    PAIOSStorage.reviewStudyCard(card.id, 'GOOD');

    const updated = PAIOSStorage.getStudyCards().find((c) => c.id === card.id);
    expect(updated!.confidence).toBe(8);
  });

  it('deletes study card from storage', () => {
    const card = PAIOSStorage.addStudyCard('Delete', 'Q', 'A');
    PAIOSStorage.deleteStudyCard(card.id);

    const cards = PAIOSStorage.getStudyCards();
    expect(cards.some((c) => c.id === card.id)).toBe(false);
  });

  it('searches study cards globally by topic or question', () => {
    PAIOSStorage.addStudyCard('Automation', 'What is Playwright?', 'An automated browser testing library.');
    const result = PAIOSStorage.globalSearch('Playwright');

    expect(result.studyCards).toHaveLength(1);
    expect(result.studyCards[0].topic).toBe('Automation');
  });
});
