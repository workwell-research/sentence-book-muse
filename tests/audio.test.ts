import {describe,it,expect,vi} from 'vitest';
import {audioShortcut,createLessonSpeaker,englishVoices,chooseEnglishVoice} from '../src/desk/audio';
import {displaySchema,defaultDisplay} from '../src/desk/core';
import type {AudioState} from '../src/desk/audio';

const key=(patch:Partial<KeyboardEvent>={})=>({code:'KeyR',key:'®',altKey:true,ctrlKey:false,metaKey:false,shiftKey:false,repeat:false,isComposing:false,keyCode:82,getModifierState:()=>false,...patch});
const voice=(name='Samantha',lang='en-US',isDefault=false)=>({name,lang,voiceURI:name,default:isDefault,localService:true} as SpeechSynthesisVoice);
function fixture(){
 const states:AudioState[]=[];
 const spoken:SpeechSynthesisUtterance[]=[];
 const engine={getVoices:vi.fn(()=>[voice()]),cancel:vi.fn(),speak:vi.fn((utterance:SpeechSynthesisUtterance)=>spoken.push(utterance))};
 const player=createLessonSpeaker(engine,text=>({text} as SpeechSynthesisUtterance),state=>states.push(state));
 const event={} as SpeechSynthesisEvent;
 return {engine,player,spoken,states,event};
}
describe('audio shortcut while writing',()=>{
 it('uses the physical R key for Mac Option-R and Windows Alt-R without stealing plain typing',()=>{
  expect(audioShortcut(key())).toBe('play');
  expect(audioShortcut(key({key:'r'}))).toBe('play');
  for(const patch of [{altKey:false},{ctrlKey:true},{metaKey:true},{shiftKey:true},{code:'KeyT'}])expect(audioShortcut(key(patch))).toBeNull();
 });
 it('leaves IME, AltGraph and settings alone, and consumes held shortcut repeats without replay',()=>{
  for(const patch of [{isComposing:true},{keyCode:229},{getModifierState:(name:string)=>name==='AltGraph'}])expect(audioShortcut(key(patch))).toBeNull();
  expect(audioShortcut(key(),true)).toBeNull();
  expect(audioShortcut(key({repeat:true}))).toBe('suppress');
 });
});
describe('current sentence audio',()=>{
 it('reads the requested model and reports playback until completion',()=>{
  const {player,spoken,states,event}=fixture();player.play('A quiet morning.');
  expect(spoken[0]).toMatchObject({text:'A quiet morning.',lang:'en-US',rate:1,pitch:1,voice:voice()});
  expect(states.at(-1)?.phase).toBe('loading');
  spoken[0].onstart?.(event);expect(states.at(-1)?.phase).toBe('speaking');
  spoken[0].onend?.(event);expect(states.at(-1)).toEqual({phase:'idle',message:''});
 });
 it('replaces playback and ignores callbacks from the cancelled sentence',()=>{
  const {player,spoken,states,event,engine}=fixture();player.play('First.');player.play('Next.');
  expect(engine.cancel).toHaveBeenCalledTimes(2);expect(spoken.map(s=>s.text)).toEqual(['First.','Next.']);
  spoken[1].onstart?.(event);const snapshot=[...states];
  spoken[0].onerror?.({error:'interrupted'} as SpeechSynthesisErrorEvent);spoken[0].onend?.(event);spoken[0].onstart?.(event);
  expect(states).toEqual(snapshot);expect(states.at(-1)?.phase).toBe('speaking');
 });
 it('stops when the current sentence changes and can dispose without late updates',()=>{
  const {player,spoken,states,event}=fixture();player.play('First.');player.stop();
  expect(states.at(-1)?.phase).toBe('idle');const snapshot=[...states];spoken[0].onstart?.(event);spoken[0].onend?.(event);expect(states).toEqual(snapshot);
  player.play('Next.');player.stop(true);const disposed=[...states];spoken[1].onerror?.({error:'audio-busy'} as SpeechSynthesisErrorEvent);expect(states).toEqual(disposed);
 });
 it('offers recovery for actual audio failures but treats normal cancellation quietly',()=>{
  const {player,spoken,states}=fixture();player.play('First.');spoken[0].onerror?.({error:'voice-unavailable'} as SpeechSynthesisErrorEvent);
  expect(states.at(-1)).toMatchObject({phase:'error',message:expect.stringContaining('もう一度')});
  player.play('Retry.');expect(states.at(-1)?.message).toBe('');spoken[1].onerror?.({error:'canceled'} as SpeechSynthesisErrorEvent);expect(states.at(-1)?.phase).toBe('idle');
 });
 it('handles unsupported browsers and speech creation/dispatch failures without throwing',()=>{
  const notify=vi.fn();createLessonSpeaker(undefined,()=>{throw Error('not called');},notify).play('Test.');expect(notify).toHaveBeenLastCalledWith(expect.objectContaining({phase:'error'}));
  for(const failCreate of [true,false]){
   const player=createLessonSpeaker({getVoices:()=>[voice()],cancel:()=>{},speak:()=>{throw Error('speak failed');}},text=>{if(failCreate)throw Error('constructor failed');return {text} as SpeechSynthesisUtterance;},notify);
   expect(()=>player.play('Test.')).not.toThrow();expect(notify).toHaveBeenLastCalledWith(expect.objectContaining({phase:'error'}));
  }
 });
});

