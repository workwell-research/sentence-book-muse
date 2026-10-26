export const onRequestGet: PagesFunction = () => Response.json(
  { status: 'ok', generation: 'unavailable' },
  { headers: { 'Cache-Control': 'no-store' } },
);
