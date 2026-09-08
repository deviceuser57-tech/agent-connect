/**
 * Intent Lock — post-generation alignment check.
 * Compares the ROOT intent (the user's very first request) with the generated
 * system spec, to catch "task intent drift" (e.g. a Legal Appeal Memo Review
 * request that ends up producing a generic "Run Command Resolver").
 */

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'for', 'to', 'in', 'on', 'with', 'that', 'this',
  'is', 'are', 'be', 'by', 'from', 'as', 'at', 'it', 'we', 'i', 'you', 'my', 'our',
  'need', 'want', 'please', 'build', 'create', 'make', 'design', 'system', 'workflow',
  'agent', 'agents', 'team', 'process', 'pipeline', 'help', 'can', 'should', 'would',
  'will', 'about', 'into', 'using', 'use', 'me', 'us', 'their', 'them', 'have', 'has',
]);

export interface IntentAlignmentResult {
  checked: boolean;
  aligned: boolean;
  score: number;
  keyTerms: string[];
  missingTerms: string[];
}

const tokenize = (text: string): string[] =>
  (text.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? []).filter((w) => !STOP_WORDS.has(w));

const stem = (w: string) => w.replace(/(ing|ers|er|ed|s)$/u, '');

export function extractKeyTerms(intent: string, limit = 12): string[] {
  const counts = new Map<string, { term: string; n: number }>();
  for (const w of tokenize(intent)) {
    const k = stem(w);
    const prev = counts.get(k);
    if (prev) prev.n += 1;
    else counts.set(k, { term: w, n: 1 });
  }
  return [...counts.values()]
    .sort((a, b) => b.n - a.n || b.term.length - a.term.length)
    .slice(0, limit)
    .map((e) => e.term);
}

export function checkIntentAlignment(
  rootIntent: string | null | undefined,
  workflow: unknown,
): IntentAlignmentResult {
  const empty: IntentAlignmentResult = {
    checked: false, aligned: true, score: 1, keyTerms: [], missingTerms: [],
  };
  if (!rootIntent || !workflow) return empty;

  const keyTerms = extractKeyTerms(rootIntent);
  if (keyTerms.length === 0) return empty;

  let spec = '';
  try {
    spec = JSON.stringify(workflow).toLowerCase();
  } catch {
    return empty;
  }

  const missingTerms = keyTerms.filter((t) => !spec.includes(stem(t)));
  const score = (keyTerms.length - missingTerms.length) / keyTerms.length;

  return {
    checked: true,
    aligned: score >= 0.34,
    score,
    keyTerms,
    missingTerms,
  };
}
