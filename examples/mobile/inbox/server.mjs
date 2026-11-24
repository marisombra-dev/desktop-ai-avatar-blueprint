// Portable reference; Node 20+. One writer owns state. No model calls.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {randomUUID,timingSafeEqual} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const DAY=86400000, HOUR=3600000;
const uuid=x=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x);
const messageId=x=>typeof x==='string'&&/^ses_[A-Za-z0-9]+$/.test(x);
const equal=(a,b)=>{const x=Buffer.from(String(a??'')),y=Buffer.from(String(b??''));return x.length===y.length&&timingSafeEqual(x,y)};
const fresh=(x,n,age)=>n-Date.parse(x.at)>=0&&n-Date.parse(x.at)<age;
const fail=(status,error)=>Object.assign(new Error(error),{status});
function save(file,data){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=file+'.'+randomUUID()+'.tmp';fs.writeFileSync(tmp,JSON.stringify(data,null,2),{mode:0o600});fs.renameSync(tmp,file)}
async function body(req){if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']??''))throw fail(415,'JSON required');let b='';for await(const chunk of req){b+=chunk;if(Buffer.byteLength(b)>4096)throw fail(413,'Too large')}try{return JSON.parse(b)}catch{throw fail(400,'Invalid JSON')}}
export function createInbox({file,ownerLogin,workerSecret,apk,enabled=true,repliesEnabled=true,clock=Date.now}){
 if(!file||!ownerLogin||typeof workerSecret!=='string'||workerSecret.length<32)throw Error('Private state, proxy identity and worker secret required');
 let s=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{messages:[],notes:[],receipts:{}};
 const commit=fn=>{const next=structuredClone(s),result=fn(next);save(file,next);s=next;return result};
 const messages=n=>s.messages.filter(x=>fresh(x,n,7*DAY)).slice(-20);
 const server=http.createServer(async(req,res)=>{
  const send=(status,value,ct='application/json; charset=utf-8')=>{res.writeHead(status,{'Content-Type':ct,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'"});res.end(typeof value==='string'?value:JSON.stringify(value))};
  try{
   const route=new URL(req.url,'http://localhost').pathname,n=clock(),at=new Date(n).toISOString();
   const worker=route.startsWith('/agent/');
   // Worker endpoints are never phone-authorized. Proxy should also deny /agent/*.
   if(worker?!equal(req.headers.authorization,'Bearer '+workerSecret):!equal(req.headers['tailscale-user-login'],ownerLogin))throw fail(403,'Private identity required');
   if(req.method==='GET'&&route==='/')return send(200,'<!doctype html><meta name="viewport" content="width=device-width"><h1>Companion Inbox</h1><p><a href="/Ethan-Inbox.apk">Install or update Android inbox</a></p><p>Open the app and allow notifications. Start receiving.</p>','text/html; charset=utf-8');
   if(req.method==='GET'&&route==='/Ethan-Inbox.apk'&&apk&&fs.existsSync(apk)){res.writeHead(200,{'Content-Type':'application/vnd.android.package-archive','Cache-Control':'no-store','Content-Disposition':'attachment; filename="Companion-Inbox.apk"'});return fs.createReadStream(apk).pipe(res)}
   if(req.method==='GET'&&route==='/messages')return send(200,{messages:messages(n),notes:s.notes.filter(x=>fresh(x,n,30*DAY)).slice(-100).map(({id,replyTo,text,at,reviewedAt})=>({id,replyTo,text,at,status:reviewedAt?'reviewed':'received'})),enabled});
   if(req.method==='POST'&&route==='/note'){
    if(!repliesEnabled||!enabled)throw fail(403,'Notes disabled');
    const d=await body(req),text=typeof d?.text==='string'?d.text.trim():'';
    if(!uuid(d?.id)||!text||text.length>500||!(d.replyTo===null||messageId(d.replyTo)))throw fail(400,'Invalid note');
    const old=s.notes.find(x=>x.id===d.id);
    if(old){if(old.text!==text||old.replyTo!==d.replyTo)throw fail(409,'Conflicting ID');return send(200,{ok:true,id:old.id,at:old.at})}
    const original=messages(n).find(x=>x.id===d.replyTo);
    if(d.replyTo&&!original)throw fail(400,'Original no longer available; send a new note');
    if(s.notes.filter(x=>fresh(x,n,DAY)).length>=30)throw fail(429,'Daily limit');
    commit(v=>v.notes.push({id:d.id,replyTo:d.replyTo,text,at,original:original??null}));return send(200,{ok:true,id:d.id,at});
   }
   if(req.method==='POST'&&route==='/receipt'){
    const d=await body(req);if(!messages(n).some(x=>x.id===d?.id)||!['notification_posted','opened'].includes(d.kind))throw fail(400,'Invalid receipt');
    commit(v=>{v.receipts[d.id]??={};v.receipts[d.id][d.kind]??=at});return send(200,{ok:true});
   }
   if(req.method==='GET'&&route==='/agent/pending')return send(200,{notes:enabled&&repliesEnabled?s.notes.filter(x=>!x.reviewedAt).slice(0,5):[]});
   if(req.method==='POST'&&route==='/agent/complete'){
    // One atomic operation: mark reviewed and optionally publish one reply.
    const d=await body(req);if(!enabled||!repliesEnabled)throw fail(403,'Notes disabled');
    if(!uuid(d?.noteId)||!messageId(d.cycleId))throw fail(400,'Invalid completion');
    const note=s.notes.find(x=>x.id===d.noteId);if(!note)throw fail(404,'Unknown note');
    if(note.reviewedAt){if(note.cycleId!==d.cycleId)throw fail(409,'Already reviewed');return send(200,{ok:true,duplicate:true,messageId:note.responseId??null})}
    const text=typeof d.text==='string'?d.text.trim():'';
    if(d.text!==undefined&&(!text||text.length>1000))throw fail(400,'Invalid response');
    if(text&&s.messages.filter(x=>x.replyToNote&&fresh(x,n,DAY)).length>=6)throw fail(429,'Reply limit; keep note pending');
    if(text&&s.messages.some(x=>x.id===d.cycleId))throw fail(409,'Message ID already used');
    const id=commit(v=>{const a=v.notes.find(x=>x.id===d.noteId);a.reviewedAt=at;a.cycleId=d.cycleId;if(text){a.responseId=d.cycleId;v.messages.push({id:d.cycleId,at,text,replyToNote:a.id})}return a.responseId??null});
    return send(200,{ok:true,messageId:id});
   }
   if(req.method==='POST'&&route==='/agent/publish'){
    if(!enabled)throw fail(403,'Disabled');
    const d=await body(req),text=typeof d?.text==='string'?d.text.trim():'';
    if(!messageId(d?.id)||!text||text.length>1000)throw fail(400,'Invalid message');
    const old=s.messages.find(x=>x.id===d.id);if(old){if(old.text!==text||old.replyToNote)throw fail(409,'Conflicting ID');return send(200,{ok:true,duplicate:true})}
    const recent=s.messages.filter(x=>!x.replyToNote&&fresh(x,n,DAY));
    if(recent.length>=2||recent.some(x=>fresh(x,n,3*HOUR)))throw fail(429,'Unsolicited message limit');
    commit(v=>v.messages.push({id:d.id,at,text}));return send(200,{ok:true});
   }
   throw fail(404,'Not found');
  }catch(e){if(!res.headersSent)send(e.status??500,{error:e.status?e.message:'Request failed'});else res.destroy()}
 });
 return server;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const {COMPANION_STATE,COMPANION_OWNER_LOGIN,COMPANION_WORKER_SECRET,COMPANION_APK,COMPANION_ENABLED}=process.env;
 createInbox({file:COMPANION_STATE,ownerLogin:COMPANION_OWNER_LOGIN,workerSecret:COMPANION_WORKER_SECRET,apk:COMPANION_APK,enabled:COMPANION_ENABLED==='true'}).listen(19941,'127.0.0.1',()=>console.log('Private inbox on loopback'));
}
