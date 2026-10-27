import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const origin=process.env.QA_ORIGIN??'http://127.0.0.1:5327',out='.impeccable/review/live-input';
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const errors=[],results={typing:false,edits:false,rapid:false,ime:false,persistence:false,confirmation:false,personal:false,mobile:[],fonts:[]};
const snapshot=p=>p.locator('.live-draft-ink path').evaluateAll(ps=>ps.map(p=>({id:p.getAttribute('data-ink-key'),d:p.getAttribute('d'),offset:Number(p.getAttribute('stroke-dashoffset')),visibility:p.getAttribute('visibility')})));
const ready=async p=>{await p.goto(origin);await p.waitForFunction(()=>document.querySelector('textarea')&&!document.querySelector('textarea').disabled);};
try{
 const p=await browser.newPage({viewport:{width:1600,height:1000},reducedMotion:'no-preference'});p.on('pageerror',e=>errors.push(e.message));await ready(p);
 const editor=p.locator('textarea');await editor.focus();await editor.press('T');
 const first=await snapshot(p);assert.ok(first.some(s=>s.offset>0));await p.waitForTimeout(65);const middle=await snapshot(p);assert.ok(middle.some((s,i)=>s.offset<first[i].offset));await p.waitForTimeout(180);assert.ok((await snapshot(p)).every(s=>s.offset===0));
 assert.equal(await p.locator('.model-card textarea').count(),0);assert.equal(await editor.count(),1);assert.equal(await editor.evaluate(e=>getComputedStyle(e).color),'rgba(0, 0, 0, 0)');results.typing=true;
 const t=await snapshot(p);await editor.press('o');const added=await snapshot(p);for(const s of t)assert.equal(added.find(a=>a.id===s.id)?.offset,0);
 await editor.pressSequentially('day, I decided to slow down.',{delay:35});await p.waitForTimeout(220);assert.ok((await snapshot(p)).every(s=>s.offset===0));results.rapid=true;
 const full=await snapshot(p);
 await editor.evaluate(e=>{e.setSelectionRange(2,3);});await editor.press('x');await p.waitForTimeout(180);const replaced=await snapshot(p);assert.ok(full.filter(s=>replaced.some(r=>r.id===s.id)).length>full.length*.8);
 await editor.press('Backspace');await editor.press('d');await p.waitForTimeout(180);assert.equal(await editor.inputValue(),'Today, I decided to slow down.');
 await editor.evaluate(e=>e.setSelectionRange(5,5));await editor.press('!');await editor.press('Meta+z');assert.equal(await editor.inputValue(),'Today, I decided to slow down.');results.edits=true;
 await p.screenshot({path:out+'/desktop-live.png',fullPage:true});
 await p.reload();await p.waitForFunction(()=>!document.querySelector('textarea').disabled);await p.waitForTimeout(30);assert.equal(await editor.inputValue(),'Today, I decided to slow down.');assert.ok((await snapshot(p)).every(s=>s.offset===0));results.persistence=true;
 await editor.evaluate(e=>e.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true,data:''})));await editor.fill('あ');assert.equal(await p.locator('.live-draft-ink').getAttribute('data-visible'),'false');assert.notEqual(await editor.evaluate(e=>getComputedStyle(e).color),'rgba(0, 0, 0, 0)');
 await editor.press('Enter');assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('sentence-book-muse:sample-copy:v1')).phase),'editing');await editor.evaluate(e=>e.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:'あ'})));await p.waitForTimeout(120);await editor.fill('🙂');assert.equal(await p.locator('.live-draft-ink').getAttribute('data-visible'),'false');assert.equal(await editor.inputValue(),'🙂');results.ime=true;
 await editor.fill('Today, I decided to slow down.');await p.waitForTimeout(25);assert.ok((await snapshot(p)).every(s=>s.offset===0));
 await editor.press('Enter');assert.equal(await editor.count(),0);
 assert.ok(await p.locator('[data-layer=body] path').evaluateAll(ps=>ps.length>0&&ps.every(p=>Number(p.getAttribute('stroke-dashoffset'))===0&&p.getAttribute('visibility')==='visible')));
 assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('sentence-book-muse:sample-copy:v1')).phase),'confirmed');results.confirmation=true;
 await p.getByRole('button',{name:'次の文',exact:true}).click();assert.equal(await editor.inputValue(),'');await editor.press('I');assert.ok((await snapshot(p)).some(s=>s.offset>0));
 // Switching face completes current ink; subsequent keystrokes use that face's paths.
 for(const english of ['readability','tech','print','pen']){
  await p.getByRole('button',{name:'表示・印刷',exact:true}).click();await p.getByLabel('英語の書体').selectOption(english);await p.getByRole('button',{name:'閉じる',exact:true}).click();await p.waitForFunction(()=>!document.querySelector('textarea').disabled);await editor.fill('');await editor.pressSequentially('Ink',{delay:50});await p.waitForTimeout(180);assert.ok((await snapshot(p)).every(s=>s.offset===0&&s.id.startsWith(english+':')));results.fonts.push(english);
 }
 // Existing confirmed personal sentence stays canonical during live editing.
 await p.evaluate(async()=>{const c=await import('/src/desk/core.ts'),{studySample:s}=await import('/src/handwriting/study-content.ts');let r=c.emptyCopy(s);for(const sentence of s.sentences)r=c.nextCopy(c.confirmCopy({...r,draft:sentence.text},s,'fixture'),s);r.personal=r.personalDraft='My saved words.';localStorage.setItem(c.practiceKey,JSON.stringify(r));});await p.reload();await p.getByRole('button',{name:'ひとこと 書く'}).click();await p.waitForFunction(()=>!document.querySelector('textarea').disabled);await editor.fill('My own');await p.waitForTimeout(320);await editor.press(' ');await editor.press('w');assert.ok((await snapshot(p)).some(s=>s.offset>0));assert.equal(await p.locator('[data-run^="personal-user"]').count(),0);
 assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('sentence-book-muse:sample-copy:v1')).personal),'My saved words.');await p.screenshot({path:out+'/personal-live.png',fullPage:true});await editor.press('Enter');assert.equal(await editor.count(),0);assert.ok(await p.locator('[data-run^="personal-user"] path').evaluateAll(ps=>ps.length>0&&ps.every(p=>Number(p.getAttribute('stroke-dashoffset'))===0)));results.personal=true;await p.close();
 for(const width of [390,320]){
  const q=await browser.newPage({viewport:{width,height:844},reducedMotion:width===320?'reduce':'no-preference'});q.on('pageerror',e=>errors.push(e.message));await ready(q);const e=q.locator('textarea');await e.pressSequentially('Today, I decided to slow down.',{delay:10});await q.waitForTimeout(180);await q.getByRole('button',{name:/現在の行へ/}).click();await e.evaluate(e=>{e.setSelectionRange(e.value.length,e.value.length);e.dispatchEvent(new Event('select',{bubbles:true}));});await q.waitForTimeout(220);
  assert.equal(await e.count(),1);assert.ok((await snapshot(q)).every(s=>s.offset===0));assert.ok(await q.locator('.desk-paper-scroll').evaluate(e=>e.scrollLeft>0));assert.ok(await q.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));const action=await q.locator('.mobile-writing-actions').boundingBox();assert.ok(action.x>=0&&action.x+action.width<=width&&action.y>=0&&action.y+action.height<=844);await q.screenshot({path:out+'/mobile-'+width+'.png'});await q.locator('.mobile-writing-actions').getByRole('button',{name:'確定',exact:true}).click();await q.locator('.mobile-writing-actions').getByRole('button',{name:'次の文',exact:true}).click();assert.equal(await e.inputValue(),'');results.mobile.push(width);await q.close();
 }
 assert.deepEqual(errors,[]);results.errors=errors;fs.writeFileSync(out+'/checks.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));
}finally{await browser.close();}
