import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BCBDataPoint {
  data: string;
  valor: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Fetching BCB economic indicators...');

    // Fetch Selic (series 432)
    const selicResponse = await fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1');
    const selicData: BCBDataPoint[] = await selicResponse.json();
    
    // Fetch IPCA (series 433)
    const ipcaResponse = await fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados/ultimos/1');
    const ipcaData: BCBDataPoint[] = await ipcaResponse.json();
    
    // Fetch CDI (series 12)
    const cdiResponse = await fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados/ultimos/1');
    const cdiData: BCBDataPoint[] = await cdiResponse.json();

    const indicators = {
      selic: {
        value: parseFloat(selicData[0]?.valor || '0'),
        date: selicData[0]?.data || '',
        formatted: `${parseFloat(selicData[0]?.valor || '0').toFixed(2)}%`
      },
      ipca: {
        value: parseFloat(ipcaData[0]?.valor || '0'),
        date: ipcaData[0]?.data || '',
        formatted: `${parseFloat(ipcaData[0]?.valor || '0').toFixed(2)}%`
      },
      cdi: {
        value: parseFloat(cdiData[0]?.valor || '0'),
        date: cdiData[0]?.data || '',
        formatted: `${parseFloat(cdiData[0]?.valor || '0').toFixed(2)}%`
      }
    };

    console.log('BCB indicators fetched successfully:', indicators);

    return new Response(
      JSON.stringify(indicators),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error fetching BCB indicators:', error);
    return new Response(
      JSON.stringify({ error: 'Erro ao buscar indicadores do Banco Central' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
