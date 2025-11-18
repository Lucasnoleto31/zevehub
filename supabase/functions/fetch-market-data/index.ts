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
    console.log('Fetching market data using Yahoo Finance...');

    const yahooUrl = 'https://query1.finance.yahoo.com/v7/finance/quote?symbols=%5EBVSP,%5EGSPC,USDBRL%3DX';
    const response = await fetch(yahooUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    });

    if (!response.ok) {
      console.error('Yahoo API response not OK:', response.status, response.statusText);
      throw new Error(`Yahoo API error: ${response.status}`);
    }

    const data = await response.json();
    const results = data?.quoteResponse?.result || [];

    console.log('Yahoo results count:', results.length);

    const getBySymbol = (symbol: string) => results.find((r: any) => r.symbol === symbol) || {};

    const ibov = getBySymbol('^BVSP');
    const dolar = getBySymbol('USDBRL=X');
    const sp500 = getBySymbol('^GSPC');

    const safePercent = (v: number | undefined) => (typeof v === 'number' && isFinite(v) ? v : 0);

    const marketData = {
      ibovespa: {
        value: ibov.regularMarketPrice ?? 0,
        change: safePercent(ibov.regularMarketChangePercent),
        formatted: `${safePercent(ibov.regularMarketChangePercent) > 0 ? '▲' : '▼'} ${Math.abs(safePercent(ibov.regularMarketChangePercent)).toFixed(2)}%`,
        isPositive: safePercent(ibov.regularMarketChangePercent) > 0
      },
      dolar: {
        value: dolar.regularMarketPrice ?? 0,
        change: safePercent(dolar.regularMarketChangePercent),
        formatted: `${safePercent(dolar.regularMarketChangePercent) > 0 ? '▲' : '▼'} ${Math.abs(safePercent(dolar.regularMarketChangePercent)).toFixed(2)}%`,
        isPositive: safePercent(dolar.regularMarketChangePercent) > 0
      },
      sp500: {
        value: sp500.regularMarketPrice ?? 0,
        change: safePercent(sp500.regularMarketChangePercent),
        formatted: `${safePercent(sp500.regularMarketChangePercent) > 0 ? '▲' : '▼'} ${Math.abs(safePercent(sp500.regularMarketChangePercent)).toFixed(2)}%`,
        isPositive: safePercent(sp500.regularMarketChangePercent) > 0
      },
      lastUpdate: new Date().toLocaleString('pt-BR')
    };

    console.log('Market data fetched successfully:', marketData);

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
