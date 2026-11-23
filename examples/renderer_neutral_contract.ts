/**
 * Two-path sanitized contract for a 3D MetaHuman or neural 2D renderer.
 * No identity, model credentials, image assets or backend bindings.
 * Architecture sample, NOT a runnable full renderer.
 */
export type Activity = 'idle'|'listening'|'thinking'|'speaking'|'interrupted';
export type Mood = 'neutral'|'smile'|'amused'|'delighted'|'curious'|'concerned';
export type RendererCue = {
  sequence: number;
  turnId: string;
  issuedAtMs: number;
  expiresAtMs: number;
  activity?: Activity;
  mood?: { name: Mood; strength: number; durationMs: number };
  gaze?: { source: 'screen'|'camera'; x: number; y: number; strength: number };
  head?: { yawDegrees: number; pitchDegrees: number; rollDegrees: number };
  cancelUtteranceId?: string;
};
export interface RendererAdapter {
  start(): Promise<void>;
  send(cue: RendererCue): Promise<void>;
  health(): Promise<{ready:boolean; owner:string; lastFrameAtMs?:number}>;
  stop(): Promise<void>;
}
export function clamp(value:number, min:number, max:number):number {
  return Math.min(max,Math.max(min,value));
}
/** One owner, ordered generation, bounded values, stale event rejection. */
export class CueGate {
  private owner = '';
  private lastSequence = -1;
  private canceled = new Set<string>();
  acquire(owner:string):void {
    if(!owner) throw new Error('Renderer owner required');
    this.owner=owner;this.lastSequence=-1;this.canceled.clear();
  }
  release(owner:string):void {
    if(this.owner===owner){this.owner='';this.canceled.clear();}
  }
  normalize(owner:string, cue:RendererCue, now:number):RendererCue|null {
    if(owner!==this.owner || !owner || !Number.isFinite(now) ||
      !cue.turnId || !Number.isSafeInteger(cue.sequence) ||
      cue.sequence<=this.lastSequence || cue.expiresAtMs<=now ||
      cue.issuedAtMs>now+1000 || cue.expiresAtMs>now+10000)return null;
    this.lastSequence=cue.sequence;
    if(cue.cancelUtteranceId)this.canceled.add(cue.cancelUtteranceId);
    if(cue.mood && !['neutral','smile','amused','delighted','curious','concerned'].includes(cue.mood.name))return null;
    return {
      ...cue,
      mood:cue.mood&&{name:cue.mood.name,strength:clamp(cue.mood.strength,0,1),
        durationMs:clamp(cue.mood.durationMs,0,6000)},
      gaze:cue.gaze&&{source:cue.gaze.source,x:clamp(cue.gaze.x,-1,1),
        y:clamp(cue.gaze.y,-1,1),strength:clamp(cue.gaze.strength,0,1)},
      head:cue.head&&{yawDegrees:clamp(cue.head.yawDegrees,-14,14),
        pitchDegrees:clamp(cue.head.pitchDegrees,-6,6),
        rollDegrees:clamp(cue.head.rollDegrees,-5,5)}
    };
  }
  isCanceled(utteranceId:string):boolean{return this.canceled.has(utteranceId);}
}
