'use strict';
document.documentElement.classList.add('js');
const toggle=document.querySelector('.menu-toggle'),menu=document.querySelector('.mobile-menu');
function closeMenu(){toggle.setAttribute('aria-expanded','false');menu.classList.remove('open')}
toggle.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')!=='true';toggle.setAttribute('aria-expanded',String(open));menu.classList.toggle('open',open)});
menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu()});
if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');observer.unobserve(e.target)}})},{threshold:.06});document.querySelectorAll('.observe').forEach(e=>observer.observe(e))}else document.querySelectorAll('.observe').forEach(e=>e.classList.add('visible'));
const dialog=document.getElementById('project-dialog'),content=document.getElementById('dialog-content');
document.querySelector('.dialog-close').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()}});
dialog.addEventListener('close',()=>document.body.style.overflow='');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let projectData;
async function showProject(index){try{if(!projectData){const response=await fetch('/projects-data.json');if(!response.ok)throw new Error('Unavailable');projectData=await response.json()}const p=projectData[index];content.innerHTML=`<div class="subtitle">${esc(p.category)}</div><h2 id="dialog-title">${esc(p.title)}</h2>${p.image?`<img class="detail-project-image" src="${esc(p.image)}" alt="${esc(p.title)} project visual">`:""}${p.visualSource?`<p class="visual-credit">Reference artwork: <a href="${esc(p.visualSource)}" target="_blank" rel="noopener noreferrer">${esc(p.visualCredit)}</a></p>`:""}<p>${esc(p.description)}</p><div class="project-external-links">${p.github?`<a class="cta" href="${esc(p.github)}" target="_blank" rel="noopener noreferrer">GitHub ↗</a>`:""}${p.demo?`<a class="cta" href="${esc(p.demo)}" target="_blank" rel="noopener noreferrer">Live demo ↗</a>`:""}</div><h3>Tech stack</h3><div class="tags">${p.stack.map(t=>`<span>${esc(t)}</span>`).join('')}</div>${p.date?`<p>${esc(p.date)}</p>`:''}<a class="cta" href="mailto:${esc(document.querySelector('meta[name="portfolio-contact"]')?.content||'mir1sahin123@gmail.com')}?subject=${encodeURIComponent('Let’s discuss '+p.title)}">Discuss this project</a>`;dialog.showModal();document.body.style.overflow='hidden'}catch{content.innerHTML='<h2 id="dialog-title">Project details</h2><p>Details could not be loaded. Please try refreshing the page.</p>';dialog.showModal()}}
document.querySelectorAll('[data-project]').forEach(b=>b.addEventListener('click',()=>showProject(Number(b.dataset.project))));
document.querySelector('[data-photo]')?.addEventListener('click',()=>{content.innerHTML='<h2 id="dialog-title">Mir Sahin Ali</h2><img src="/assets/mir-sahin-ali.png" alt="Mir Sahin Ali on campus">';dialog.showModal();document.body.style.overflow='hidden'});

const motionPreference=window.matchMedia('(prefers-reduced-motion: reduce)');
const galleryVideo=document.querySelector('.gallery-video'),videoControl=document.querySelector('.video-control');
if(galleryVideo&&videoControl){
 galleryVideo.muted=true;galleryVideo.defaultMuted=true;
 const updateControl=()=>{videoControl.textContent=galleryVideo.paused?'Play video':'Pause video';videoControl.setAttribute('aria-label',galleryVideo.paused?'Play background video':'Pause background video')};
 galleryVideo.addEventListener('play',updateControl);galleryVideo.addEventListener('pause',updateControl);
 videoControl.addEventListener('click',()=>{if(galleryVideo.paused)galleryVideo.play().catch(()=>{videoControl.textContent='Retry video'});else galleryVideo.pause()});
 if(motionPreference.matches){galleryVideo.pause();updateControl()}else galleryVideo.play().catch(updateControl);
 motionPreference.addEventListener('change',e=>{if(e.matches)galleryVideo.pause()});
}

