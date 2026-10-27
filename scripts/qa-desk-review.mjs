import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const origin=process.env.QA_ORIGIN??'http://127.0.0.1:5327';
const b=await chromium.launch({channel:'chrome',headless:true}),out=process.env.QA_OUTPUT??'.impeccable/review/desk';
const result={mobile:[],personal:false,resume:false};
try{
 for(const width of [320,390]){
  const p=await b.newPage({viewport:{width,height:844},reducedMotion:'reduce'});await p.goto(origin);
  const e=p.locator('textarea');await e.fill('Today, I decided to slow down.');
  await e.focus();await e.evaluate(e=>{e.setSelectionRange(26,26);e.dispatchEvent(new Event('select',{bubbles:true}));});await e.press('ArrowRight');
  const action=p.locator('.mobile-writing-actions');const box=await action.boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width&&box.y>=0&&box.y+box.height<=844);
  assert.equal(await p.locator('textarea').count(),1);assert.ok(await p.locator('.desk-paper-scroll').evaluate(e=>e.scrollLeft>0));
  await p.screenshot({path:out+'/mobile-action-'+width+'.png'});
  await action.getByRole('button',{name:'次の文へ',exact:true}).click();
  assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('sentence-book-muse:sample-copy:v1')).index),1);
  result.mobile.push({width,reachableAction:true,caretPansPaper:true,confirmAndNext:true});await p.close();
 }
 const p=await b.newPage({viewport:{width:1600,height:1000},reducedMotion:'reduce'});await p.goto(origin);
 await p.evaluate(async()=>{const c=await import('/src/desk/core.ts'),{studySample:s}=await import('/src/handwriting/study-content.ts');let r=c.emptyCopy(s);for(const sentence of s.sentences)r=c.nextCopy(c.confirmCopy({...r,draft:sentence.text},s,'now'),s);r.personal=r.personalDraft='My saved words.';localStorage.setItem(c.practiceKey,JSON.stringify(r));});await p.reload();
 await p.getByRole('button',{name:'ひとこと 書く'}).click();await p.locator('textarea').fill('My edited words.');
 assert.equal(await p.locator('[data-run^="personal-user"]').count(),0);assert.equal(await p.locator('textarea').count(),1);
 await p.locator('textarea').scrollIntoViewIfNeeded();await p.screenshot({path:out+'/personal-edit.png',fullPage:true});
 assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('sentence-book-muse:sample-copy:v1')).personal),'My saved words.');
 await p.locator('textarea').press('Enter');assert.equal(await p.locator('textarea').count(),0);assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('sentence-book-muse:sample-copy:v1')).personal),'My edited words.');result.personal=true;await p.close();
 const q=await b.newPage({reducedMotion:'no-preference'});await q.goto(origin);await q.locator('textarea').fill('Today, I decided to slow down.');await q.locator('textarea').press('Enter');await q.getByRole('button',{name:'筆跡をもう一度'}).click();await q.waitForTimeout(220);await q.getByRole('button',{name:'筆記を一時停止',exact:true}).click();
 const snap=()=>q.locator('[data-layer=body] path').evaluateAll(ps=>ps.map(p=>p.getAttribute('stroke-dashoffset')));const paused=await snap();await q.waitForTimeout(150);assert.deepEqual(await snap(),paused);await q.getByRole('button',{name:'筆記を続ける',exact:true}).click();await q.waitForTimeout(180);assert.notDeepEqual(await snap(),paused);assert.equal(await q.evaluate(()=>JSON.parse(localStorage.getItem('sentence-book-muse:sample-copy:v1')).phase),'editing');result.resume=true;
 fs.writeFileSync(out+'/review-fix-checks.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await b.close();}
