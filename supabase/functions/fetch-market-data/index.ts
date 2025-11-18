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
    console.log('BRAPI_TOKEN available:', brapiToken ? 'YES' : 'NO');

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
      console.log('Using Brapi with token query param for real indices...');
      try {
        const qp = (url: string) => url + (url.includes('?') ? '&' : '?') + `token=${brapiToken}`;
        const [ibov, sp, usd] = await Promise.all([
          fetchJSON(qp(`https://brapi.dev/api/quote/%5EBVSP?range=1d&interval=1d`)).catch((e) => {
            console.warn('Brapi ^BVSP error:', e);
            return null;
          }),
          fetchJSON(qp(`https://brapi.dev/api/quote/%5EGSPC?range=1d&interval=1d`)).catch((e) => {
            console.warn('Brapi ^GSPC error:', e);
            return null;
          }),
          fetchJSON(qp(`https://brapi.dev/api/quote/USDBRL%3DX?range=1d&interval=1d`)).catch((e) => {
            console.warn('Brapi USDBRL=X error:', e);
            return null;
          }),
        ]);
        
        console.log('Brapi responses:', { 
          ibov: ibov?.results?.[0] ? 'OK' : 'EMPTY', 
          sp: sp?.results?.[0] ? 'OK' : 'EMPTY',
          usd: usd?.results?.[0] ? 'OK' : 'EMPTY'
        });
        
        ibovData = ibov?.results?.[0];
        sp500Data = sp?.results?.[0];
        usdData = usd?.results?.[0];
      } catch (e) {
        console.warn('Brapi with token failed, falling back', e);
      }
    } else {
      console.log('No BRAPI_TOKEN found, skipping Brapi with token');
    }

    // Fallback 1: Brapi ETFs (no token needed for BOVA11/IVVB11)
    if (!ibovData || !sp500Data) {
      console.log('Falling back to Brapi ETFs (BOVA11, IVVB11)...');
      try {
        const qp = (url: string) => brapiToken ? url + (url.includes('?') ? '&' : '?') + `token=${brapiToken}` : url;
        const [bova, ivvb] = await Promise.all([
          fetchJSON(qp('https://brapi.dev/api/quote/BOVA11?range=1d&interval=1d')).catch((e) => {
            console.warn('Brapi BOVA11 error:', e);
            return null;
          }),
          fetchJSON(qp('https://brapi.dev/api/quote/IVVB11?range=1d&interval=1d')).catch((e) => {
            console.warn('Brapi IVVB11 error:', e);
            return null;
          }),
        ]);
        
        if (!ibovData && bova?.results?.[0]) {
          ibovData = bova.results[0];
          console.log('Using BOVA11 as Ibovespa proxy');
        }
        
        if (!sp500Data && ivvb?.results?.[0]) {
          sp500Data = ivvb.results[0];
          console.log('Using IVVB11 as S&P500 proxy');
        }
      } catch (e) {
        console.warn('Brapi ETFs fallback failed', e);
      }
    }

    // Fallback 2: Yahoo Finance (no token) for indices
    if (!ibovData || !sp500Data) {
      console.log('Falling back to Yahoo Finance for indices...');
      try {
        const [yIbov, ySp] = await Promise.all([
          fetchJSON('https://query1.finance.yahoo.com/v8/finance/chart/%5EBVSP?range=1d&interval=1d').catch((e) => {
            console.warn('Yahoo ^BVSP error:', e);
            return null;
          }),
          fetchJSON('https://query1.finance.yahoo.com/v8/finance/chart/%5EGSPC?range=1d&interval=1d').catch((e) => {
            console.warn('Yahoo ^GSPC error:', e);
            return null;
          }),
        ]);

        if (!ibovData) {
          const meta = yIbov?.chart?.result?.[0]?.meta;
          const quotes = yIbov?.chart?.result?.[0]?.indicators?.quote?.[0];
          if (meta && quotes) {
            const price = num(meta?.regularMarketPrice ?? quotes?.close?.[quotes.close.length - 1]);
            const prev = num(meta?.chartPreviousClose);
            const changePct = prev ? ((price - prev) / prev) * 100 : 0;
            ibovData = { regularMarketPrice: price, regularMarketChangePercent: changePct };
            console.log('Using Yahoo Finance for Ibovespa:', { price, prev, changePct });
          }
        }

        if (!sp500Data) {
          const meta = ySp?.chart?.result?.[0]?.meta;
          const quotes = ySp?.chart?.result?.[0]?.indicators?.quote?.[0];
          if (meta && quotes) {
            const price = num(meta?.regularMarketPrice ?? quotes?.close?.[quotes.close.length - 1]);
            const prev = num(meta?.chartPreviousClose);
            const changePct = prev ? ((price - prev) / prev) * 100 : 0;
            sp500Data = { regularMarketPrice: price, regularMarketChangePercent: changePct };
            console.log('Using Yahoo Finance for S&P500:', { price, prev, changePct });
          }
        }
      } catch (e) {
        console.warn('Yahoo Finance fallback failed', e);
      }
    }

    // Fallback 3: AwesomeAPI for USD/BRL
    if (!usdData) {
      console.log('Falling back to AwesomeAPI for USD/BRL...');
      try {
        const awesome = await fetchJSON('https://economia.awesomeapi.com.br/json/last/USD-BRL');
        usdData = awesome?.USDBRL;
        if (usdData) {
          console.log('AwesomeAPI USD/BRL success');
        }
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

    // Format date in Brazil timezone
    const now = new Date();
    const brazilTime = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      dateStyle: 'short',
      timeStyle: 'medium'
    }).format(now);

    // Determine sources
    let ibovSource = 'Yahoo Finance';
    let sp500Source = 'Yahoo Finance';
    let usdSource = 'AwesomeAPI';
    
    if (brapiToken && ibovData && ibovData.regularMarketPrice && ibovData.regularMarketChangePercent) {
      ibovSource = 'Brapi';
    }
    if (brapiToken && sp500Data && sp500Data.regularMarketPrice && sp500Data.regularMarketChangePercent) {
      sp500Source = 'Brapi';
    }
    if (usdData && usdData.bid) {
      usdSource = 'AwesomeAPI';
    }

    const marketData = {
      ibovespa: {
        value: ibovValue,
        change: ibovChange,
        formatted: fmt(ibovChange),
        isPositive: ibovChange > 0,
        source: ibovSource,
      },
      dolar: {
        value: usdValue,
        change: usdChange,
        formatted: fmt(usdChange),
        isPositive: usdChange > 0,
        source: usdSource,
      },
      sp500: {
        value: sp500Value,
        change: sp500Change,
        formatted: fmt(sp500Change),
        isPositive: sp500Change > 0,
        source: sp500Source,
      },
      lastUpdate: brazilTime,
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
