export type AudioState={phase:'idle'|'loading'|'speaking'|'error';message:string};
type VoiceInfo=Pick<SpeechSynthesisVoice,'name'|'lang'|'voiceURI'|'default'>;
// Novelty/system-effect voices are unsuitable for an English learning model.
const novelty=/^(Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Deranged|Good News|Hysterical|Pipe Organ|Trinoids|Whisper|Wobble|Zarvox|Fred|Junior|Ralph|オルガン|ささやき声|スーパースター|トリノイド|ベル|震え|道化)(?:$|\s*\()/i;
export function englishVoices<T extends VoiceInfo>(voices:readonly T[]):T[]{
 return voices.filter(v=>/^en(?:[-_]|$)/i.test(v.lang)&&!novelty.test(v.name)).sort((a,b)=>a.lang.localeCompare(b.lang)||a.name.localeCompare(b.name));
}
export function chooseEnglishVoice<T extends VoiceInfo>(voices:readonly T[],selected='auto'):T|undefined{
 const english=englishVoices(voices),saved=english.find(v=>v.voiceURI===selected);
 if(saved)return saved;
 const score=(v:T)=>(/enhanced|premium|natural|neural/i.test(v.name)?100:0)+(/Samantha|Alex|Google US English|Microsoft (Aria|Jenny)/i.test(v.name)?30:0)+(/^en[-_]US$/i.test(v.lang)?10:0)+(v.default?1:0);
 return english.sort((a,b)=>score(b)-score(a))[0];
}
export type SpeechPreferences={voice:string;rate:number};
type AudioKey=Pick<KeyboardEvent,'code'|'altKey'|'ctrlKey'|'metaKey'|'shiftKey'|'repeat'|'isComposing'|'keyCode'|'getModifierState'>;
export function audioShortcut(event:AudioKey,blocked=false):'play'|'suppress'|null {
 if(blocked||event.isComposing||event.keyCode===229||event.getModifierState('AltGraph'))return null;
 // Physical KeyR also matches Option-R on macOS, where event.key can be “®”.
 if(event.code!=='KeyR'||!event.altKey||event.ctrlKey||event.metaKey||event.shiftKey)return null;
 return event.repeat?'suppress':'play';
}
export function createLessonSpeaker(engine:Pick<SpeechSynthesis,'cancel'|'speak'|'getVoices'>|undefined,create:(text:string)=>SpeechSynthesisUtterance,notify:(state:AudioState)=>void){
 let active:SpeechSynthesisUtterance|null=null;
 const idle=()=>notify({phase:'idle',message:''});
 function stop(silent=false){active=null;engine?.cancel();if(!silent)idle();}
 function play(text:string,preferences:SpeechPreferences={voice:'auto',rate:1}){
  stop();
  if(!engine){notify({phase:'error',message:'このブラウザでは読み上げを利用できません。'});return;}
  try{
   const voice=chooseEnglishVoice(engine.getVoices(),preferences.voice);
   if(!voice){notify({phase:'error',message:'英語の音声を読み込めませんでした。少し待って再生するか、端末の英語音声を確認してください。'});return;}
   const utterance=create(text);utterance.voice=voice;utterance.lang=voice.lang;utterance.rate=preferences.rate;utterance.pitch=1;active=utterance;
   utterance.onstart=()=>{if(active===utterance)notify({phase:'speaking',message:''});};
   utterance.onend=()=>{if(active===utterance){active=null;idle();}};
   utterance.onerror=event=>{if(active!==utterance)return;active=null;if(event.error==='canceled'||event.error==='interrupted'){idle();return;}notify({phase:'error',message:'音声を再生できませんでした。もう一度「音声を聞く」を押してください。'});};
   notify({phase:'loading',message:''});engine.speak(utterance);
  }catch{active=null;notify({phase:'error',message:'音声を再生できませんでした。もう一度「音声を聞く」を押してください。'});}
 }
 return {play,stop};
}
