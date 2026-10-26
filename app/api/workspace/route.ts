import { env } from 'cloudflare:workers';
import {load,save,identity,checkOrigin,json} from '@/lib/shiftrelay/store';
import {applyAction,readiness} from '@/lib/shiftrelay/domain';
export const dynamic='force-dynamic';
export async function GET(req:Request){try{const x=await load(identity(req));return json({...x,config:{nebius:!!(env as any).NEBIUS_API_KEY&&!!(env as any).NEBIUS_MODEL,model:(env as any).NEBIUS_MODEL||null,mcp:true,externalDelivery:false},readiness:Object.fromEntries(x.state.handovers.map(h=>[h.id,readiness(h)]))})}catch(e){return json({error:(e as Error).message},401)}}
export async function POST(req:Request){try{checkOrigin(req);const user=identity(req);const input=await req.json() as any;const current=await load(user);if(input.revision!==current.revision)return json({error:'Workspace changed. Refresh before continuing.'},409);const state=applyAction(current.state,input);const revision=await save(user,state,current.revision);return json({state,revision})}catch(e){return json({error:(e as Error).message},400)}}