describe('English voice preferences',()=>{
 it('excludes Japanese and novelty voices, selecting a conventional English model',()=>{
  const voices=[voice('Boing','en-US',true),voice('オルガン'),voice('ささやき声'),voice('Kyoko','ja-JP'),voice('Samantha'),voice('Daniel','en-GB')];
  expect(englishVoices(voices).map(v=>v.name)).toEqual(['Daniel','Samantha']);
  expect(chooseEnglishVoice(voices)?.name).toBe('Samantha');
  expect(chooseEnglishVoice(voices,'Boing')?.name).toBe('Samantha');
 });
 it('honors a saved English voice and falls back when it is no longer installed',()=>{
  const voices=[voice('Samantha'),voice('Daniel (Enhanced)','en-GB')];
  expect(chooseEnglishVoice(voices)?.name).toBe('Daniel (Enhanced)');
  expect(chooseEnglishVoice(voices,'Samantha')?.name).toBe('Samantha');
  expect(chooseEnglishVoice(voices,'removed')?.name).toBe('Daniel (Enhanced)');
 });
 it('dispatches the selected locale and rate, not just an unbound language hint',()=>{
  const {player,engine,spoken}=fixture();engine.getVoices.mockReturnValue([voice('Daniel','en-GB'),voice()]);
  player.play('A quiet morning.',{voice:'Daniel',rate:.85});
  expect(spoken[0]).toMatchObject({voice:voice('Daniel','en-GB'),lang:'en-GB',rate:.85,pitch:1});
 });
 it('recovers when the browser populates voices later and never dispatches a wrong-language fallback',()=>{
  const {player,engine,spoken,states}=fixture();engine.getVoices.mockReturnValue([voice('Kyoko','ja-JP')]);player.play('Test.');
  expect(spoken).toHaveLength(0);expect(states.at(-1)?.message).toContain('英語');
  engine.getVoices.mockReturnValue([voice()]);player.play('Test.');expect(spoken[0].voice?.name).toBe('Samantha');
 });
 it('loads existing display preferences without resetting their other choices',()=>{
  const {voice:oldVoice,speechRate:oldRate,...legacy}=defaultDisplay;
  void oldVoice;void oldRate;
  expect(displaySchema.parse({...legacy,theme:'walnut',marker:'orange'})).toMatchObject({theme:'walnut',marker:'orange',voice:'auto',speechRate:1});
  expect(displaySchema.safeParse({...defaultDisplay,speechRate:99}).success).toBe(false);
 });
});
