export type AudioState={phase:'idle'|'loading'|'speaking'|'error';message:string};
type AudioKey=Pick<KeyboardEvent,'code'|'altKey'|'ctrlKey'|'metaKey'|'shiftKey'|'repeat'|'isComposing'|'keyCode'|'getModifierState'>;
export function audioShortcut(event:AudioKey,blocked=false):'play'|'suppress'|null {
 if(blocked||event.isComposing||event.keyCode===229||event.getModifierState('AltGraph'))return null;
 // Physical KeyR also matches Option-R on macOS, where event.key can be “®”.
 if(event.code!=='KeyR'||!event.altKey||event.ctrlKey||event.metaKey||event.shiftKey)return null;
 return event.repeat?'suppress':'play';
}
export function createLessonSpeaker(engine:Pick<SpeechSynthesis,'cancel'|'speak'>|undefined,create:(text:string)=>SpeechSynthesisUtterance,notify:(state:AudioState)=>void){
 let active:SpeechSynthesisUtterance|null=null;
 const idle=()=>notify({phase:'idle',message:''});
 function stop(silent=false){active=null;engine?.cancel();if(!silent)idle();}
 function play(text:string){
  stop();
  if(!engine){notify({phase:'error',message:'このブラウザでは読み上げを利用できません。'});return;}
  try{
   const utterance=create(text);utterance.lang='en-US';utterance.rate=.85;active=utterance;
   utterance.onstart=()=>{if(active===utterance)notify({phase:'speaking',message:''});};
   utterance.onend=()=>{if(active===utterance){active=null;idle();}};
   utterance.onerror=event=>{if(active!==utterance)return;active=null;if(event.error==='canceled'||event.error==='interrupted'){idle();return;}notify({phase:'error',message:'音声を再生できませんでした。もう一度「音声を聞く」を押してください。'});};
   notify({phase:'loading',message:''});engine.speak(utterance);
  }catch{active=null;notify({phase:'error',message:'音声を再生できませんでした。もう一度「音声を聞く」を押してください。'});}
 }
 return {play,stop};
}
