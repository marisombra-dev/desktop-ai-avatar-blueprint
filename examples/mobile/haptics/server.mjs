// Portable single paired phone reference; Node 20+. Use authenticated HTTPS proxy.
import http from 'node:http';
import fs from 'node:fs';
import {randomUUID,timingSafeEqual} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const validNum=n=>typeof n==='number'&&Number.isFinite(n);
const equal=(a,b)=>{const x=Buffer.from(String(a??'')),y=Buffer.from(String(b??''));return x.length===y.length&&timingSafeEqual(x,y)};
const fail=(status,error)=>Object.assign(new Error(error),{status});
export function classify(d){
 if(!d||!['startX','startY','lastX','lastY','path','durationMs'].every(k=>validNum(d[k]))||d.path<0||d.durationMs<1||d.durationMs>30000)throw fail(400,'Invalid trace');
 const startX=clamp(d.startX,0,1),startY=clamp(d.startY,0,1),endX=clamp(d.lastX,0,1),endY=clamp(d.lastY,0,1),p=clamp(d.path,0,10);
 const region=(x,y)=>y<.23?'head':y>.70?'leg':x<.28?'avatar right arm':x>.72?'avatar left arm':'torso';
 return {gesture:p<.025&&d.durationMs<340?'tap':p<.03&&d.durationMs>=650?'press':'stroke',startRegion:region(startX,startY),endRegion:region(endX,endY),durationMs:d.durationMs,direction:Math.abs(endX-startX)>Math.abs(endY-startY)*1.4?'horizontal':Math.abs(endY-startY)>Math.abs(endX-startX)*1.4?'vertical':'diagonal',pace:p/(d.durationMs/1000),verifiedBy:'paired-phone'};
}
export function createTouchHub({clock=Date.now,onTouch=()=>{},onLive=()=>{}}={}){
 let seq=0,lastPoll=-Infinity,live=null,lastTouch=-Infinity,lastHaptic=-Infinity;
 const commands=[],pending=new Map(),seen=new Map(),streams=new Set();
 const sweep=()=>{const n=clock();for(const [id,t] of seen)if(n-t>60000)seen.delete(id);while(commands.length&&(commands.length>64||n-commands[0].at>15000))commands.shift();if(live&&n-live.at>1200){live=null;onLive(null)}};
 const command=d=>{const c={...d,seq:++seq,at:clock()};commands.push(c);sweep();for(const r of streams){if(!r.destroyed)r.write('event: command\ndata: '+JSON.stringify(c)+'\n\n')}return c};
 const poll=since=>{if(!Number.isSafeInteger(since)||since< -1)throw fail(400,'Invalid cursor');lastPoll=clock();sweep();return {ok:true,seq,commands:since<0||since>seq?[]:commands.filter(x=>x.seq>since&&clock()-x.at<15000),state:'idle'}};
 function haptic(pattern,reason='touch_reply'){
  const n=clock();if(n-lastPoll>5000&&!streams.size)return Promise.resolve({status:'disconnected'});
  if(n-lastHaptic<1100)return Promise.resolve({status:'cooldown'});
  if(!Array.isArray(pattern)||!pattern.length||pattern.length>16||pattern.some(x=>!validNum(x)||x<0||x>2000)||pattern.reduce((a,b)=>a+b,0)>4000)throw fail(400,'Invalid pattern');
  lastHaptic=n;const id=randomUUID();
  return new Promise(resolve=>{const timer=setTimeout(()=>{pending.delete(id);resolve({id,status:'timeout'})},1400);pending.set(id,{resolve,timer});command({type:'haptic',id,pattern:pattern.map(Math.round),reason})});
 }
 function event(d){
  if(!d||typeof d.kind!=='string')throw fail(400,'Invalid event');
  sweep();const n=clock();
  if(d.kind==='hello')return {ok:true};
  if(d.kind==='bye'){live=null;onLive(null);return {ok:true}}
  if(d.kind==='haptic_ack'){const x=pending.get(d.id);if(!x||typeof d.accepted!=='boolean')return {ok:true,ignored:true};clearTimeout(x.timer);pending.delete(d.id);x.resolve({id:d.id,status:d.accepted?'browser_accepted':'not_accepted'});return {ok:true}}
  if(d.kind==='haptic_request'){void haptic([65,55,120],'test');return {ok:true}}
  if(d.kind==='touch_live'){if(typeof d.active!=='boolean'||(d.active&&(!validNum(d.x)||!validNum(d.y))))throw fail(400,'Invalid live touch');live=d.active?{x:clamp(d.x,0,1),y:clamp(d.y,0,1),at:n}:null;onLive(live);return {ok:true}}
  if(d.kind==='touch_trace'){
   if(typeof d.eventId!=='string'||!/^[a-f0-9-]{36}$/i.test(d.eventId))throw fail(400,'Invalid event ID');
   if(seen.has(d.eventId))return {ok:true,duplicate:true};
   const touch=classify(d);if(n-lastTouch<150)throw fail(429,'Touch rate limit');
   lastTouch=n;seen.set(d.eventId,n);live=null;onLive(null);
   const receipt={id:d.eventId,kind:'touch',at:n,touch};onTouch(receipt);
   return {ok:true,summary:touch.gesture+' on '+touch.endRegion,receivedAt:n};
  }
  throw fail(400,'Unknown event');
 }
 return {poll,event,haptic,addStream:r=>{streams.add(r);r.once('close',()=>{streams.delete(r);if(!streams.size&&clock()-lastPoll>5000){live=null;onLive(null)}})},snapshot:()=>{sweep();return {connected:clock()-lastPoll<=5000||streams.size>0,live}},setState:state=>{if(['idle','listening','thinking','speaking','working'].includes(state))command({type:'presence-state',state})}};
}
export function createTouchServer({ownerLogin,hub=createTouchHub()}){
 if(!ownerLogin)throw Error('Proxy owner login required');
 const html=fs.readFileSync(new URL('./phone.html',import.meta.url),'utf8'),js=fs.readFileSync(new URL('./phone.js',import.meta.url),'utf8');
 return http.createServer(async(req,res)=>{
  const send=(n,b,ct='application/json; charset=utf-8')=>{res.writeHead(n,{'Content-Type':ct,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'"});res.end(typeof b==='string'?b:JSON.stringify(b))};
  try{
   if(!equal(req.headers['tailscale-user-login'],ownerLogin))throw fail(403,'Private identity required');
   const u=new URL(req.url,'http://localhost');
   if(req.method==='GET'&&u.pathname==='/')return send(200,html,'text/html; charset=utf-8');
   if(req.method==='GET'&&u.pathname==='/phone.js')return send(200,js,'text/javascript; charset=utf-8');
   if(req.method==='GET'&&u.pathname==='/api/poll')return send(200,hub.poll(Number(u.searchParams.get('since')??-1)));
   if(req.method==='GET'&&u.pathname==='/api/stream'){
    res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-store','X-Accel-Buffering':'no'});res.write('event: ready\ndata: {"ok":true}\n\n');hub.addStream(res);
    const timer=setInterval(()=>res.write(': ping\n\n'),15000);timer.unref();res.once('close',()=>clearInterval(timer));return;
   }
   if(req.method==='POST'&&u.pathname==='/api/event'){
    if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']??''))throw fail(415,'JSON required');
    let raw='';for await(const c of req){raw+=c;if(Buffer.byteLength(raw)>4096)throw fail(413,'Too large')}
    let d;try{d=JSON.parse(raw)}catch{throw fail(400,'Invalid JSON')}return send(200,hub.event(d));
   }
   throw fail(404,'Not found');
  }catch(e){if(!res.headersSent)send(e.status??500,{error:e.status?e.message:'Request failed'});else res.destroy()}
 });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 // Synthetic demo does not call a model or log personal touch traces.
 const hub=createTouchHub({onTouch:()=>{void hub.haptic([30],'touch_reply')}});
 createTouchServer({ownerLogin:process.env.COMPANION_OWNER_LOGIN,hub}).listen(19942,'127.0.0.1',()=>console.log('Private touch demo on loopback'));
}
