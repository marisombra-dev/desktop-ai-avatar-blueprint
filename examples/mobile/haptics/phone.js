'use strict';
const $=id=>document.getElementById(id),pad=$('bodyMap'),status=$('status'),receipt=$('receipt'),marker=$('marker');
let trace=null,seq=-1,lastContact=0,polling=false;const seen=new Set();
const post=async(kind,extra={})=>{const r=await fetch('/api/event',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind,...extra}),cache:'no-store',signal:AbortSignal.timeout(4500)});if(!r.ok)throw Error('HTTP '+r.status);return r.json()};
const send=(kind,extra)=>post(kind,extra).catch(()=>{receipt.textContent='Packet not confirmed. Check connection.'});
const point=e=>{const r=pad.getBoundingClientRect();return {x:Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),y:Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))}};
const mark=p=>{marker.setAttribute('cx',p.x*300);marker.setAttribute('cy',p.y*440);marker.setAttribute('visibility','visible')};
pad.addEventListener('pointerdown',e=>{if(trace)return;const p=point(e),t=performance.now();trace={id:e.pointerId,eventId:crypto.randomUUID(),start:p,last:p,path:0,t,liveAt:t};pad.setPointerCapture(e.pointerId);mark(p);void send('touch_live',{active:true,...p})});
pad.addEventListener('pointermove',e=>{if(trace?.id!==e.pointerId)return;const p=point(e);trace.path+=Math.hypot(p.x-trace.last.x,p.y-trace.last.y);trace.last=p;mark(p);if(performance.now()-trace.liveAt>=250){trace.liveAt=performance.now();void send('touch_live',{active:true,...p})}});
function finish(e,cancelled){if(trace?.id!==e.pointerId)return;const tr=trace,p=point(e);trace=null;marker.setAttribute('visibility','hidden');if(pad.hasPointerCapture(e.pointerId))pad.releasePointerCapture(e.pointerId);void send('touch_live',{active:false});if(cancelled)return;tr.path+=Math.hypot(p.x-tr.last.x,p.y-tr.last.y);void send('touch_trace',{eventId:tr.eventId,startX:tr.start.x,startY:tr.start.y,lastX:p.x,lastY:p.y,path:tr.path,durationMs:Math.max(1,performance.now()-tr.t)}).then(r=>{if(r?.summary)receipt.textContent='Received: '+r.summary})}
pad.addEventListener('pointerup',e=>finish(e,false));pad.addEventListener('pointercancel',e=>finish(e,true));pad.addEventListener('lostpointercapture',e=>finish(e,true));
function connected(){lastContact=Date.now();status.textContent='Connected to companion'}
function command(c){
 if(Number.isSafeInteger(c.seq)){if(seen.has(c.seq))return;seen.add(c.seq);if(seen.size>128)seen.delete(seen.values().next().value)}
 if(c.type!=='haptic')return;
 if(Date.now()-c.at>15000)return;
 let accepted=false;try{if($('vibrate').checked&&typeof navigator.vibrate==='function')accepted=navigator.vibrate(c.pattern)===true}catch{}
 receipt.textContent=accepted?'Browser accepted vibration request':'Vibration not accepted or disabled';
 void send('haptic_ack',{id:c.id,accepted});
}
const stream=new EventSource('/api/stream');stream.addEventListener('ready',connected);stream.addEventListener('command',e=>{try{command(JSON.parse(e.data));connected()}catch{}});
async function poll(){if(polling||document.hidden)return;polling=true;try{const r=await fetch('/api/poll?since='+seq,{cache:'no-store',signal:AbortSignal.timeout(4500)});if(!r.ok)throw Error('HTTP');const p=await r.json();if(!p.ok||!Array.isArray(p.commands)||!Number.isSafeInteger(p.seq))throw Error('Invalid sync');if(p.seq<seq)seen.clear();p.commands.forEach(command);seq=p.seq;connected()}catch{if(Date.now()-lastContact>5000)status.textContent='Reconnecting…'}finally{polling=false}}
setInterval(poll,1100);void poll();
$('test').addEventListener('click',()=>{if(!$('vibrate').checked){receipt.textContent='Enable vibration first';return}void send('haptic_request',{})});
document.addEventListener('visibilitychange',()=>{if(document.hidden){trace=null;marker.setAttribute('visibility','hidden');void send('touch_live',{active:false})}else void poll()});
