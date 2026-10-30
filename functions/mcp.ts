import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { deliverySchema } from '../shared/muse-connection';
import { accessConfig } from './lib/access';
import { bearer, integrationTool, MuseError, museFailure, principal, requestOrigin, supabaseMuseStore } from './lib/muse-account';
import type { MuseEnv, MuseStore } from './lib/muse-account';
import { noStore, rateLimitFailure } from './lib/route';
import { checkRateLimit } from './lib/rate-limit';
import type { RateLimitEnv } from './lib/rate-limit';

export async function handleMcp(request: Request,env: MuseEnv & RateLimitEnv,provided?: MuseStore): Promise<Response> {
  try {
    requestOrigin(request,env,false);
    bearer(request);
    const store = provided ?? supabaseMuseStore(env);
    const who = await principal(request,store,true);
    await store.call(who,'guide');
    const policy = { name:'muse',perMinute:30,perDay:500,globalPerDay:10000 };
    const limited = await checkRateLimit(env,request,policy);
    if (!limited.ok) return rateLimitFailure(limited,policy);
    const handler = createMcpHandler(() => {
      const server = new McpServer({ name:'sentence-book-muse',version:'1.0.0' });
      const run = async (name: string,args: unknown) => {
        try {
          const result = await integrationTool(store,who,name,args);
          return { content:[{ type:'text' as const,text:JSON.stringify(result) }] };
        } catch (error) {
          return { isError:true,content:[{ type:'text' as const,text:JSON.stringify({ error:error instanceof MuseError ? error.code : 'store_unavailable' }) }] };
        }
      };
      server.registerTool('get_lesson_guide',{ description:'Read the sentence_book_page_v1 schema and authoring guide. No user history is returned.',inputSchema:z.strictObject({}),annotations:{ readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false } },args=>run('get_lesson_guide',args));
      server.registerTool('get_learning_state',{ description:'Read only the learner-approved summary snapshot and a stable daily draft ID. Requires summary permission. This is not full history.',inputSchema:z.strictObject({ delivery_date:z.iso.date() }),annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false} },args=>run('get_learning_state',args));
      server.registerTool('deliver_page_draft',{description:'Deliver one validated sentence_book_page_v1 draft to the connected learner’s inbox. Requires delivery permission. Does not adopt a page or call a model. Same date/content is idempotent; different content with the same ID is refused.',inputSchema:deliverySchema,annotations:{readOnlyHint:false,destructiveHint:false,idempotentHint:true,openWorldHint:false}},args=>run('deliver_page_draft',args));
      return server;
    },{ responseMode:'auto',maxRequestBodySize:64*1024,maxSubscriptions:0 });
    const response = await handler.fetch(request);
    const headers = new Headers(response.headers); headers.set('Cache-Control',noStore['Cache-Control']);
    return new Response(response.body,{status:response.status,headers});
  } catch (error) { return museFailure(error,accessConfig(env)?.origin); }
}
export const onRequest: PagesFunction<MuseEnv & RateLimitEnv> = ({request,env})=>handleMcp(request,env);
