import { lessonGuide } from '../../../shared/muse-connection';
import { accessConfig } from '../../lib/access';
import { bearer, integrationTool, manageAccount, museConfig, museFailure, MuseError, principal, requestOrigin, supabaseMuseStore } from '../../lib/muse-account';
import type { MuseEnv } from '../../lib/muse-account';
import { noStore, readJsonBody, rateLimitFailure } from '../../lib/route';
import { checkRateLimit } from '../../lib/rate-limit';
import type { RateLimitEnv } from '../../lib/rate-limit';

export const onRequest: PagesFunction<MuseEnv & RateLimitEnv> = async ({ request,env,params }) => {
  const action = String(params.action);
  try {
    const origin = requestOrigin(request,env, action === 'manage');
    if (request.method === 'GET' && action === 'config') {
      const config = museConfig(env);
      return Response.json(config ? { configured:true,url:config.url,publishableKey:config.publishableKey,origin } : { configured:false }, { headers:noStore });
    }
    if (request.method === 'GET' && action === 'guide') return Response.json(lessonGuide(),{headers:noStore});
    bearer(request); // Reject anonymous calls before store construction and quota counting.
    const store = supabaseMuseStore(env);
    if (action === 'manage') return await manageAccount(request,env,store);
    const who = await principal(request,store,true);
    const policy = { name:'muse', perMinute:30, perDay:500, globalPerDay:10000 };
    const limit = await checkRateLimit(env,request,policy);
    if (!limit.ok) return rateLimitFailure(limit,policy);
    if (request.method !== 'POST') throw new MuseError('method_not_allowed',405);
    const body = await readJsonBody(request,64*1024);
    if (!body.ok) return body.response;
    const names: Record<string,string> = { 'learning-state':'get_learning_state',deliver:'deliver_page_draft' };
    if (!names[action]) throw new MuseError('not_found',404);
    return Response.json(await integrationTool(store,who,names[action],body.json),{headers:noStore});
  } catch (error) { return museFailure(error,accessConfig(env)?.origin); }
};
