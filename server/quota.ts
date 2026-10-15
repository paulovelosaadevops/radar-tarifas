// Cota da conta SerpApi. Esta consulta não gasta buscas.

export async function GET(): Promise<Response> {
  const apiKey = process.env.SERPAPI_API_KEY;
  const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
  if (!apiKey) return new Response(JSON.stringify({ error: 'SERPAPI_API_KEY não configurada.' }), { status: 500, headers });

  try {
    const res = await fetch(`https://serpapi.com/account.json?api_key=${encodeURIComponent(apiKey)}`, { signal: AbortSignal.timeout(15_000) });
    const data: any = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || `SerpApi respondeu ${res.status}.`);
    return new Response(
      JSON.stringify({ plan: data.plan_name, perMonth: data.searches_per_month, left: data.total_searches_left, used: data.this_month_usage }),
      { status: 200, headers },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Falha ao consultar a cota.' }), { status: 502, headers });
  }
}
