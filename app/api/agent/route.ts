import {env} from 'cloudflare:workers';
import {load,save,identity,checkOrigin,json} from '@/lib/shiftrelay/store';
import {runAgent} from '@/lib/shiftrelay/agent';
export const dynamic='force-dynamic';
export async function POST(req:Request){try{checkOrigin(req);const user = await identity(req);const input:any=await req.json();if(typeof input.note!=='string'||input.note.trim().length<10||input.note.length>12000)throw Error('Enter 10–12,000 characters.');if(typeof input.owner!=='string'||input.owner.length>100)throw Error('Invalid covering person.');if(!['demo','live'].includes(input.mode))throw Error('Select an extraction mode.');const r=await runAgent(input,env);const x=await load(user);x.state.traces.unshift({at:new Date().toISOString(),mode:r.mode,steps:r.steps});x.state.traces=x.state.traces.slice(0,50);await save(user,x.state,x.revision);return json(r)}catch(e){return json({error:(e as Error).message},400)}}
