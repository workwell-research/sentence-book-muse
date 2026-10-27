import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const base=process.env.QA_BASE_URL||'http://127.0.0.1:5327';
const out='.impeccable/review/shared-a5';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const errors=[],results=[];
try {
 const context=await browser.newContext({viewport:{width:1440,height:1040}});
 await context.addInitScript(()=>{
  localStorage.setItem('sentence-book-muse:composer:v1','untouched-note-fixture');
  localStorage.setItem('sentence-book-muse:interests:v1','untouched-interest-fixture');
 });
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base);await page.evaluate(()=>document.fonts.ready);
 await page.getByRole('button',{name:'一時停止',exact:true}).click();
 const strokeSnapshot=()=>page.locator('[data-layer="body"] path').evaluateAll(paths=>paths.map(p=>[p.getAttribute('transform'),p.getAttribute('stroke-dashoffset')]));
 const paused=await strokeSnapshot();
 await page.getByRole('radio',{name:'空欄にする',exact:true}).check();
 assert.deepEqual(await strokeSnapshot(),paused);
 assert.equal(await page.locator('[data-layer="memo"]').count(),0);
 await page.getByRole('radio',{name:'表示する',exact:true}).check();
 assert.deepEqual(await strokeSnapshot(),paused);
 await page.getByRole('button',{name:'完成を見る',exact:true}).click();
 assert.equal(await page.getByRole('radio',{name:'ブルー',exact:true}).isChecked(),true);
 await page.getByLabel('今日、大切にしたいことは？').fill('I make time for a quiet morning.');
 await page.getByRole('button',{name:'書き終える',exact:true}).click();
 await page.getByText('単語の復習チェック',{exact:true}).click();
 await page.getByRole('checkbox',{name:'make time for + noun',exact:true}).check();
 const geometry=()=>page.locator('.notebook').evaluateAll(pages=>pages.map(p=>({
  box:p.getAttribute('viewBox'),
  rows:[...p.querySelectorAll('[data-run]:not([data-layer="memo"])')].map(r=>[r.getAttribute('data-run'),r.getAttribute('data-baseline'),r.innerHTML]),
  rules:[...p.querySelectorAll('[data-rule],[data-box]')].map(r=>r.outerHTML),
 })));
 const original=await geometry();
 const personal=await page.locator('[data-testid="personal-strokes"]').innerHTML();
 await page.getByRole('radio',{name:'空欄にする',exact:true}).check();
 assert.deepEqual(await geometry(),original);
 assert.equal(await page.locator('[data-testid="personal-strokes"]').innerHTML(),personal);
 assert.equal(await page.getByRole('checkbox',{name:'make time for + noun',exact:true}).isChecked(),true);
 assert.equal(await page.locator('.notebook desc').evaluateAll(ds=>ds.some(d=>d.textContent.includes('〜のために時間をつくった'))),false);
 assert.ok((await page.locator('.notebook').innerHTML()).includes('〜のために時間をつくる'));
 await page.evaluate(()=>{document.activeElement?.blur();scrollTo(0,0);});
 await page.screenshot({path:out+'/desktop-blank.png',fullPage:true});
 await page.locator('.notebook').first().screenshot({path:out+'/paper-blank.png'});
 for(const content of ['sentences-only','study-notes'])for(const markers of [false,true]) {
  await page.getByLabel('ノートに載せる内容').selectOption(content);
  await page.getByLabel('画面にマーカーを表示する').setChecked(markers);
  assert.equal(await page.getByRole('radio',{name:'空欄にする',exact:true}).isDisabled(),content==='sentences-only');
  assert.equal(await page.getByRole('radio',{name:'空欄にする',exact:true}).isChecked(),true);
  assert.equal((await page.locator('[data-phase="marking"]').count())>0,markers);
 }
 await page.getByRole('radio',{name:'表示する',exact:true}).check();
 for(const name of ['ピンク','ラベンダー','ブルー','グリーン','イエロー','グレー']) {
  await page.getByRole('radio',{name,exact:true}).check();
  assert.equal(await page.locator('[data-layer="body"] path').first().getAttribute('stroke'),'#383A3D');
 }
 await page.getByRole('radio',{name:'ブルー',exact:true}).check();
 async function download(path) {
  const waiting=page.waitForEvent('download');
  await page.getByRole('button',{name:'完成ページをPDFに',exact:true}).click();
  await (await waiting).saveAs(path);
 }
 await download('output/pdf/shared-a5-memos-shown.pdf');
 await page.getByRole('radio',{name:'空欄にする',exact:true}).check();
 await page.getByLabel('印刷用紙',{exact:true}).selectOption('A4');
 await page.getByLabel('PDFにマーカーを入れる').uncheck();
 await download('output/pdf/shared-a5-on-a4-memos-blank.pdf');
 await page.getByLabel('印刷用紙',{exact:true}).selectOption('A5');
 await page.getByRole('radio',{name:'表示する',exact:true}).check();
 await page.getByText('単語の復習チェック',{exact:true}).click();
 await page.evaluate(()=>{document.activeElement?.blur();scrollTo(0,0);});
 await page.screenshot({path:out+'/desktop.png',fullPage:true});
 await page.locator('.notebook').first().screenshot({path:out+'/paper-shown.png'});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 for(const [k,v] of [['composer','untouched-note-fixture'],['interests','untouched-interest-fixture']])assert.equal(await page.evaluate(k=>localStorage.getItem('sentence-book-muse:'+k+':v1'),k),v);
 results.push('Desktop: exact shown/blank non-memo SVG identity; body timeline, personal writing, check state and local fixtures preserved. Content/marker combinations, six graphite/accent palettes and real A5/A4 downloads passed.');
 const mobileContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 const mobile=await mobileContext.newPage();mobile.on('pageerror',e=>errors.push(e.message));
 await mobile.goto(base);await mobile.evaluate(()=>document.fonts.ready);
 assert.equal(await mobile.getByLabel('ノートの表示倍率').inputValue(),'read');
 await mobile.waitForFunction(()=>document.querySelector('.notebook')?.getAttribute('data-complete')==='true');
 await mobile.evaluate(()=>scrollTo(0,0));
 await mobile.screenshot({path:out+'/mobile-zoom.png',fullPage:true});
 const invariant=await mobile.locator('[data-layer="body"]').evaluateAll(rs=>rs.map(r=>[r.getAttribute('data-run'),r.getAttribute('data-baseline')]));
 await mobile.getByLabel('ノートの表示倍率').selectOption('fit');
 await mobile.getByRole('radio',{name:'空欄にする',exact:true}).check();
 assert.deepEqual(await mobile.locator('[data-layer="body"]').evaluateAll(rs=>rs.map(r=>[r.getAttribute('data-run'),r.getAttribute('data-baseline')])),invariant);
 await mobile.getByRole('radio',{name:'表示する',exact:true}).check();
 await mobile.evaluate(()=>{document.activeElement?.blur();scrollTo(0,0)});
 await mobile.screenshot({path:out+'/mobile.png',fullPage:true});
 for(const width of [390,320]) {
  await mobile.setViewportSize({width,height:844});
  assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  for(const label of ['表示する','空欄にする']) {
   const box=await mobile.getByRole('radio',{name:label,exact:true}).locator('..').boundingBox();assert.ok(box.height>=44);
  }
 }
 await mobile.evaluate(()=>scrollTo(0,0));await mobile.screenshot({path:out+'/mobile-320.png',fullPage:true});
 results.push('390 / 320 px: page width and baselines invariant through zoom/memos, no viewport overflow, 44px memo targets, complete reduced-motion page.');
 assert.deepEqual(errors,[]);
 await fs.writeFile(out+'/results.json',JSON.stringify({results,errors,scope:'Synthetic disposable origin only; no physical printing.'},null,2));
 console.log(JSON.stringify({results,errors},null,2));
} finally {await browser.close();}
