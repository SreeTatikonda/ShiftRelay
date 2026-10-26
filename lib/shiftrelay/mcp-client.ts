/** Configured server-to-server MCP client. Never accepts a browser-supplied endpoint or token. */
export class MCPClient {
 private session:string|null=null;
 constructor(private endpoint:string,private token:string,private allowedTools:string[]){if(!endpoint.startsWith('https://'))throw Error('MCP endpoint must use HTTPS.');}
 private async rpc(method:string,params:any,id:string|null=crypto.randomUUID()){
  const headers:Record<string,string>={'Content-Type':'application/json',Accept:'application/json, text/event-stream','MCP-Protocol-Version':'2025-03-26',Authorization:`Bearer ${this.token}`};if(this.session)headers['Mcp-Session-Id']=this.session;
  const r=await fetch(this.endpoint,{method:'POST',redirect:'error',headers,body:JSON.stringify({jsonrpc:'2.0',...(id?{id}:{}),method,params}),signal:AbortSignal.timeout(20000)});
  if(!r.ok)throw Error(`MCP request failed (${r.status}); do not automatically retry a write.`);this.session=r.headers.get('Mcp-Session-Id')||this.session;
  if(r.status===202||!id)return null;
  const body=await r.text();let data:any;
  if(r.headers.get('content-type')?.includes('text/event-stream')){const packets=body.split('\n').filter(l=>l.startsWith('data:')).map(l=>JSON.parse(l.slice(5)));data=packets.find(x=>x.id===id);}else data=JSON.parse(body);
  if(!data||data.error||data.result?.isError)throw Error('MCP tool did not confirm success.');return data.result;
 }
 async initialize(){const r=await this.rpc('initialize',{protocolVersion:'2025-03-26',capabilities:{},clientInfo:{name:'shiftrelay',version:'0.1.0'}});await this.rpc('notifications/initialized',{},null);return r;}
 async listTools(){return this.rpc('tools/list',{});}
 async call(name:string,args:any){if(!this.allowedTools.includes(name))throw Error('MCP tool is not allowlisted.');return this.rpc('tools/call',{name,arguments:args});}
}
