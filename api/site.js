import {loginClientKey,reserveLoginAttempt,clearLoginAttempts} from '../lib/login-limit.mjs';
import fs from 'node:fs/promises';import {Readable} from 'node:stream';import worker from '../.generated/worker.mjs';import {bindings} from '../lib/storage.mjs';import {sessionUser,verifyPassword,sessionToken,cookieHeader} from '../lib/auth.mjs';
const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff',...headers}});
export async function dispatch(request,config=process.env){const url=new URL(request.url),path=url.pathname;const user=sessionUser(request.headers.get('cookie'),config);const sameOrigin=()=>request.headers.get('origin')===url.origin&&request.headers.get('x-editor-request')==='1';
 if(path==='/login'){return new Response(await fs.readFile(new URL('../.generated/login.html',import.meta.url)),{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}})}
 if(path==='/api/auth/logout'){if(request.method!=='POST'||!sameOrigin())return json({error:'Not allowed'},403);return json({ok:true},200,{'set-cookie':cookieHeader('',true)})}
 if(path==='/api/auth/login'){
  if(request.method!=='POST'||!sameOrigin())return json({error:'Not allowed'},403);
  if(!config.ADMIN_PASSWORD_HASH||!config.SESSION_SECRET||!config.EDITOR_EMAIL)return json({error:'Editor sign-in is not configured yet.'},503);
  const key=loginClientKey(request,config);const db=bindings(config);
  const attempt=await reserveLoginAttempt(db.sql,key);
  if(!attempt.allowed)return json({error:'Too many attempts from this network. Please try again later.'},429,{'retry-after':String(attempt.retryAfter)});
  const data=await request.json();
  const valid=await verifyPassword(data.password,config.ADMIN_PASSWORD_HASH);
  if(!valid||typeof data.email!=='string'||data.email.toLowerCase()!==config.EDITOR_EMAIL.toLowerCase())return json({error:'Email or password is incorrect.'},401);
  await clearLoginAttempts(db.sql,key);return json({ok:true},200,{'set-cookie':cookieHeader(sessionToken(config.EDITOR_EMAIL,config.SESSION_SECRET))});
 }
 // Authorize BEFORE opening storage; identity never comes from incoming headers.
 if((path==='/admin'||path.startsWith('/admin/')||path.startsWith('/api/editor/'))&&!user)return path.startsWith('/api/')?json({error:'Please sign in again.'},401):new Response(null,{status:302,headers:{location:'/login','cache-control':'no-store'}});
 const storage=bindings(config);return worker.fetch(request,{...storage,EDITOR_EMAIL:config.EDITOR_EMAIL,currentUser:user});
}
export default async function handler(req,res){try{const parsed=new URL(req.url,'https://'+req.headers.host);const route=parsed.searchParams.get('__path');if(route!==null){parsed.pathname='/'+route;parsed.searchParams.delete('__path')}const headers=new Headers();for(const [k,v] of Object.entries(req.headers))if(v!==undefined)headers.set(k,Array.isArray(v)?v.join(','):v);let payload;
 if(!['GET','HEAD'].includes(req.method)){if(req.body!==undefined)payload=Buffer.isBuffer(req.body)?req.body:typeof req.body==='string'?Buffer.from(req.body):Buffer.from(JSON.stringify(req.body));else{const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>3*1024*1024){res.statusCode=413;res.end('Upload is too large');return}chunks.push(chunk)}payload=Buffer.concat(chunks)}if(payload.length>3*1024*1024){res.statusCode=413;res.end('Upload is too large');return}}
 const response=await dispatch(new Request(parsed,{method:req.method,headers,body:payload}));res.statusCode=response.status;response.headers.forEach((v,k)=>res.setHeader(k,v));if(req.method==='HEAD'||!response.body){res.end();return}for await(const chunk of Readable.fromWeb(response.body))res.write(chunk);res.end();
 }catch(error){console.error('Portfolio request failed:',error.message);res.statusCode=503;res.setHeader('content-type','application/json');res.setHeader('cache-control','no-store');res.end(JSON.stringify({error:'The service is temporarily unavailable. Please try again.'}))}}
