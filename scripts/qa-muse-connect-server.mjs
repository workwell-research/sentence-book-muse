// Disposable browser QA only. Synthetic auth/data; never deploy this server.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve,extname } from 'node:path';
const port=Number(process.env.QA_PORT??8803),root=resolve('dist'),origin=`http://127.0.0.1:${port}`;
const id='10000000-0000-4000-8000-000000000001',clientId='30000000-0000-4000-8000-000000000001';
const draft={draft_id:'40000000-0000-4000-8000-000000000001',title:'A slower morning',level:'A2',native_language:'ja',sentences:[{en:'I open the window.',native:'窓を開けます。'},{en:'The morning air is cool.',native:'朝の空気は涼しいです。'},{en:'I make a cup of coffee.',native:'コーヒーを一杯いれます。'},{en:'I take my time today.',native:'今日はゆっくり過ごします。'}],questions:[{en:'What do you do first?',native:'最初に何をしますか？',sample_answer:{en:'I open the window.',native:'窓を開けます。'}}],review_items:[{expression:'take my time',native:'ゆっくりする',sentence_index:3}],estimated_minutes:5,based_on_learning_state_version:1,filing:{kind:'new',newBinder:{title:'Small mornings',description:'毎朝の小さな習慣'},reason:'朝の出来事を集めます。',sceneTags:['朝','習慣']}};
const account={member:false,state:{version:0,summary:null,updated_at:new Date().toISOString()},inbox:[{draft_id:draft.draft_id,draft,status:'pending',received_at:new Date().toISOString()}],connections:[{client_id:clientId,client_name:'Muse (synthetic QA)',read_summary:true,deliver_drafts:true,created_at:new Date().toISOString()}],keys:[]};
let failAction='';
const user={id,aud:'authenticated',role:'authenticated',email:'learner@example.test',email_confirmed_at:new Date().toISOString(),created_at:new Date().toISOString(),app_metadata:{provider:'email'},user_metadata:{}};
const token=()=>[Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),Buffer.from(JSON.stringify({...user,sub:id,exp:Math.floor(Date.now()/1000)+3600,session_id:'20000000-0000-4000-8000-000000000001'})).toString('base64url'),'synthetic'].join('.');
http.createServer(async(req,res)=>{
  try {
    const url=new URL(req.url,origin);const body=await new Promise((resolve,reject)=>{let text='';req.on('data',c=>{text+=c;if(text.length>1000000)reject(new Error('large'));});req.on('end',()=>resolve(text?JSON.parse(text):{}));});
    const json=(data,status=200)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
    if(url.pathname==='/__qa/control'){failAction=body.failAction??'';if(body.connections===false)account.connections=[];if(body.seed){draft.draft_id='40000000-0000-4000-8000-000000000002';account.inbox=[{draft_id:draft.draft_id,draft,status:'pending',received_at:new Date().toISOString()}];}json({ready:true});return;}
    if(url.pathname==='/api/access'){json({authorized:false});return;}
    if(url.pathname==='/api/review'){const own=String(body.own??'');const unclear=/\bxx\b/i.test(own);json({contract:'sentence_book_review_v1',result:{own,verdict:unclear?'unclear':'fine',natural:unclear?body.model:own.trim()===String(body.model).trim()?null:'（合成QA）'+body.model,note:unclear?'（合成QA）意味が伝わりにくいので、お手本の形にしてみましょう。':own.trim()===String(body.model).trim()?null:'（合成QA）この言い方でも通じます。'},model:'synthetic-qa',usage:null});return;}
    if(url.pathname==='/api/lookup'){json({contract:'sentence_book_lookup_v1',result:{expression:body.expression,native:'（合成QAの意味）',note:null},model:'synthetic-qa',usage:null});return;}
    if(url.pathname==='/api/muse/config'){json({configured:true,url:origin,publishableKey:'synthetic-public-key',origin});return;}
    if(url.pathname==='/auth/v1/otp'){json({});return;}
    if(url.pathname==='/auth/v1/verify'||url.pathname==='/auth/v1/token'){json({access_token:token(),refresh_token:'synthetic-refresh-token',token_type:'bearer',expires_in:3600,user});return;}
    if(url.pathname==='/auth/v1/user'){json(user);return;}
    if(url.pathname==='/auth/v1/logout'){json({});return;}
    if(url.pathname==='/auth/v1/oauth/grants'){json({});return;}
    if(url.pathname.startsWith('/auth/v1/oauth/authorizations/')){
      if(req.method==='GET')json({authorization_id:'50000000-0000-4000-8000-000000000001',redirect_uri:origin+'/connect',client:{id:clientId,name:'Muse (synthetic QA)',uri:origin,logo_uri:''},user:{id,email:user.email},scope:'email'});
      else json({redirect_url:origin+'/connect'});return;
    }
    if(url.pathname==='/api/muse/manage'){
      if(req.method==='GET'){json(account);return;}
      if(body.action===failAction){failAction='';json({error:{code:'store_unavailable'}},503);return;}
      if(body.action==='enroll')account.member=true;
      if(body.action==='publish'||body.action==='unshare'){
        if(body.expected_version!==account.state.version){json({error:{code:'state_conflict'}},409);return;}
        account.state={version:account.state.version+1,summary:body.action==='publish'?body.summary:null,updated_at:new Date().toISOString()};
      }
      if(body.action==='resolve')account.inbox=account.inbox.filter(i=>i.draft_id!==body.draft_id);
      if(body.action==='revoke')account.connections=[];
      if(body.action==='create_key'){const key={id:crypto.randomUUID(),label:body.label,read_summary:body.permissions.read_summary,deliver_drafts:body.permissions.deliver_drafts,created_at:new Date().toISOString(),expires_at:new Date(Date.now()+30*864e5).toISOString()};account.keys.unshift(key);json({key,token:'sbm_synthetic_'+key.id.replaceAll('-','')});return;}
      if(body.action==='revoke_key')account.keys=account.keys.filter(k=>k.id!==body.key_id);
      json({ok:true});return;
    }
    const path=resolve(root,'.'+decodeURIComponent(url.pathname));if(path!==root&&!path.startsWith(root+'/')){json({error:'path'},400);return;}
    let data;try{data=await readFile(path);}catch{data=await readFile(resolve(root,'index.html'));}
    const types={'.js':'text/javascript','.css':'text/css','.woff':'font/woff','.woff2':'font/woff2','.png':'image/png','.svg':'image/svg+xml','.json':'application/json','.pdf':'application/pdf'};
    res.writeHead(200,{'Content-Type':types[extname(path)]??'text/html','Cache-Control':'no-store'});res.end(data);
  }catch{res.writeHead(500);res.end('Synthetic QA request failed');}
}).listen(port,'127.0.0.1',()=>console.log('Synthetic Muse UI QA at '+origin));
