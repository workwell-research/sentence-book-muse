import { modelConfig } from '../lib/model-client';
import type { ModelEnv } from '../lib/model-client';
import type { RateLimitEnv } from '../lib/rate-limit';
import { accessConfig } from '../lib/access';
import type { AccessEnv } from '../lib/access';

// Reports whether generation is configured without revealing any secret value.
export const onRequestGet: PagesFunction<ModelEnv & RateLimitEnv & AccessEnv> = ({ env }) => {
  const config = modelConfig(env);
  return Response.json(
    { status: 'ok', ...(config ? { generation: 'ready', model: config.model } : { generation: 'unavailable' }), limits: env.RATE_LIMIT ? 'configured' : 'unconfigured', access: accessConfig(env) ? 'invite_required' : 'unconfigured' },
    { headers: { 'Cache-Control': 'no-store' } },
  );
};
