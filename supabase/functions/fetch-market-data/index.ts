import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Fetching market data (multi-source)...');

    const cors = corsHeaders; // keep reference

    const safeNum = (v: unknown, d = 0) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : d;
    };

    const fetchJSON = async (url: string, init?: RequestInit) => {
      const res = await fetch(url, init);
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      return res.json();
    };

    const getFromBrapi = async (symbol: string) => {
      try {
        const data = await fetchJSON(`https://brapi.dev/api/quote/${encodeURIComponent(symbol)}?range=1d&interval=1d`);
        return data?.results?.[0] ?? null;
      } catch (e) {
        console.warn('brapi error for', symbol, e);
        return null;
      }
    };

    const getFromYahoo = async (symbols: string[]) => {
      try {
        const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols.map(encodeURIComponent).join(',')}`;
        const data = await fetchJSON(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const list = data?.quoteResponse?.result || [];
        const map: Record<string, any> = {};
        for (const s of symbols) {
          map[s] = list.find((r: any) => r.symbol === s) || null;
        }
        return map;
      } catch (e) {
        console.warn('yahoo error', e);
        return {} as Record<string, any>;
      }
    };

    // Fetch in parallel: brapi for ETFs (proxies) and AwesomeAPI for USD/BRL
    const [bovaBrapi, ivvbBrapi, usdAwesome] = await Promise.all([
      getFromBrapi('BOVA11'),
      getFromBrapi('IVVB11'),
      (async () => {
        try {
          return await fetchJSON('https://economia.awesomeapi.com.br/json/last/USD-BRL');
        } catch (e) {
          console.warn('awesomeapi error', e);
          return null;
        }
      })(),
    ]);

    // Prepare Yahoo fallbacks only for missing symbols
    const yahooSymbols: string[] = [];
    if (!bovaBrapi) yahooSymbols.push('BOVA11.SA');
    if (!ivvbBrapi) yahooSymbols.push('IVVB11.SA');
    if (!usdAwesome) yahooSymbols.push('USDBRL=X');

    const yahooMap = yahooSymbols.length ? await getFromYahoo(yahooSymbols) : {};

    const bova = bovaBrapi || yahooMap['BOVA11.SA'] || {};
    const ivvb = ivvbBrapi || yahooMap['IVVB11.SA'] || {};
    const usd = (usdAwesome && usdAwesome.USDBRL) || yahooMap['USDBRL=X'] || {};

    // Build normalized fields (using ETFs as proxies for indices)
    const ibovValue = safeNum(bova.regularMarketPrice ?? bova.price ?? bova.bid);
    const ibovChange = safeNum(bova.regularMarketChangePercent ?? bova.pctChange ?? bova.changePercent);

    const spValue = safeNum(ivvb.regularMarketPrice ?? ivvb.price);
    const spChange = safeNum(ivvb.regularMarketChangePercent ?? ivvb.pctChange ?? ivvb.changePercent);

    const usdValue = safeNum(usd.bid ?? usd.regularMarketPrice ?? usd.price);
    const usdChange = safeNum(usd.pctChange ?? usd.regularMarketChangePercent ?? usd.changePercent);

    if (
      !Number.isFinite(ibovValue) && !Number.isFinite(spValue) && !Number.isFinite(usdValue)
    ) {
      throw new Error('All data sources failed');
    }

    const fmt = (p: number) => `${p > 0 ? '▲' : '▼'} ${Math.abs(p).toFixed(2)}%`;

    const marketData = {
      ibovespa: {
        value: ibovValue || 0,
        change: ibovChange || 0,
        formatted: fmt(ibovChange || 0),
        isPositive: (ibovChange || 0) > 0,
      },
      dolar: {
        value: usdValue || 0,
        change: usdChange || 0,
        formatted: fmt(usdChange || 0),
        isPositive: (usdChange || 0) > 0,
      },
      sp500: {
        value: spValue || 0,
        change: spChange || 0,
        formatted: fmt(spChange || 0),
        isPositive: (spChange || 0) > 0,
      },
      lastUpdate: new Date().toLocaleString('pt-BR'),
    };

    console.log('Market data fetched successfully:', marketData);

    return new Response(
      JSON.stringify(marketData),
      { headers: { ...cors, 'Content-Type': 'application/json' }, status: 200 },
    );

    return new Response(
      JSON.stringify(marketData),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error fetching market data:', error);
    return new Response(
      JSON.stringify({ error: 'Erro ao buscar dados do mercado' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
