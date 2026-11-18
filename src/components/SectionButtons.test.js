import { expect, it } from 'vitest';
import { nextSectionName } from './SectionButtons.jsx';

it('numera versos y repetidos', () => {
  expect(nextSectionName('Verso', [])).toBe('Verso 1');
  expect(nextSectionName('Verso', ['Verso 1', 'Coro', 'Verso 2'])).toBe('Verso 3');
  expect(nextSectionName('Coro', ['Verso 1'])).toBe('Coro');
  expect(nextSectionName('Coro', ['Coro'])).toBe('Coro 2');
});
