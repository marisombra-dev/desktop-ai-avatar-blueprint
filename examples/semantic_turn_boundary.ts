export interface TurnBoundaryPrediction {
  source: string;
  endOfTurn: boolean;
  probability?: number;
  threshold?: number;
}

function cleanTurn(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, ' ')
    .replace(/[.!?,;:\-"']+$/g, '')
    .trim();
}

export function looksLikeUnfinishedTurn(text: string): boolean {
  const value = cleanTurn(text);
  if (!value) return false;
  if (/\b(?:and|but|because|or|just|with|without|for|from|about|of|the|a|an|my|your|our|their)$/i.test(value)) return true;
  if (/\b(?:the reason is|what i mean is|what i'm saying is|here's why|here is why)$/i.test(value)) return true;
  if (/\b(?:i|we|you|they) (?:was|were|am|are|'m|'re)? ?(?:going|trying|planning|hoping|meaning) to$/i.test(value)) return true;
  return false;
}

/**
 * A semantic-audio detector is advisory. If none is available, preserve a
 * deterministic transcript fallback. If the optional worker fails, callers
 * should omit the prediction instead of trapping the user in an open turn.
 */
export function resolveTurnBoundary(
  transcript: string,
  prediction?: TurnBoundaryPrediction,
): 'complete' | 'continue' {
  if (prediction) {
    if (!prediction.source.trim()) throw new Error('Prediction source is required.');
    if (prediction.probability !== undefined
        && (!Number.isFinite(prediction.probability)
          || prediction.probability < 0 || prediction.probability > 1)) {
      throw new Error('Turn probability must be between 0 and 1.');
    }
    return prediction.endOfTurn ? 'complete' : 'continue';
  }
  return looksLikeUnfinishedTurn(transcript) ? 'continue' : 'complete';
}

/** Bound optional semantic analysis to the just-finished utterance tail. */
export function tailTurnAudio(
  pcm: Float32Array,
  sampleRate: number,
  maxSeconds = 8,
): Float32Array {
  if (!Number.isFinite(sampleRate) || sampleRate < 8_000 || sampleRate > 96_000) {
    throw new Error('Unsupported sample rate.');
  }
  const limit = Math.max(1, Math.floor(sampleRate * Math.max(0.25, maxSeconds)));
  return pcm.length <= limit ? pcm.slice() : pcm.slice(pcm.length - limit);
}
