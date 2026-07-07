import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSearchText, generateSearchTokens, normalizeSearchTerms, primarySearchToken } from './searchTokens.js';

test('normalizes search terms for Firestore token lookup', () => {
  assert.deepEqual(normalizeSearchTerms('Mountain sunset.JPG'), ['mountain', 'sunset', 'jpg']);
  assert.equal(primarySearchToken('  Cat  '), 'cat');
});

test('generates substring tokens for image name search', () => {
  const tokens = generateSearchTokens('Blue-Mountain.webp');

  assert.equal(tokens.includes('blue'), true);
  assert.equal(tokens.includes('mountain'), true);
  assert.equal(tokens.includes('ount'), true);
  assert.equal(tokens.includes('webp'), true);
});

test('builds compact searchable text', () => {
  assert.equal(buildSearchText('Beach Trip.png'), 'beach trip png');
});
