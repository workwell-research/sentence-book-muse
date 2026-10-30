import { describe,it,expect,vi,afterEach } from 'vitest';
import { dailyDraftId,learningSummarySchema } from '../shared/muse-connection';
import { LESSON_CONTRACT } from '../shared/lesson-schema';
import type { LessonDraft } from '../shared/lesson-schema';
import { deliverDraft,getLearningState,manageAccount,principal,MuseError,supabaseMuseStore } from '../functions/lib/muse-account';
import type { MuseStore,Principal } from '../functions/lib/muse-account';
import { handleMcp } from '../functions/mcp';
import { ACCESS_ENV } from './support/access';
import { buildLearningSummary } from '../src/lib/learning-summary';
import { COMPOSER_KEY } from '../src/lib/composer';
import { INTERESTS_KEY } from '../src/lib/interests';
import { WORDBOOK_KEY } from '../src/lib/lookup';
const userId='10000000-0000-4000-8000-000000000001',sessionId='20000000-0000-4000-8000-000000000001',clientId='30000000-0000-4000-8000-000000000001';
const who:Principal={userId,sessionId,clientId};
const summary=learningSummarySchema.parse({level:'B1',native_language:'ja',interests:['Coffee'],binders:[],local_pending_count:0,unpractised_count:0,completed_last_7_days:0,review_candidates:[],observed_at:new Date().toISOString()});
const token='synthetic-test-token-'.repeat(3);
function store(identity=who):MuseStore {
  return {authenticate:vi.fn().mockResolvedValue(identity),authorization:vi.fn().mockResolvedValue({clientId,clientName:'Verified Muse'}),call:vi.fn(async(_who,op)=>{
    if(op==='receipt')return {found:false};
    if(op==='state'||op==='delivery_context')return {version:3,summary,inbox_pending_count:0,updated_at:new Date().toISOString()};
    if(op==='deliver')return {receipt:'accepted'};
    return {allowed:true,member:true};
  }) as MuseStore['call']};
}
function request(path='/mcp',body?:unknown,headers:Record<string,string>={}) {
  return new Request(`https://example.test${path}`,{method:body===undefined?'GET':'POST',headers:{Authorization:`Bearer ${token}`,Accept:'application/json, text/event-stream',...(body===undefined?{}:{'Content-Type':'application/json'}),...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});
}
async function delivery():Promise<{contract:typeof LESSON_CONTRACT;delivery_date:string;draft:LessonDraft}> {
  const date=new Date().toISOString().slice(0,10);
  return {contract:LESSON_CONTRACT,delivery_date:date,draft:{draft_id:await dailyDraftId(userId,date),title:'Synthetic coffee',level:'B1',native_language:'ja',sentences:Array.from({length:4},()=>({en:'I like coffee.',native:'コーヒーが好きです。'})),questions:[{en:'Why?',native:'なぜ？',sample_answer:{en:'It is good.',native:'おいしいです。'}}],review_items:[],estimated_minutes:5,based_on_learning_state_version:3,filing:{kind:'new',newBinder:{title:'Coffee',description:'A synthetic test'},reason:'A new topic.',sceneTags:['coffee']}}};
}
afterEach(()=>vi.unstubAllGlobals());
describe('Muse account boundary',()=>{
  it('separates personal and delegated sessions',async()=>{
    await expect(principal(request(),store(),false)).rejects.toMatchObject({code:'permission_denied'});
    await expect(principal(request(),store({...who,clientId:null}),true)).rejects.toMatchObject({code:'permission_denied'});
    await expect(principal(new Request('https://example.test/mcp'),store(),true)).rejects.toMatchObject({code:'unauthorized'});
  });
  it('lets a verified personal session enroll without an invitation, while enforcing Origin',async()=>{
    const db=store({...who,clientId:null});
    await expect(manageAccount(request('/api/muse/manage',{action:'enroll'}),ACCESS_ENV,db)).rejects.toMatchObject({code:'wrong_origin'});
    expect(db.call).not.toHaveBeenCalled();
    const allowed=await manageAccount(request('/api/muse/manage',{action:'enroll'},{origin:ACCESS_ENV.ACCESS_ORIGIN}),ACCESS_ENV,db);
    expect(allowed.status).toBe(200);expect(db.call).toHaveBeenCalledWith({...who,clientId:null},'enroll');
  });
  it('still rejects anonymous and delegated enrollment without creating an inbox',async()=>{
    const headers={origin:ACCESS_ENV.ACCESS_ORIGIN};
    const anonymous=store({...who,clientId:null});
    const anonymousRequest=request('/api/muse/manage',{action:'enroll'},headers);
    anonymousRequest.headers.delete('authorization');
    await expect(manageAccount(anonymousRequest,ACCESS_ENV,anonymous)).rejects.toMatchObject({code:'unauthorized'});
    expect(anonymous.call).not.toHaveBeenCalled();
    const delegated=store();
    await expect(manageAccount(request('/api/muse/manage',{action:'enroll'},headers),ACCESS_ENV,delegated)).rejects.toMatchObject({code:'permission_denied'});
    expect(delegated.call).not.toHaveBeenCalled();
  });
  it('derives the granted client from Auth authorization details, never from caller input',async()=>{
    const db=store({...who,clientId:null});const authorizationId='opaque-authorization-request_1234567890';
    const response=await manageAccount(request('/api/muse/manage',{action:'grant',authorization_id:authorizationId,permissions:{read_summary:true,deliver_drafts:false}},{origin:ACCESS_ENV.ACCESS_ORIGIN}),ACCESS_ENV,db);
    expect(response.status).toBe(200);expect(db.authorization).toHaveBeenCalledWith(token,authorizationId,userId);
    expect(db.call).toHaveBeenCalledWith({...who,clientId:null},'grant',{client_id:clientId,client_name:'Verified Muse',read_summary:true,deliver_drafts:false});
  });
  it('bounds the opaque authorization ID before calling Auth',async()=>{
    for(const authorizationId of ['', 'x'.repeat(513), 123]) {
      const db=store({...who,clientId:null});
      await expect(manageAccount(request('/api/muse/manage',{action:'grant',authorization_id:authorizationId,permissions:{read_summary:true,deliver_drafts:false}},{origin:ACCESS_ENV.ACCESS_ORIGIN}),ACCESS_ENV,db)).rejects.toMatchObject({code:'invalid_request'});
      expect(db.authorization).not.toHaveBeenCalled();
      expect(db.call).not.toHaveBeenCalled();
    }
  });
  it('does not trust an unverified, foreign-issuer, wrong-audience or expired JWT',async()=>{
    const env={...ACCESS_ENV,SUPABASE_URL:'https://test.supabase.co',SUPABASE_PUBLISHABLE_KEY:'public',SUPABASE_SECRET_KEY:'private-test-only'};
    const claims={sub:userId,iss:env.SUPABASE_URL+'/auth/v1',role:'authenticated',aud:'authenticated',session_id:sessionId,client_id:clientId,exp:Math.floor(Date.now()/1000)+300};
    const jwt=(c:unknown)=>`${Buffer.from('{}').toString('base64url')}.${Buffer.from(JSON.stringify(c)).toString('base64url')}.test`;
    vi.stubGlobal('fetch',vi.fn().mockImplementation(async(url:string)=>Response.json(url.includes('/admin/oauth/clients/') ? {client_id:clientId,client_name:'Verified Muse'} : {id:userId,email_confirmed_at:new Date().toISOString(),is_anonymous:false})));
    expect(await supabaseMuseStore(env).authenticate(jwt(claims))).toEqual(who);
    for(const change of [{iss:'https://other.supabase.co/auth/v1'},{aud:'different-resource'},{exp:1},{session_id:'bad'},{sub:clientId}]){
      await expect(supabaseMuseStore(env).authenticate(jwt({...claims,...change}))).rejects.toMatchObject({code:'unauthorized'});
    }
    for(const status of [404,503]) {
      vi.stubGlobal('fetch',vi.fn().mockImplementation(async(url:string)=>url.includes('/admin/oauth/clients/')
        ? Response.json({code:'client_not_found',message:'Unavailable'},{status})
        : Response.json({id:userId,email_confirmed_at:new Date().toISOString(),is_anonymous:false})));
      await expect(supabaseMuseStore(env).authenticate(jwt(claims))).rejects.toMatchObject({code:status===404?'unauthorized':'store_unavailable'});
      expect(await supabaseMuseStore(env).authenticate(jwt({...claims,client_id:null}))).toEqual({...who,clientId:null});
    }

  });
});
describe('validated deliveries',()=>{
  it('issues stable daily IDs, with no history/accuracy fiction',async()=>{
    const db=store();const date=new Date().toISOString().slice(0,10);const state=await getLearningState(db,who,date);
    expect(state.draft_id).toBe(await dailyDraftId(userId,date));expect(state.accuracy).toBeNull();expect(state.time_spent).toBeNull();
    expect(state.draft_id).not.toBe(await dailyDraftId(clientId,date));
  });
  it('refuses unknown binders, changed level/version, and foreign IDs before insertion',async()=>{
    const body=await delivery();
    for(const draft of [{...body.draft,level:'B2'},{...body.draft,based_on_learning_state_version:2},{...body.draft,draft_id:clientId},{...body.draft,filing:{kind:'existing',binderId:clientId,reason:'No',sceneTags:['test']}}]){
      const db=store();await expect(deliverDraft(db,who,{...body,draft})).rejects.toBeInstanceOf(MuseError);
      expect(vi.mocked(db.call).mock.calls.some(call=>call[1]==='deliver')).toBe(false);
    }
    expect(await deliverDraft(store(),who,body)).toEqual({receipt:'accepted'});
  });
  it('retries identically even after the summary changes, but rejects different content',async()=>{
    const db=store();const body=await delivery();await deliverDraft(db,who,body);
    const saved=vi.mocked(db.call).mock.calls.find(call=>call[1]==='deliver')![2]!;
    const other=store();vi.mocked(other.call).mockResolvedValue({found:true,payload_hash:saved.payload_hash,status:'filed'});
    expect(await deliverDraft(other,who,body)).toMatchObject({receipt:'duplicate',status:'filed'});
    await expect(deliverDraft(other,who,{...body,draft:{...body.draft,title:'Changed'}})).rejects.toMatchObject({code:'delivery_conflict'});
  });
});
describe('MCP transport',()=>{
  async function rpc(response:Response) { const text=await response.text();return JSON.parse(text.startsWith('event:') ? text.split('\n').find(line=>line.startsWith('data:'))!.slice(5):text); }
  const env={...ACCESS_ENV,RATE_LIMIT:{prepare:()=>({bind:()=>({first:async()=>({n:1}),run:async()=>({})})})}};
  it('advertises OAuth when no bearer is provided',async()=>{
    const r=await handleMcp(new Request('https://example.test/mcp'),env,store());expect(r.status).toBe(401);
    expect(r.headers.get('www-authenticate')).toContain('/.well-known/oauth-protected-resource/mcp');
  });
  it('serves initialize and only the three narrow tools over stateless streamable HTTP',async()=>{
    const initialized=await handleMcp(request('/mcp',{jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-11-25',capabilities:{},clientInfo:{name:'synthetic-test',version:'1'}}}),env,store());
    expect(initialized.status).toBe(200);expect((await rpc(initialized)).result.serverInfo.name).toBe('sentence-book-muse');
    const listed=await handleMcp(request('/mcp',{jsonrpc:'2.0',id:2,method:'tools/list'},{'MCP-Protocol-Version':'2025-11-25'}),env,store());
    expect(listed.status).toBe(200);expect((await rpc(listed)).result.tools.map((t:{name:string})=>t.name)).toEqual(['get_lesson_guide','get_learning_state','deliver_page_draft']);
  });
});
describe('explicit minimal summary',()=>{
  function memory(values:Record<string,string>={}) {return {getItem:(key:string)=>values[key]??null,setItem:vi.fn()} as unknown as Storage;}
  it('includes reviewed preferences but excludes topic, raw sentence and personal notes',()=>{
    const values={ [COMPOSER_KEY]:JSON.stringify({schemaVersion:1,topic:'PRIVATE TOPIC',level:'B1',nativeLanguage:'ja'}),[INTERESTS_KEY]:JSON.stringify({schemaVersion:1,interests:['Travel']}),[WORDBOOK_KEY]:JSON.stringify({version:1,entries:[{pageId:null,pageTitle:'PRIVATE TITLE',sentenceId:'s1',start:0,end:4,sentence:'PRIVATE SENTENCE',expression:'test',native:'試す',note:'PRIVATE NOTE',lookedUpAt:new Date().toISOString()}]}) };
    const storage=memory(values);const result=buildLearningSummary(storage);
    expect(JSON.stringify(result)).not.toContain('PRIVATE');expect(result.interests).toEqual(['Travel']);expect(result.review_candidates).toEqual([{expression:'test',native:'試す'}]);expect(storage.setItem).not.toHaveBeenCalled();
  });
  it('blocks sharing on unreadable data without overwriting it',()=>{const storage=memory({[WORDBOOK_KEY]:'{bad'});expect(()=>buildLearningSummary(storage)).toThrow();expect(storage.setItem).not.toHaveBeenCalled();});
});
