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
    console.log('Fetching market data (Brapi with token + fallbacks)...');

    const brapiToken = Deno.env.get('BRAPI_TOKEN');

    const fetchJSON = async (url: string, headers?: HeadersInit) => {
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error(`${url} => HTTP ${res.status}`);
      return res.json();
    };

    const num = (v: unknown, d = 0) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : d;
    };

    // Try Brapi with token for real indices
    let ibovData: any = null;
    let sp500Data: any = null;
    let usdData: any = null;

    if (brapiToken) {
      console.log('Using Brapi with token for real indices...');
      try {
        const [ibov, sp, usd] = await Promise.all([
          fetchJSON(`https://brapi.dev/api/quote/%5EBVSP?range=1d&interval=1d&token=${brapiToken}`).catch(() => null),
          fetchJSON(`https://brapi.dev/api/quote/%5EGSPC?range=1d&interval=1d&token=${brapiToken}`).catch(() => null),
          fetchJSON(`https://brapi.dev/api/quote/USDBRL%3DX?range=1d&interval=1d&token=${brapiToken}`).catch(() => null),
        ]);
        
        ibovData = ibov?.results?.[0];
        sp500Data = sp?.results?.[0];
        usdData = usd?.results?.[0];
      } catch (e) {
        console.warn('Brapi with token failed, falling back', e);
      }
    }

    // Fallback 1: Brapi ETFs (no token needed for BOVA11/IVVB11)
    if (!ibovData || !sp500Data) {
      console.log('Falling back to Brapi ETFs (BOVA11, IVVB11)...');
      try {
        const [bova, ivvb] = await Promise.all([
          fetchJSON('https://brapi.dev/api/quote/BOVA11?range=1d&interval=1d').catch(() => null),
          fetchJSON('https://brapi.dev/api/quote/IVVB11?range=1d&interval=1d').catch(() => null),
        ]);
        
        if (!ibovData && bova?.results?.[0]) {
          ibovData = bova.results[0];
        }
        
        if (!sp500Data && ivvb?.results?.[0]) {
          sp500Data = ivvb.results[0];
        }
      } catch (e) {
        console.warn('Brapi ETFs fallback failed', e);
      }
    }

    // Fallback 2: AwesomeAPI for USD/BRL
    if (!usdData) {
      console.log('Falling back to AwesomeAPI for USD/BRL...');
      try {
        const awesome = await fetchJSON('https://economia.awesomeapi.com.br/json/last/USD-BRL');
        usdData = awesome?.USDBRL;
      } catch (e) {
        console.warn('AwesomeAPI fallback failed', e);
      }
    }

    const ibovValue = num(ibovData?.regularMarketPrice ?? ibovData?.price ?? ibovData?.bid);
    const ibovChange = num(ibovData?.regularMarketChangePercent ?? ibovData?.pctChange ?? ibovData?.changePercent);

    const sp500Value = num(sp500Data?.regularMarketPrice ?? sp500Data?.price);
    const sp500Change = num(sp500Data?.regularMarketChangePercent ?? sp500Data?.pctChange ?? sp500Data?.changePercent);

    const usdValue = num(usdData?.bid ?? usdData?.regularMarketPrice ?? usdData?.price);
    const usdChange = num(usdData?.pctChange ?? usdData?.regularMarketChangePercent ?? usdData?.changePercent);

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
        value: sp500Value,
        change: sp500Change,
        formatted: fmt(sp500Change),
        isPositive: sp500Change > 0,
      },
      lastUpdate: new Date().toLocaleString('pt-BR'),
    };

    console.log('Market data compiled successfully:', marketData);

    return new Response(JSON.stringify(marketData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error fetching market data:', error);
    return new Response(JSON.stringify({ error: 'Erro ao buscar dados do mercado' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
