import path from 'node:path';

const cleanText = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export const normalizeSearchTerms = (value) => cleanText(value).split(/\s+/).filter(Boolean);

export const primarySearchToken = (value) => normalizeSearchTerms(value)[0] || '';

export const buildSearchText = (fileName, extraTerms = []) => {
  const parsed = path.parse(fileName || 'image');
  return cleanText([parsed.name, parsed.ext.replace('.', ''), ...extraTerms].join(' '));
};

export const generateSearchTokens = (fileName, extraTerms = []) => {
  const text = buildSearchText(fileName, extraTerms);
  const words = text.split(/\s+/).filter(Boolean);
  const tokens = new Set();

  for (const word of words) {
    tokens.add(word);

    for (let start = 0; start < word.length; start += 1) {
      for (let end = start + 2; end <= word.length; end += 1) {
        tokens.add(word.slice(start, end));
      }
    }
  }

  return [...tokens].slice(0, 500);
};
