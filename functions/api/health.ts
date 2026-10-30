import { modelConfig } from '../lib/model-client';
import type { ModelEnv } from '../lib/model-client';
import type { RateLimitEnv } from '../lib/rate-limit';

// Reports whether generation is configured without revealing any secret value.
export const onRequestGet: PagesFunction<ModelEnv & RateLimitEnv> = ({ env }) => {
  const config = modelConfig(env);
  return Response.json(
    { status: 'ok', ...(config ? { generation: 'ready', model: config.model } : { generation: 'unavailable' }), limits: env.RATE_LIMIT ? 'ready' : 'unconfigured' },
    { headers: { 'Cache-Control': 'no-store' } },
  );
};
