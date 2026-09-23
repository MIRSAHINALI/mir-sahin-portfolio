import {schema,ContentError,validateContent,getContent,renderContent} from '../lib/content.mjs';
// currentUser is set only after server-side session verification.
const JSON_HEADERS={'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:JSON_HEADERS});
class InputError extends Error{}
function owner(request,env){return env.currentUser||null}
function sameOrigin(request){return request.headers.get('origin')===new URL(request.url).origin&&request.headers.get('x-editor-request')==='1'&&request.headers.get('sec-fetch-site')!=='cross-site'}
function text(value,name,max,required=false){if(typeof value!=='string'||value.length>max||(required&&!value.trim()))throw new InputError(`${name} is ${required?'required and ':''}limited to ${max} characters.`);return value.trim()}
function link(value,name,local=false){const s=text(value??'',name,2048);if(!s)return '';if(local&&/^\/(assets|uploads)\/[a-zA-Z0-9_.-]+$/.test(s))return s;let u;try{u=new URL(s)}catch{throw new InputError(`${name} must be a valid HTTPS URL.`)}if(u.protocol!=='https:'||u.username||u.password)throw new InputError(`${name} must use HTTPS.`);if(name==='GitHub link'&&u.hostname!=='github.com')throw new InputError('Use a github.com link.');return u.href}
export function validateProject(input,previous){if(!input||typeof input!=="object"||Array.isArray(input))throw new InputError("Invalid project data.");return {...previous,title:text(input.title,'Title',160,true),category:text(input.category,'Category',100,true),description:text(input.description,'Description',2500,true),stack:Array.isArray(input.stack)&&input.stack.length<=30?input.stack.map(v=>text(v,'Technology',80,true)):(()=>{throw new InputError('Enter up to 30 technologies.')})(),date:text(input.date??'','Date',100),image:link(input.image,'Image',true),github:link(input.github,'GitHub link'),demo:link(input.demo,'Live demo')};}
async function body(request,limit){const reader=request.body?.getReader();if(!reader)throw new InputError('Request is empty.');let chunks=[],size=0;while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel();throw new InputError('File or request is too large.')}chunks.push(value)}const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length}return bytes}
async function input(request){try{return JSON.parse(new TextDecoder().decode(await body(request,24000)))}catch(e){if(e instanceof InputError||e instanceof ContentError)throw e;throw new InputError('Invalid form data.')}}
async function projectList(env){const result=await env.DB.prepare('SELECT id,payload,version,position FROM projects ORDER BY position,id').all();const saved=new Map(result.results.map(r=>[r.id,{...JSON.parse(r.payload),id:r.id,version:r.version,position:r.position}]));const list=SEEDS.map((p,i)=>saved.get(p.id)||{...p,version:0,position:i});for(const p of saved.values())if(!SEEDS.some(s=>s.id===p.id))list.push(p);return list.sort((a,b)=>a.position-b.position)}
function projectCard(p,index){const base=SEEDS.find(s=>s.id===p.id);const useOriginal=base&&(p.image||'')===(base.image||'');const art=useOriginal?ART[p.id]:p.image?`<div class="project-art supplied-art animated-supplied"><img src="${esc(p.image)}" alt="${esc(p.title)}" loading="lazy"></div>`:`<div class="project-art"><span class="art-label">${esc(p.category)}</span><span class="art-name">${esc(p.title)}</span></div>`;return `<button class="project-card media-card observe" data-project="${index}" aria-label="Read about ${esc(p.title)}">${art}<div class="project-info"><span class="eyebrow">${esc(p.category)}${p.date?' · '+esc(p.date):''}</span><h2>${esc(p.title)}</h2><p class="project-desc">${esc(p.description)}</p><div class="project-stack">${p.stack.map(esc).join(', ')}</div><span class="profile-action">Project details ↗</span></div></button>`}
function html(markup,status=200){return new Response(markup,{status,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'strict-origin-when-cross-origin','content-security-policy':"default-src 'self'; img-src 'self' https: data: blob:; media-src 'self' https:; style-src 'self' 'unsafe-inline'; script-src 'self'; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'"}})}
export default {async fetch(request,env){const url=new URL(request.url),path=url.pathname;try{
 if(path==='/admin'||path==='/admin/'||path==='/admin/content'||path==='/admin/content/'){
  if(!env.currentUser)return new Response(null,{status:302,headers:{location:'/login','cache-control':'no-store'}});
  if(!owner(request,env))return html('<!doctype html><html><head><title>Editor access</title></head><body><h1>Owner access only</h1><p>Sign in with the account that owns this portfolio.</p><a href="/login" target="_top">Switch account</a></body></html>',403);
  return html(path.startsWith('/admin/content')?CONTENT_ADMIN:ADMIN);
 }
 if(path.startsWith('/api/editor/')){
  const user=owner(request,env);if(!user)return json({error:'Sign in with the portfolio owner account.'},env.currentUser?403:401);
  if(request.method!=='GET'&&!sameOrigin(request))return json({error:'Refresh the editor before saving.'},403);
  if(path==='/api/editor/content'&&request.method==='GET')return json({...await getContent(env,SITE_DEFAULTS),schema});
  if(path==='/api/editor/content'&&request.method==='PUT'){
   let raw;try{raw=JSON.parse(new TextDecoder().decode(await body(request,512000)))}catch{throw new InputError('Invalid content data.')}if(!raw||typeof raw!=='object')throw new InputError('Invalid content data.');const content=validateContent(raw.content);
   if(!Number.isInteger(raw.version)||raw.version<0)throw new InputError('Reload the content before saving.');
   let result;if(raw.version===0)result=await env.DB.prepare('INSERT OR IGNORE INTO site_content (id,payload,version) VALUES (?,?,1)').bind('main',JSON.stringify(content)).run();
   else result=await env.DB.prepare('UPDATE site_content SET payload=?,version=version+1 WHERE id=? AND version=?').bind(JSON.stringify(content),'main',raw.version).run();
   if(result.meta.changes!==1)return json({error:'Content changed in another tab. Copy your unsaved text, then reload before saving.'},409);
   return json({content,version:raw.version+1});
  }
  if(path==='/api/editor/projects'&&request.method==='GET')return json({projects:await projectList(env),email:env.EDITOR_EMAIL});
  if(path==='/api/editor/projects'&&request.method==='POST'){
   const p=validateProject(await input(request),{});const id=crypto.randomUUID();const all=await projectList(env);const position=Math.max(-1,...all.map(p=>p.position))+1;
   await env.DB.prepare('INSERT INTO projects (id,payload,version,position) VALUES (?,?,1,?)').bind(id,JSON.stringify(p),position).run();return json({project:{...p,id,version:1,position}},201);
  }
  const match=path.match(/^\/api\/editor\/projects\/([a-zA-Z0-9-]+)$/);
  if(match&&request.method==='PUT'){
   const data=await input(request);const all=await projectList(env);const previous=all.find(p=>p.id===match[1]);if(!previous)return json({error:'Project not found.'},404);
   if(!Number.isInteger(data.version)||data.version!==previous.version)return json({error:'This project changed in another tab. Reload it before saving.'},409);
   const updated=validateProject(data,previous);if(updated.image!==previous.image){delete updated.visualCredit;delete updated.visualSource}let result;
   if(previous.version===0)result=await env.DB.prepare('INSERT OR IGNORE INTO projects (id,payload,version,position) VALUES (?,?,1,?)').bind(previous.id,JSON.stringify(updated),previous.position).run();
   else result=await env.DB.prepare('UPDATE projects SET payload=?,version=version+1 WHERE id=? AND version=?').bind(JSON.stringify(updated),previous.id,previous.version).run();
   if(result.meta.changes!==1)return json({error:'This project changed in another tab. Reload it before saving.'},409);
   return json({project:{...updated,version:previous.version+1}});
  }
  if(['/api/editor/upload','/api/editor/resume'].includes(path)&&request.method==='POST'){
   const bytes=await body(request,3*1024*1024);let mime;
   if(path==='/api/editor/resume'){if(new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-')throw new InputError('Upload a PDF résumé (up to 3 MB).');mime='application/pdf';}
   else if(bytes[0]===0x89&&new TextDecoder().decode(bytes.slice(1,4))==='PNG'&&bytes[4]===13&&bytes[5]===10&&bytes[6]===26&&bytes[7]===10)mime='image/png';
   else if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)mime='image/jpeg';
   else if(new TextDecoder().decode(bytes.slice(0,4))==='RIFF'&&new TextDecoder().decode(bytes.slice(8,12))==='WEBP')mime='image/webp';
   else if(['GIF87a','GIF89a'].includes(new TextDecoder().decode(bytes.slice(0,6))))mime='image/gif';
   else throw new InputError('Upload a PNG, JPG, WebP, or GIF image (up to 3 MB).');
   const id=crypto.randomUUID();const uploaded=await env.BUCKET.put(id,bytes,{httpMetadata:{contentType:mime}});
   try{await env.DB.prepare('INSERT INTO uploads (id,owner,mime,size,created_at,blob_url) VALUES (?,?,?,?,?,?)').bind(id,user,mime,bytes.length,new Date().toISOString(),uploaded.url).run()}catch(e){await env.BUCKET.delete(uploaded.url);throw e}
   return json({url:'/uploads/'+id},201);
  }
  return json({error:'Method or route not supported.'},405);
 }
 if(path.startsWith('/uploads/')){
  if(!/^\/uploads\/[a-f0-9-]{36}$/.test(path))return new Response('Not found',{status:404});
  const result=await env.DB.prepare('SELECT blob_url FROM uploads WHERE id=?').bind(path.slice(9)).all();const target=result.results[0]?.blob_url;if(!target)return new Response('Not found',{status:404});return Response.redirect(target,302);
 }
 if(path==='/resume'){const {content}=await getContent(env,SITE_DEFAULTS);return content.resume.url?new Response(null,{status:302,headers:{location:content.resume.url,'cache-control':'no-store'}}):new Response('No résumé is available yet.',{status:404});}
 if(path==='/projects-data.json')return json(await projectList(env));
 if(path==='/projects'||path==='/projects/')return html(renderContent(PROJECTS.replace('<!-- PROJECT_CARDS -->',(await projectList(env)).map(projectCard).join('')),(await getContent(env,SITE_DEFAULTS)).content));
 if(path==='/'||path==='/index.html')return html(renderContent(HOME.replace('Explore all nine projects','Explore all projects'),(await getContent(env,SITE_DEFAULTS)).content));
 if(path==='/gallery'||path==='/gallery/')return html(renderContent(GALLERY,(await getContent(env,SITE_DEFAULTS)).content));
 if(path.startsWith('/assets/')||['/style.css','/app.js','/editor.css','/editor.js'].includes(path))return env.ASSETS.fetch(request);
 return html(NOT_FOUND,404);
 }catch(e){if(e instanceof InputError||e instanceof ContentError)return json({error:e.message},400);console.error('Portfolio request failed',path,e.message);if(path.startsWith('/api/'))return json({error:'Saving is temporarily unavailable. Your form has been kept; please try again.'},503);return html('<!doctype html><html><head><title>Temporarily unavailable</title></head><body><h1>Temporarily unavailable</h1><p>Please refresh in a moment.</p></body></html>',503)} }};
