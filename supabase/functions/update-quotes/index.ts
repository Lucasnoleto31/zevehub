import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QuoteRequest {
  ticker: string;
  type: 'stocks' | 'fixed_income';
}

// Função para buscar cotação de ações da B3
async function fetchStockQuote(ticker: string): Promise<number | null> {
  try {
    console.log(`Fetching quote for stock: ${ticker}`);
    
    // Usando Brasil API para cotações
    const response = await fetch(
      `https://brapi.dev/api/quote/${ticker}?token=demo`
    );
    
    if (!response.ok) {
      console.error(`Failed to fetch stock quote for ${ticker}: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      const quote = data.results[0];
      console.log(`Got quote for ${ticker}: ${quote.regularMarketPrice}`);
      return quote.regularMarketPrice;
    }
    
    return null;
  } catch (error) {
    console.error(`Error fetching stock quote for ${ticker}:`, error);
    return null;
  }
}

// Função para buscar taxa CDI (simulada - em produção usar API do BCB)
async function fetchCDIRate(): Promise<number> {
  try {
    console.log('Fetching CDI rate from BCB API');
    
    // API do Banco Central - Taxa Selic Over (código 11)
    const response = await fetch(
      'https://api.bcb.gov.br/dados/serie/bcdata.sgs.11/dados/ultimos/1?formato=json'
    );
    
    if (!response.ok) {
      console.error('Failed to fetch CDI rate, using default');
      return 10.65; // Taxa padrão de fallback
    }
    
    const data = await response.json();
    
    if (data && data.length > 0) {
      const rate = parseFloat(data[0].valor);
      console.log(`Got CDI rate: ${rate}`);
      return rate;
    }
    
    return 10.65;
  } catch (error) {
    console.error('Error fetching CDI rate:', error);
    return 10.65;
  }
}

// Função para simular cotação de renda fixa
async function fetchFixedIncomeQuote(name: string, initialValue: number): Promise<number> {
  try {
    console.log(`Calculating fixed income quote for: ${name}`);
    
    // Para renda fixa, aplicamos um rendimento baseado no CDI
    const cdiRate = await fetchCDIRate();
    
    // Assumindo rendimento mensal aproximado
    const monthlyRate = cdiRate / 12 / 100;
    
    // Calcula o valor com juros compostos (simplificado - em produção considerar dias úteis)
    const updatedValue = initialValue * (1 + monthlyRate);
    
    console.log(`Updated fixed income value: ${updatedValue}`);
    return updatedValue;
  } catch (error) {
    console.error('Error calculating fixed income quote:', error);
    return initialValue;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { investments } = await req.json() as { investments: Array<{
      id: string;
      name: string;
      type: 'stocks' | 'fixed_income';
      ticker?: string;
      amount: number;
      currentValue: number;
    }> };

    console.log(`Processing ${investments.length} investments`);

    const updatedInvestments = await Promise.all(
      investments.map(async (investment) => {
        try {
          let newValue = investment.currentValue;

          if (investment.type === 'stocks' && investment.ticker) {
            const quote = await fetchStockQuote(investment.ticker);
            if (quote !== null) {
              // Calcula quantidade de ações com base no investimento inicial
              const shares = investment.amount / (investment.currentValue / investment.amount || 1);
              newValue = shares * quote;
            }
          } else if (investment.type === 'fixed_income') {
            newValue = await fetchFixedIncomeQuote(investment.name, investment.currentValue);
          }

          return {
            id: investment.id,
            currentValue: newValue,
            updated: newValue !== investment.currentValue,
          };
        } catch (error) {
          console.error(`Error updating investment ${investment.id}:`, error);
          return {
            id: investment.id,
            currentValue: investment.currentValue,
            updated: false,
          };
        }
      })
    );

    console.log('Successfully updated investments');

    return new Response(
      JSON.stringify({ 
        success: true,
        investments: updatedInvestments,
        updatedCount: updatedInvestments.filter(inv => inv.updated).length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in update-quotes function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
