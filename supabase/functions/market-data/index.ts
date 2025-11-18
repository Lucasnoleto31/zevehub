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
    console.log('Fetching market data (Brapi + AwesomeAPI fallbacks)...');

    const fetchJSON = async (url: string) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${url} => HTTP ${res.status}`);
      return res.json();
    };

    const [bovaData, ivvbData, usdData] = await Promise.all([
      fetchJSON('https://brapi.dev/api/quote/BOVA11?range=1d&interval=1d').catch((e) => {
        console.warn('Brapi BOVA11 error', e);
        return null;
      }),
      fetchJSON('https://brapi.dev/api/quote/IVVB11?range=1d&interval=1d').catch((e) => {
        console.warn('Brapi IVVB11 error', e);
        return null;
      }),
      fetchJSON('https://economia.awesomeapi.com.br/json/last/USD-BRL').catch((e) => {
        console.warn('AwesomeAPI USD error', e);
        return null;
      }),
    ]);

    const bova = bovaData?.results?.[0] ?? {};
    const ivvb = ivvbData?.results?.[0] ?? {};
    const usd = usdData?.USDBRL ?? {};

    const num = (v: unknown, d = 0) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : d;
    };

    const ibovChange = num(bova.regularMarketChangePercent ?? bova.pctChange ?? bova.changePercent);
    const ibovValue = num(bova.regularMarketPrice ?? bova.price ?? bova.bid);

    const spChange = num(ivvb.regularMarketChangePercent ?? ivvb.pctChange ?? ivvb.changePercent);
    const spValue = num(ivvb.regularMarketPrice ?? ivvb.price);

    const usdValue = num(usd.bid ?? usd.regularMarketPrice ?? usd.price);
    const usdChange = num(usd.pctChange ?? usd.regularMarketChangePercent ?? usd.changePercent);

    const fmt = (p: number) => `${p > 0 ? '▲' : '▼'} ${Math.abs(p).toFixed(2)}%`;

    const marketData = {
      ibovespa: {
        value: ibovValue,
        change: ibovChange,
        formatted: fmt(ibovChange),
        isPositive: ibovChange > 0,
      },
      dolar: {
        value: usdValue,
        change: usdChange,
        formatted: fmt(usdChange),
        isPositive: usdChange > 0,
      },
      sp500: {
        value: spValue,
        change: spChange,
        formatted: fmt(spChange),
        isPositive: spChange > 0,
      },
      lastUpdate: new Date().toLocaleString('pt-BR'),
    };

    console.log('Market data compiled:', marketData);

    return new Response(JSON.stringify(marketData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error fetching market data (market-data fn):', error);
    return new Response(JSON.stringify({ error: 'Erro ao buscar dados do mercado' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
