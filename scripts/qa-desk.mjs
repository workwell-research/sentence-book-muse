import {chromium} from '@playwright/test';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const origin=process.env.QA_ORIGIN??'http://127.0.0.1:5327';
const out='.impeccable/review/desk';fs.mkdirSync(out,{recursive:true});fs.mkdirSync('output/pdf',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1600,height:1000},reducedMotion:'reduce'});
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
const go=async()=>{await page.goto(origin);await page.evaluate(()=>document.fonts.ready);await page.locator('#notebook-input').waitFor();await page.waitForFunction(()=>!document.querySelector('#notebook-input').disabled);};
const openSettings=()=>page.getByRole('button',{name:'表示・印刷',exact:true}).click();
const closeSettings=()=>page.getByRole('button',{name:'閉じる',exact:true}).click();
const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('sentence-book-muse:sample-copy:v1')));
await go();await page.evaluate(()=>localStorage.setItem('qa-preserved','fixture-only'));
assert.equal(await page.locator('.model-card textarea,.model-card input,[contenteditable=true]').count(),0);
assert.equal(await page.locator('textarea').count(),1);
const e=page.locator('#notebook-input');
await e.fill('A draft with a mistake.');await e.press('Enter');assert.match(await page.locator('#writing-error').innerText(),/直してください/);assert.equal((await saved()).entries.length,0);
await e.fill('Today, I decided to slow down.');
await e.dispatchEvent('compositionstart');await e.dispatchEvent('keydown',{key:'Enter',code:'Enter',keyCode:229,isComposing:true});assert.equal((await saved()).entries.length,0);await e.dispatchEvent('compositionend');await page.waitForTimeout(120);
await e.dispatchEvent('keydown',{key:'Enter',code:'Enter',repeat:true});assert.equal((await saved()).entries.length,0);
await e.dispatchEvent('keydown',{key:'Enter',code:'Enter',ctrlKey:true});assert.equal((await saved()).entries.length,0);
await e.press('Enter');assert.equal((await saved()).entries.length,1);assert.equal((await saved()).index,1);
await e.fill('Preserve this draft.');await e.evaluate(el=>el.setSelectionRange(3,9));
const before=await page.locator('.notebook [data-rule]').evaluateAll(els=>els.map(el=>['x1','y1','x2','y2','stroke-width'].map(a=>el.getAttribute(a))));
for(const theme of ['pure-white','natural','walnut']){
 await openSettings();await page.locator('input[name=desk-theme][value="'+theme+'"]').check();await closeSettings();
 for(const marker of ['blue','pink','purple','gray','orange','green']){
  await page.locator('input[name=desk-marker][value="'+marker+'"]').check();assert.equal(await e.inputValue(),'Preserve this draft.');
  assert.deepEqual(await page.locator('.notebook [data-rule]').evaluateAll(els=>els.map(el=>['x1','y1','x2','y2','stroke-width'].map(a=>el.getAttribute(a)))),before);
 }
}
await page.getByRole('button',{name:'Start',exact:true}).click();await page.waitForTimeout(1050);
const geometry=await page.locator('.desk-pens,.index-book,.model-card,.desk-paper').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return [r.x,r.y,r.width,r.height];}));
await openSettings();await page.getByLabel('タイマーを表示する',{exact:true}).uncheck();await closeSettings();
assert.deepEqual(await page.locator('.desk-pens,.index-book,.model-card,.desk-paper').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return [r.x,r.y,r.width,r.height];})),geometry);
await page.waitForTimeout(1100);await openSettings();await page.getByLabel('タイマーを表示する',{exact:true}).check();await closeSettings();assert.equal(await page.getByRole('button',{name:'Pause',exact:true}).count(),1);
await page.reload();await page.evaluate(()=>document.fonts.ready);assert.equal(await e.inputValue(),'Preserve this draft.');
// Deterministic fixture progress is produced through the same public state contract, on this disposable origin only.
await page.evaluate(async()=>{const c=await import('/src/desk/core.ts'),{studySample:s}=await import('/src/handwriting/study-content.ts');let r=c.emptyCopy(s);for(let i=0;i<7;i++)r=c.nextCopy(c.confirmCopy({...r,draft:s.sentences[i].text},s,'2026-10-27T00:00:00.000Z'),s);r.draft=s.sentences[7].text;localStorage.setItem(c.practiceKey,JSON.stringify(r));localStorage.setItem(c.displayKey,JSON.stringify(c.defaultDisplay));});
await go();
const metrics=await page.evaluate(async()=>{const {englishFonts}=await import('/src/handwriting/fonts.ts');const c=document.createElement('canvas').getContext('2d');const results=[];for(const [id,name] of [['readability','Readability'],['tech','Tech'],['print','Print'],['pen','Pen']]){const family='Sentence Notebook '+name+' Input';await document.fonts.load('100px "'+family+'"');c.font='100px "'+family+'"';c.fontKerning='none';const text='Tomorrow, I want to make time for them again.';const expected=[...text].reduce((sum,ch)=>sum+englishFonts[id].data[ch].advance/200*100,0);results.push({id,expected,actual:c.measureText(text).width});}return results;});
for(const m of metrics)assert.ok(Math.abs(m.actual-m.expected)<.15,JSON.stringify(m));
await e.focus();await e.evaluate(el=>el.setSelectionRange(20,20));await page.screenshot({path:out+'/desktop-white.png',fullPage:true});
assert.ok(await e.evaluate(el=>el.scrollHeight<=el.clientHeight+1));
await openSettings();await page.getByLabel('タイマーを表示する',{exact:true}).uncheck();await closeSettings();await page.screenshot({path:out+'/desktop-hidden.png',fullPage:true});
for(const theme of ['natural','walnut']){await openSettings();await page.locator('input[name=desk-theme][value="'+theme+'"]').check();await page.getByLabel('タイマーを表示する',{exact:true}).check();await closeSettings();await page.screenshot({path:out+'/desktop-'+theme+'.png',fullPage:true});}
await openSettings();await page.locator('input[name=desk-theme][value=pure-white]').check();await closeSettings();
await page.setViewportSize({width:1280,height:900});await page.screenshot({path:out+'/desktop-1280.png',fullPage:true});
for(const width of [390,320]){await page.setViewportSize({width,height:844});await page.reload();await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:out+'/mobile-'+width+'.png',fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
await page.setViewportSize({width:1600,height:1000});await page.reload();await page.evaluate(()=>document.fonts.ready);
await e.press('Enter');assert.equal((await saved()).phase,'complete');
await page.screenshot({path:out+'/completed.png',fullPage:true});
await openSettings();let download=page.waitForEvent('download');await page.getByRole('button',{name:'確定したノートをPDFに'}).click();await(await download).saveAs('output/pdf/desk-a5-completed.pdf');
await page.getByLabel('印刷用紙',{exact:true}).selectOption('A4');await page.getByLabel('PDFにマーカーを入れる',{exact:true}).uncheck();await page.locator('input[name=desk-memos][value=blank]').check();download=page.waitForEvent('download');await page.getByRole('button',{name:'確定したノートをPDFに'}).click();await(await download).saveAs('output/pdf/desk-a5-on-a4-blank.pdf');await closeSettings();
assert.equal(await page.evaluate(()=>localStorage.getItem('qa-preserved')),'fixture-only');assert.deepEqual(errors,[]);
fs.writeFileSync(out+'/qa.json',JSON.stringify({status:'passed',metrics,errors,scope:'Disposable Chrome origin; synthetic fixtures only; 18 theme/color pairs, IME events, Enter guards, failed copy, explicit progression, timer visibility, persistence, PDF downloads, desktop/mobile overflow.'},null,2));
await browser.close();console.log('Desk QA passed');
