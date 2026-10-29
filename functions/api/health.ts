import { modelConfig } from '../lib/model-client';
import type { ModelEnv } from '../lib/model-client';

// Reports whether generation is configured without revealing any secret value.
export const onRequestGet: PagesFunction<ModelEnv> = ({ env }) => {
  const config = modelConfig(env);
  return Response.json(
    config ? { status: 'ok', generation: 'ready', model: config.model } : { status: 'ok', generation: 'unavailable' },
    { headers: { 'Cache-Control': 'no-store' } },
  );
};