// Abstract process-data sphere, inspired by the supplied business-intelligence reference.
const sphereCanvas=document.querySelector('.process-sphere');
if(sphereCanvas){
 const ctx=sphereCanvas.getContext('2d');const points=[];const count=850;
 for(let i=0;i<count;i++){const y=1-2*(i+.5)/count;const radius=Math.sqrt(1-y*y);const a=i*2.3999632297;points.push([Math.cos(a)*radius,y,Math.sin(a)*radius])}
 let visible=false,frameId=0,start=0;
 function paint(t){const w=sphereCanvas.width,h=sphereCanvas.height;ctx.clearRect(0,0,w,h);const angle=(motionPreference.matches||document.documentElement.classList.contains('motion-paused')) ? .35 :(t-start)*.00016;const ca=Math.cos(angle),sa=Math.sin(angle);
  const projected=points.map(p=>{const x=p[0]*ca+p[2]*sa,z=-p[0]*sa+p[2]*ca;return[x,p[1],z]}).sort((a,b)=>a[2]-b[2]);
  for(const [x,y,z] of projected){const depth=(z+1)/2;const scale=1+z*.1;ctx.beginPath();ctx.fillStyle=`rgba(237,237,247,${.15+depth*.72})`;ctx.arc(w/2+x*154*scale,h*.48+y*154*scale,.65+depth*.8,0,Math.PI*2);ctx.fill()}
  ctx.strokeStyle='rgba(240,240,250,.16)';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(w/2,h*.48,174,38,-.4,0,Math.PI*2);ctx.stroke();const a=angle*2;ctx.fillStyle='#ee008c';ctx.beginPath();ctx.arc(w/2+Math.cos(a)*174,h*.48+Math.sin(a)*38,3,0,Math.PI*2);ctx.fill();
 }
 function tick(t){paint(t);if(visible&&!document.hidden&&!motionPreference.matches&&!document.documentElement.classList.contains('motion-paused'))frameId=requestAnimationFrame(tick);else frameId=0}
 function resume(){if(visible&&!document.hidden&&!frameId){start=performance.now();frameId=requestAnimationFrame(tick)}}
 new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)resume();else{cancelAnimationFrame(frameId);frameId=0}},{threshold:.05}).observe(sphereCanvas);
 document.addEventListener('cardmotionchange',()=>{cancelAnimationFrame(frameId);frameId=0;if(!document.documentElement.classList.contains('motion-paused'))resume()});document.addEventListener('visibilitychange',resume);motionPreference.addEventListener('change',()=>{cancelAnimationFrame(frameId);frameId=0;resume()});paint(0);
}

// Play project video only while visible; provide one accessible motion control.
const motionToggle=document.querySelector('.motion-toggle, .home-globe-control');
const projectVideos=[...document.querySelectorAll('.project-video')];
let cardsPaused=motionPreference.matches;
function syncCardMotion(){document.documentElement.classList.toggle('motion-paused',cardsPaused);if(motionToggle){const home=motionToggle.classList.contains('home-globe-control');motionToggle.textContent=cardsPaused?(home?'Play animation':'Play card animations'):(home?'Pause animation':'Pause card animations');motionToggle.setAttribute('aria-label',cardsPaused?'Play project animation':'Pause project animation');motionToggle.setAttribute('aria-pressed',String(cardsPaused))}projectVideos.forEach(v=>{if(!cardsPaused&&!document.hidden&&v.dataset.visible==='true')v.play().catch(()=>{});else v.pause()})}
if(motionToggle)motionToggle.addEventListener('click',()=>{cardsPaused=!cardsPaused;syncCardMotion();document.dispatchEvent(new Event('cardmotionchange'))});
projectVideos.forEach(v=>{v.muted=true;new IntersectionObserver(entries=>{v.dataset.visible=String(entries[0].isIntersecting);syncCardMotion()},{threshold:.1}).observe(v)});
motionPreference.addEventListener('change',e=>{cardsPaused=e.matches;syncCardMotion();document.dispatchEvent(new Event('cardmotionchange'))});document.addEventListener('visibilitychange',syncCardMotion);syncCardMotion();
