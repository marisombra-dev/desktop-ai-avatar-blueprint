/**
 * Sanitized expression/voice routing example.
 * A face tag is non-spoken sideband metadata, not a stage direction.
 * This sample is intentionally conservative; implement your own full
 * English/Spanish command grammar and stream parser with tests.
 */
export type FaceMood = 'neutral'|'smile'|'amused'|'delighted'|'curious'|'concerned';
const TAG = /^\\s*<face:(neutral|smile|amused|delighted|curious|concerned)>\\s*/i;
export interface VisualSpokenSplit {spokenText:string; mood?:FaceMood}
/** Call after a streaming parser has buffered a complete tag prefix. */
export function splitVisualCueFromSpeech(answer:string):VisualSpokenSplit {
  const match=answer.match(TAG);
  return {spokenText:match?answer.slice(match[0].length):answer,
    mood:match?.[1]?.toLowerCase() as FaceMood|undefined};
}
/** Strictly reject quoted descriptions of an expression. */
export function directSmileIntent(utterance:string):FaceMood|undefined {
  const normalized=utterance.toLowerCase().replace(/[.,!?]+/g,' ').replace(/\\s+/g,' ').trim();
  if(/\\b(don't|do not|never|stop|why|how|test|fix|code|said|asked|if|when)\\b/.test(normalized))return;
  const phrase=normalized.replace(/^(hey|hello|okay|ok|please|can you|could you|would you|show me|give me)\\s+/g,'');
  if(/^(?:a\\s+|your\\s+)?(?:really\\s+|very\\s+)?(?:big|wide|huge|broad|delighted)\\s+(?:smile|grin)(?:\\s+for me)?$/.test(phrase))return 'delighted';
  if(/^(?:(?:a|your)\\s+)?(?:smile|grin)(?:\\s+for me)?$/.test(phrase))return 'smile';
}
/** Priority: direct request > concern > selected model cue > conservative fallback. */
export function chooseMood(input:{direct?:FaceMood;contextConcerned:boolean;model?:FaceMood;fallback?:FaceMood}):FaceMood {
  if(input.direct)return input.direct;
  if(input.contextConcerned)return 'concerned';
  return input.model??input.fallback??'neutral';
}
export function boundedLease(mood:FaceMood,strength:number,durationMs:number) {
  return {kind:'mood' as const,name:mood,
    strength:Math.max(0,Math.min(1,strength)),
    durationMs:Math.max(800,Math.min(6000,durationMs))};
}
// This file alone does not implement audio-stream lookahead, facial rendering,
// local ASR ownership, stale-turn rejection or native landmark deformation.
