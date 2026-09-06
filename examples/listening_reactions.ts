export type ListeningReaction = {
  mood?: 'Happiness' | 'Playfulness' | 'Surprise' | 'Sadness' | 'Excitement' | 'Confusion';
  moodIntensity?: number;
  gesture?: 'BROWR';
  gestureIntensity?: number;
  headGesture?: 'nod';
  headGestureIntensity?: number;
};

const RULES: Array<{ pattern: RegExp; reaction: ListeningReaction }> = [
  { pattern: /\b(?:exactly|that's what i mean|that is what i mean|i agree)\b/i, reaction: { mood: 'Happiness', moodIntensity: 0.08, headGesture: 'nod', headGestureIntensity: 0.36 } },
  { pattern: /\b(?:hear me out|what if|weird idea|strange idea|doesn't make sense)\b/i, reaction: { mood: 'Confusion', moodIntensity: 0.14, gesture: 'BROWR', gestureIntensity: 0.30 } },
  { pattern: /\b(?:and then the (?:weirdest|strangest|funniest) thing|here(?:'s| is) the (?:weird|strange|funny) part)\b/i, reaction: { mood: 'Confusion', moodIntensity: 0.08, gesture: 'BROWR', gestureIntensity: 0.13 } },
  { pattern: /\b(?:guess what|can't believe|unexpected|surprised)\b/i, reaction: { mood: 'Surprise', moodIntensity: 0.16, gesture: 'BROWR', gestureIntensity: 0.34 } },
  { pattern: /\b(?:haha|hehe|lol|teasing|joking|kidding|cheeky)\b/i, reaction: { mood: 'Playfulness', moodIntensity: 0.16 } },
  { pattern: /\b(?:sad|crying|died|passed away|awful news|terrible news)\b/i, reaction: { mood: 'Sadness', moodIntensity: 0.14 } },
  { pattern: /\b(?:great news|amazing news|excited|thrilled|can't wait)\b/i, reaction: { mood: 'Excitement', moodIntensity: 0.16 } },
  { pattern: /\b(?:happy|glad|love that|wonderful)\b/i, reaction: { mood: 'Happiness', moodIntensity: 0.14 } },
];

export function classifyListeningReaction(text: string): ListeningReaction | undefined {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return undefined;
  return RULES.find((rule) => rule.pattern.test(clean))?.reaction;
}

export class ListeningReactionGate {
  private reactedThisTurn = false;
  private transcriptSoFar = '';
  private speechStoppedAt = 0;

  onSpeechStarted(): void {
    this.reactedThisTurn = false;
    this.transcriptSoFar = '';
    this.speechStoppedAt = 0;
  }

  onSpeechStopped(now = Date.now()): void {
    this.speechStoppedAt = now;
  }

  onTranscriptDelta(delta: string): ListeningReaction | undefined {
    this.transcriptSoFar = `${this.transcriptSoFar}${delta}`.slice(-400);
    return this.takeReaction(this.transcriptSoFar);
  }

  onTranscriptCompleted(text: string, now = Date.now()): ListeningReaction | undefined {
    const reaction = this.takeReaction(text);
    if (!reaction) return undefined;
    if (reaction.headGesture && this.speechStoppedAt && now - this.speechStoppedAt > 650) {
      return { ...reaction, headGesture: undefined, headGestureIntensity: undefined };
    }
    return reaction;
  }

  private takeReaction(text: string): ListeningReaction | undefined {
    if (this.reactedThisTurn) return undefined;
    const reaction = classifyListeningReaction(text);
    if (!reaction) return undefined;
    this.reactedThisTurn = true;
    return reaction;
  }
}
