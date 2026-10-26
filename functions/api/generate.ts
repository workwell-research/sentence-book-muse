/** Fail closed until the provider adapter and both validation boundaries are connected. */
export const onRequest: PagesFunction = ({ request }) => {
  if (request.method !== 'POST') return Response.json(
    { error: { code: 'method_not_allowed', message: 'Use POST.' } },
    { status: 405, headers: { Allow: 'POST', 'Cache-Control': 'no-store' } },
  );
  return Response.json(
    { error: { code: 'generation_unavailable', message: '教材づくりは準備中です。' } },
    { status: 503, headers: { 'Cache-Control': 'no-store' } },
  );
};
