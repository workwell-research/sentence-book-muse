import {describe,it,expect,vi} from 'vitest';
import {audioShortcut,createLessonSpeaker} from '../src/desk/audio';
import type {AudioState} from '../src/desk/audio';

const key=(patch:Partial<KeyboardEvent>={})=>({code:'KeyR',key:'®',altKey:true,ctrlKey:false,metaKey:false,shiftKey:false,repeat:false,isComposing:false,keyCode:82,getModifierState:()=>false,...patch});
function fixture(){
 const states:AudioState[]=[];
 const spoken:SpeechSynthesisUtterance[]=[];
 const engine={cancel:vi.fn(),speak:vi.fn((utterance:SpeechSynthesisUtterance)=>spoken.push(utterance))};
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
  expect(spoken[0]).toMatchObject({text:'A quiet morning.',lang:'en-US',rate:.85});
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
   const player=createLessonSpeaker({cancel:()=>{},speak:()=>{throw Error('speak failed');}},text=>{if(failCreate)throw Error('constructor failed');return {text} as SpeechSynthesisUtterance;},notify);
   expect(()=>player.play('Test.')).not.toThrow();expect(notify).toHaveBeenLastCalledWith(expect.objectContaining({phase:'error'}));
  }
 });
});
