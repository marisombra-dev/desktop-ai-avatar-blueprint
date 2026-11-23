/**
 * Public synthetic interface for a paired phone touch/haptic peripheral.
 * Server recomputes regions using a privately configured body-map geometry.
 * A browser accepted ack is NOT physical proof that a motor vibrated.
 */
export type Gesture='tap'|'press'|'stroke';
export type TouchTrace={startX:number;startY:number;endX:number;endY:number;
  pathLength:number;durationMs:number};
export type ClassifiedTouch={gesture:Gesture;direction:'horizontal'|'vertical'|'diagonal';
  speed:'slow'|'steady'|'quick'};
const clamp=(n:number,lo:number,hi:number)=>Math.min(hi,Math.max(lo,n));
export function classifyTouch(input:TouchTrace):ClassifiedTouch {
  for(const n of Object.values(input))if(!Number.isFinite(n))throw new TypeError('Invalid touch coordinate');
  const path=clamp(input.pathLength,0,1000),duration=clamp(input.durationMs,1,30000);
  const gesture:Gesture=path<0.025&&duration<340?'tap':path<0.03&&duration>=650?'press':'stroke';
  const dx=Math.abs(clamp(input.endX,0,1)-clamp(input.startX,0,1));
  const dy=Math.abs(clamp(input.endY,0,1)-clamp(input.startY,0,1));
  const direction=dx>dy*1.4?'horizontal':dy>dx*1.4?'vertical':'diagonal';
  const pace=path/Math.max(.08,duration/1000);
  return {gesture,direction,speed:pace<.2?'slow':pace>.8?'quick':'steady'};
}
export function sanitizeVibrationPattern(pattern:number[]):number[]{
  return pattern.slice(0,16).filter(Number.isFinite).map(n=>Math.round(clamp(n,0,2000)));
}
export type HapticAck={id:string;accepted:boolean;at:number};
/** Keep a bounded pending map keyed by message ID; expire it on disconnect. */
export function ackIsClaimable(pendingId:string,ack:HapticAck,expiresAt:number,now:number):boolean {
  return Boolean(pendingId&&ack.id===pendingId&&ack.accepted===true&&
    Number.isFinite(ack.at)&&now<=expiresAt);
}
// ackIsClaimable means "browser accepted a pattern", not "person felt it".
// Production requires explicit user opt-out, pairing, authentication,
// browser support checks, rate limits and safe network exposure.
