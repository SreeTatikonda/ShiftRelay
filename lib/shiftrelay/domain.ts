export type Task = {id:string; title:string; owner:string; due:string; blocker:string; source:string; accepted:boolean; status:'open'|'done'; declined?:boolean};
export type Question = {id:string; taskId:string; text:string; answer:string; blocking:boolean; author:string};
export type Handover = {id:string; title:string; from:string; to:string; start:string; end:string; datesAccepted:boolean; requested:boolean; note:string; tasks:Task[]; questions:Question[]; revision:number; created:string};
export type Event = {id:string; at:string; title:string; detail:string; type:string};
export type Workspace = {handovers:Handover[]; events:Event[]; outbox:{id:string; to:string; subject:string; body:string; at:string; mode:string}[]; traces:{at:string; mode:string; steps:string[]}[]};
export function readiness(h:Handover) {
 const checks=[{label:'Coverage requested',ok:h.requested},{label:'Coverage dates confirmed',ok:h.datesAccepted},{label:'Every responsibility accepted',ok:h.tasks.length>0&&h.tasks.every(t=>!!t.owner&&t.accepted&&!t.declined)},{label:'Blocking questions resolved',ok:h.questions.every(q=>!q.blocking||!!q.answer.trim())}];
 return {ready:checks.every(x=>x.ok),checks,percent:Math.round(checks.filter(x=>x.ok).length/checks.length*100)};
}
export function seed():Workspace {
 const at=new Date().toISOString();
 return {handovers:[{id:'acme',title:'Acme launch coverage',from:'Yashu',to:'Priya Shah',start:'2026-11-02',end:'2026-11-06',datesAccepted:false,requested:true,revision:1,created:at,note:'I am away November 2 to 6. Priya is covering the Acme launch. Follow up with finance on Tuesday if pricing approval is missing. Prepare the customer demo for Thursday. Do not send the proposal until pricing is approved.',tasks:[{id:'t1',title:'Follow up on pricing approval',owner:'Priya Shah',due:'2026-11-03',blocker:'Only follow up if finance approval is still missing.',source:'Follow up with finance on Tuesday if pricing approval is missing.',accepted:false,status:'open'},{id:'t2',title:'Prepare the customer demo',owner:'Priya Shah',due:'2026-11-05',blocker:'Do not send the proposal until pricing is approved.',source:'Prepare the customer demo for Thursday. Do not send the proposal until pricing is approved.',accepted:true,status:'open'}],questions:[{id:'q1',taskId:'t2',text:'Where is the latest approved demo deck?',answer:'',blocking:true,author:'Priya Shah'}]}],events:[{id:'e1',at,title:'Coverage requested',detail:'Acme launch · Priya Shah · demo workspace',type:'request'}],outbox:[],traces:[]};
}
export function applyAction(state:Workspace,input:any):Workspace {
 const s=structuredClone(state); const h=s.handovers.find(x=>x.id===input.id);
 const event=(title:string,detail:string,type='update')=>s.events.unshift({id:crypto.randomUUID(),at:new Date().toISOString(),title,detail,type});
 const text=(v:any,max=3000)=>{if(typeof v!=='string'||!v.trim()||v.length>max)throw Error('A non-empty value within the length limit is required.');return v.trim()};
 if(input.action==='create'){
  const x=input.handover; if(!x||!Array.isArray(x.tasks)||!x.tasks.length||x.tasks.length>30)throw Error('Provide 1–30 tasks.');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(x.start)||!/^\d{4}-\d{2}-\d{2}$/.test(x.end)||x.end<x.start)throw Error('Choose valid coverage dates.');
  const tasks=x.tasks.map((t:any)=>({id:crypto.randomUUID(),title:text(t.title,200),owner:typeof t.owner==='string'?t.owner.slice(0,100):'',due:typeof t.due==='string'?t.due.slice(0,10):'',blocker:typeof t.blocker==='string'?t.blocker.slice(0,1500):'',source:typeof t.source==='string'?t.source.slice(0,3000):'',accepted:false,status:'open' as const}));
  s.handovers.unshift({id:crypto.randomUUID(),title:text(x.title,150),from:'Yashu',to:text(x.to,100),start:x.start,end:x.end,note:text(x.note,12000),tasks,questions:[],datesAccepted:false,requested:false,revision:1,created:new Date().toISOString()});event('Handover drafted',x.title,'create');return s;
 }
 if(!h)throw Error('Handover not found.');
 const role=input.persona; // Explicit sandbox personas, not production authorization.
 if(['acceptDates','acceptTask','declineTask','question','complete'].includes(input.action)&&role!=='teammate')throw Error('Switch to the teammate demo view.');
 if(['request','dates','editTask','answer','send'].includes(input.action)&&role!=='owner')throw Error('Switch to the owner demo view.');
 switch(input.action){
 case 'request':h.requested=true;event('Coverage requested',h.title,'request');break;
 case 'acceptDates':if(!h.requested)throw Error('Request coverage first.');h.datesAccepted=true;event('Dates confirmed',`${h.to} · ${h.start} to ${h.end}`,'accept');break;
 case 'acceptTask':case 'declineTask':case 'complete':{
  if(!h.requested)throw Error('Request coverage first.');const t=h.tasks.find(t=>t.id===input.taskId);if(!t)throw Error('Task not found.');if(!t.owner)throw Error('Assign an owner first.');
  if(input.action==='complete'){if(!t.accepted)throw Error('Accept responsibility first.');t.status='done';}else{t.accepted=input.action==='acceptTask';t.declined=input.action==='declineTask';}event(input.action==='complete'?'Task completed':t.accepted?'Responsibility accepted':'Responsibility declined',t.title,'accept');break;}
 case 'question':h.questions.push({id:crypto.randomUUID(),taskId:input.taskId||'',text:text(input.text),answer:'',blocking:input.blocking!==false,author:h.to});event('Clarification requested',input.text,'question');break;
 case 'answer':{const q=h.questions.find(q=>q.id===input.questionId);if(!q)throw Error('Question not found.');q.answer=text(input.text);event('Clarification answered',q.text,'answer');break;}
 case 'dates':if(!/^\d{4}-\d{2}-\d{2}$/.test(input.start)||!/^\d{4}-\d{2}-\d{2}$/.test(input.end)||input.end<input.start)throw Error('Invalid date range.');if(h.start!==input.start||h.end!==input.end){h.start=input.start;h.end=input.end;h.datesAccepted=false;h.tasks.forEach(t=>{t.accepted=false;t.declined=false});h.revision++;event('Coverage changed · reconfirmation required','Dates and responsibilities need acceptance again.','change');}break;
 case 'editTask':{const t=h.tasks.find(t=>t.id===input.taskId);if(!t)throw Error('Task not found.');t.title=text(input.title,200);t.owner=typeof input.owner==='string'?input.owner.slice(0,100):t.owner;t.blocker=String(input.blocker||'').slice(0,1500);t.accepted=false;t.declined=false;h.revision++;event('Responsibility changed',`${t.title} · acceptance reset`,'change');break;}
 case 'send':{
  const to=text(input.to,200);if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to))throw Error('Enter a valid recipient email.');
  const key=text(input.key,100);if(s.outbox.some(x=>x.id===key))return s;
  s.outbox.unshift({id:key,to,subject:text(input.subject,200),body:text(input.body,12000),at:new Date().toISOString(),mode:'simulated'});event('Demo email queued',`${to} · No external message sent`,'email');break;
 }
 default:throw Error('Unknown action.');
 }return s;
}
