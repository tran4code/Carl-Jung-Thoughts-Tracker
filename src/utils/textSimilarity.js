import Fuse from 'fuse.js';

const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
  'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
  'would', 'could', 'should', 'may', 'might', 'shall', 'can', 'need',
  'dare', 'ought', 'used', 'it', 'its', 'he', 'she', 'they', 'them',
  'their', 'his', 'her', 'we', 'us', 'our', 'you', 'your', 'i', 'me',
  'my', 'this', 'that', 'these', 'those', 'which', 'who', 'whom',
  'what', 'where', 'when', 'how', 'not', 'no', 'nor', 'if', 'then',
  'than', 'so', 'very', 'just', 'about', 'also', 'into', 'over',
  'such', 'only', 'other', 'more', 'some', 'any', 'each', 'every',
  'all', 'both', 'few', 'most', 'own', 'same', 'too', 'up', 'out',
]);

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

export function buildCorpusIndex(chapterData) {
  if (!chapterData?.paragraphs) return null;

  const sentences = [];
  for (const p of chapterData.paragraphs) {
    for (const s of (p.sentences || [])) {
      sentences.push({ id: s.id, text: s.text, page: p.page });
    }
  }

  const n = sentences.length;
  if (n === 0) return null;

  // Compute document frequency for each term
  const df = {};
  const tokenized = sentences.map((s) => {
    const tokens = tokenize(s.text);
    const unique = new Set(tokens);
    for (const t of unique) {
      df[t] = (df[t] || 0) + 1;
    }
    return tokens;
  });

  // Compute IDF
  const idf = {};
  for (const term in df) {
    idf[term] = Math.log(n / df[term]);
  }

  // Build TF-IDF sparse vectors for each sentence
  const vectors = tokenized.map((tokens) => {
    const tf = {};
    for (const t of tokens) {
      tf[t] = (tf[t] || 0) + 1;
    }
    const vec = {};
    for (const t in tf) {
      vec[t] = tf[t] * (idf[t] || 0);
    }
    return vec;
  });

  return { sentences, idf, vectors };
}

function cosineSimilarity(vecA, vecB) {
  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (const t in vecA) {
    magA += vecA[t] * vecA[t];
    if (t in vecB) {
      dot += vecA[t] * vecB[t];
    }
  }
  for (const t in vecB) {
    magB += vecB[t] * vecB[t];
  }

  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

export function getMatchedWords(queryText, passageText) {
  const qTokens = new Set(tokenize(queryText));
  const pTokens = tokenize(passageText);
  const matched = new Set();
  for (const pt of pTokens) {
    if (qTokens.has(pt)) {
      matched.add(pt);
    } else {
      for (const qt of qTokens) {
        if (pt.startsWith(qt) || qt.startsWith(pt)) {
          matched.add(pt);
          break;
        }
      }
    }
  }
  return [...matched];
}

export function getConfidenceLabel(score) {
  if (score > 0.4) return 'Strong match';
  if (score > 0.15) return 'Likely match';
  return 'Possible';
}

export function findTopMatches(queryText, corpusIndex, k = 3) {
  if (!corpusIndex || !queryText?.trim()) return [];

  const tokens = tokenize(queryText);
  if (tokens.length === 0) return [];

  // Build query TF-IDF vector
  const tf = {};
  for (const t of tokens) {
    tf[t] = (tf[t] || 0) + 1;
  }
  const queryVec = {};
  for (const t in tf) {
    queryVec[t] = tf[t] * (corpusIndex.idf[t] || 0);
  }

  // Score all sentences
  const scored = corpusIndex.vectors.map((vec, i) => ({
    ...corpusIndex.sentences[i],
    score: cosineSimilarity(queryVec, vec),
  }));

  // Return top k with score > 0, include matched words
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((s) => ({
      ...s,
      matchedWords: getMatchedWords(queryText, s.text),
      confidence: getConfidenceLabel(s.score),
    }));
}

// Fuse.js fuzzy search — better for OCR text with character-level noise
export function buildFuseIndex(chapterData) {
  if (!chapterData?.paragraphs) return null;

  const sentences = [];
  for (const p of chapterData.paragraphs) {
    for (const s of (p.sentences || [])) {
      sentences.push({ id: s.id, text: s.text, page: p.page });
    }
  }

  const fuse = new Fuse(sentences, {
    keys: ['text'],
    threshold: 0.4,
    includeScore: true,
    minMatchCharLength: 3,
  });

  return fuse;
}

export function fuseSearch(fuse, queryText, k = 3) {
  if (!fuse || !queryText?.trim()) return [];
  return fuse.search(queryText).slice(0, k).map((r) => ({
    ...r.item,
    score: 1 - (r.score || 0), // Fuse score is 0=perfect, 1=worst; invert
  }));
}

// Unified search: picks best method based on input source
export function findPassages(queryText, corpusIndex, fuseIndex, method = 'auto', k = 3) {
  if (!queryText?.trim()) return [];

  if (method === 'fuse' || (method === 'auto' && queryText.length > 80)) {
    // Long input (likely OCR) → Fuse.js fuzzy matching
    return fuseSearch(fuseIndex, queryText, k);
  }

  // Short/spoken input → cosine similarity (better for paraphrasing)
  return findTopMatches(queryText, corpusIndex, k);
}
