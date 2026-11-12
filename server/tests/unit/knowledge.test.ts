import { describe, expect, it } from 'vitest';
import { bestWindow, toTsQuery } from '../../src/modules/ai/knowledge.service';

describe('knowledge retrieval helpers', () => {
  it('reduces a question to OR-joined meaningful words', () => {
    expect(toTsQuery('What should I do about a failed germination test?')).toBe('failed | germination | test');
  });
  it('returns null when the question has no usable words', () => {
    expect(toTsQuery('how is it?')).toBeNull();
  });
  it('picks the sentence window that matches the question', () => {
    const body = 'Intro about nothing relevant here at all and more filler text to pad the length. '.repeat(6)
      + 'Dormancy can be broken with pre-chilling or gibberellic acid before the test. '
      + 'Closing remarks that are also not relevant and go on for a while to exceed the window size. '.repeat(4);
    expect(bestWindow(body, 'how to break dormancy', 300)).toContain('pre-chilling');
  });
});
