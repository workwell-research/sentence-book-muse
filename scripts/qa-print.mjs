import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const base=process.env.QA_BASE_URL||'http://127.0.0.1:5317';
const out='.impeccable/review/print-colors';
await fs.mkdir(out,{recursive:true});await fs.mkdir('output/pdf',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const errors=[],results=[];
try {
 const context=await browser.newContext({viewport:{width:1440,height:1040}});
 await context.addInitScript(()=>{
  localStorage.setItem('sentence-book-muse:composer:v1','untouched-note-fixture');
  localStorage.setItem('sentence-book-muse:interests:v1','untouched-interest-fixture');
 });
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base);await page.locator('[data-testid="pen"]').waitFor();
 await page.waitForTimeout(400);
 await page.getByRole('button',{name:'一時停止',exact:true}).click();
 const motion=await page.locator('path[data-phase="writing"]').evaluateAll(paths=>paths.map(p=>p.getAttribute('stroke-dashoffset')));
 const colors=new Set();
 for(const label of ['ピンク','ラベンダー','ブルー','グリーン','イエロー','グレー']) {
   await page.getByRole('radio',{name:label,exact:true}).check();
   assert.equal(await page.getByRole('radio',{name:label,exact:true}).isChecked(),true);
   colors.add(await page.locator('path[data-phase="writing"]').first().getAttribute('stroke'));
   assert.deepEqual(await page.locator('path[data-phase="writing"]').evaluateAll(paths=>paths.map(p=>p.getAttribute('stroke-dashoffset'))),motion);
 }
 assert.equal(colors.size,6);
 await page.getByRole('radio',{name:'ピンク',exact:true}).check();
 await page.keyboard.press('ArrowRight');
 assert.equal(await page.getByRole('radio',{name:'ラベンダー',exact:true}).isChecked(),true);
 await page.getByRole('radio',{name:'ピンク',exact:true}).check();
 await page.getByRole('button',{name:'完成を見る',exact:true}).click();
 await page.getByLabel('今日、大切にしたいことは？').fill('I make time for a quiet morning.');
 await page.getByRole('button',{name:'書き終える',exact:true}).click();
 assert.equal(await page.locator('[data-testid="personal-strokes"] path').first().getAttribute('stroke'),'#634652');
 assert.equal(await page.getByLabel('印刷用紙',{exact:true}).inputValue(),'A5');
 assert.equal(await page.getByLabel('綴じる側').inputValue(),'left');
 assert.equal(await page.getByLabel('穴あけ・綴じ代').inputValue(),'18');
 assert.equal(await page.getByLabel('PDFにマーカーを入れる').isChecked(),true);
 async function download(path) {
   const wait=page.waitForEvent('download');
   await page.getByRole('button',{name:'完成ページをPDFに',exact:true}).click();
   await (await wait).saveAs(path);
 }
 await download('output/pdf/a5-notebook-marked.pdf');
 await page.getByLabel('印刷用紙',{exact:true}).selectOption('A4');
 await page.getByLabel('PDFにマーカーを入れる').uncheck();
 assert.ok(await page.locator('path[data-phase="marking"]').count()>0);
 await download('output/pdf/a5-notebook-on-a4-unmarked.pdf');
 await page.evaluate(()=>{document.activeElement?.blur();scrollTo(0,0)});
 await page.screenshot({path:out+'/desktop.png',fullPage:true});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 for(const [key,value] of [['composer','untouched-note-fixture'],['interests','untouched-interest-fixture']])
  assert.equal(await page.evaluate(key=>localStorage.getItem('sentence-book-muse:'+key+':v1'),key),value);
 results.push('Desktop 1440: all six ink sets, unchanged paused stroke progress, arrow-key radio selection, personal ink, A5/left/18mm defaults, print-only marker toggle, A5/A4 downloads, storage untouched, no overflow.');
 const contextMobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 const mobile=await contextMobile.newPage();mobile.on('pageerror',e=>errors.push(e.message));
 await mobile.goto(base);
 await mobile.getByRole('radio',{name:'ラベンダー',exact:true}).check();
 await mobile.getByLabel('今日、大切にしたいことは？').fill('One page, just for me.');
 await mobile.waitForFunction(()=>document.querySelector('svg.notebook')?.getAttribute('data-complete')==='true');
 for(const label of ['ピンク','ラベンダー','ブルー','グリーン','イエロー','グレー']) {
   const bounds=await mobile.getByRole('radio',{name:label,exact:true}).locator('..').boundingBox();
   assert.ok(bounds.height>=44 && bounds.width>=44);
 }
 await mobile.getByLabel('印刷用紙',{exact:true}).selectOption('A4');
 await mobile.getByLabel('PDFにマーカーを入れる').uncheck();
 await mobile.evaluate(()=>{document.activeElement?.blur();scrollTo(0,0)});
 await mobile.screenshot({path:out+'/mobile.png',fullPage:true});
 assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await mobile.setViewportSize({width:320,height:844});
 assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 results.push('Mobile 390 + 320: all color targets >=44px, full content, reduced motion, A4/marker settings, no horizontal overflow.');
 assert.deepEqual(errors,[]);
 await fs.writeFile(out+'/results.json',JSON.stringify({results,errors},null,2));console.log(JSON.stringify({results,errors},null,2));
} finally { await browser.close(); }
