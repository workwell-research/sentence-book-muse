export interface Letter { id:number; char:string; }
export interface PersonalText { text:string; letters:Letter[]; nextId:number; }
export const emptyPersonal:PersonalText={text:'',letters:[],nextId:0};
// Retain both ends of an edit; only inserted/replaced characters receive new stroke IDs.
export function reconcilePersonal(previous:PersonalText,text:string):PersonalText {
 const chars=[...text],old=previous.letters;
 let prefix=0,suffix=0,id=previous.nextId;
 while(prefix<old.length&&prefix<chars.length&&old[prefix].char===chars[prefix])prefix++;
 while(suffix<old.length-prefix&&suffix<chars.length-prefix&&old[old.length-1-suffix].char===chars[chars.length-1-suffix])suffix++;
 const inserted=chars.slice(prefix,chars.length-suffix).map(char=>({id:id++,char}));
 return {text,letters:[...old.slice(0,prefix),...inserted,...(suffix?old.slice(old.length-suffix):[])],nextId:id};
}
