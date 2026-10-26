import { env } from 'cloudflare:workers';
import { seed, type Workspace } from './domain';
export async function load(user:string){
 const db=(env as any).DB;
 if(!db)throw Error('Database binding unavailable.');
 await db.prepare('INSERT OR IGNORE INTO workspaces (id,data,revision) VALUES (?,?,0)').bind(user,JSON.stringify(seed())).run();
 const row=await db.prepare('SELECT data,revision FROM workspaces WHERE id=?').bind(user).first();
 return {state:JSON.parse(row.data) as Workspace,revision:row.revision as number};
}
export async function save(user:string,state:Workspace,revision:number){
 const r=await (env as any).DB.prepare('UPDATE workspaces SET data=?,revision=revision+1 WHERE id=? AND revision=?').bind(JSON.stringify(state),user,revision).run();
 if(!r.meta.changes)throw Error('This workspace changed in another tab. Refresh and try again.');
 return revision+1;
}
export function identity(req:Request){const id=req.headers.get('oai-authenticated-user-id') || (import.meta.env.DEV ? 'local-development-owner' : null);if(!id)throw Error('Sign in to use this private pilot.');return id;}
export function checkOrigin(req:Request){const origin=req.headers.get('origin');if(origin&&origin!==new URL(req.url).origin)throw Error('Cross-origin request denied.');}
export function json(data:any,status=200){return Response.json(data,{status,headers:{'Cache-Control':'private, no-store'}})}
