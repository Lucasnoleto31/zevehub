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
    console.log('Fetching market data...');

    // Fetch Ibovespa data from Brasil API
    const ibovespaResponse = await fetch('https://brapi.dev/api/quote/^BVSP?range=1d&interval=1d');
    const ibovespaData = await ibovespaResponse.json();
    
    // Fetch USD/BRL (Dólar) from Brasil API
    const dolarResponse = await fetch('https://brapi.dev/api/quote/USDBRL=X?range=1d&interval=1d');
    const dolarData = await dolarResponse.json();
    
    // Fetch S&P500 from Brasil API
    const sp500Response = await fetch('https://brapi.dev/api/quote/^GSPC?range=1d&interval=1d');
    const sp500Data = await sp500Response.json();

    const marketData = {
      ibovespa: {
        value: ibovespaData.results?.[0]?.regularMarketPrice || 0,
        change: ibovespaData.results?.[0]?.regularMarketChangePercent || 0,
        formatted: `${ibovespaData.results?.[0]?.regularMarketChangePercent > 0 ? '▲' : '▼'} ${Math.abs(ibovespaData.results?.[0]?.regularMarketChangePercent || 0).toFixed(2)}%`,
        isPositive: (ibovespaData.results?.[0]?.regularMarketChangePercent || 0) > 0
      },
      dolar: {
        value: dolarData.results?.[0]?.regularMarketPrice || 0,
        change: dolarData.results?.[0]?.regularMarketChangePercent || 0,
        formatted: `${dolarData.results?.[0]?.regularMarketChangePercent > 0 ? '▲' : '▼'} ${Math.abs(dolarData.results?.[0]?.regularMarketChangePercent || 0).toFixed(2)}%`,
        isPositive: (dolarData.results?.[0]?.regularMarketChangePercent || 0) > 0
      },
      sp500: {
        value: sp500Data.results?.[0]?.regularMarketPrice || 0,
        change: sp500Data.results?.[0]?.regularMarketChangePercent || 0,
        formatted: `${sp500Data.results?.[0]?.regularMarketChangePercent > 0 ? '▲' : '▼'} ${Math.abs(sp500Data.results?.[0]?.regularMarketChangePercent || 0).toFixed(2)}%`,
        isPositive: (sp500Data.results?.[0]?.regularMarketChangePercent || 0) > 0
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
