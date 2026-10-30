import { accessConfig } from '../../lib/access';
import { museConfig } from '../../lib/muse-account';
import type { MuseEnv } from '../../lib/muse-account';
export const onRequestGet: PagesFunction<MuseEnv> = ({ env }) => {
  const access = accessConfig(env), config = museConfig(env);
  if (!access || !config) return new Response('Unavailable',{status:503});
  return Response.json({resource:access.origin+'/mcp',authorization_servers:[config.url+'/auth/v1'],bearer_methods_supported:['header'],
    resource_name:'The Sentence Book — private draft inbox',resource_documentation:access.origin+'/api/muse/guide'},
    {headers:{'Cache-Control':'no-store','Access-Control-Allow-Origin':'*'}});
};
