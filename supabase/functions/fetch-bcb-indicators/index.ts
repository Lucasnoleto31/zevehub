import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BCBDataPoint {
  data: string;
  valor: string;
}

// Fallback values in case BCB API is down
const FALLBACK_DATA = {
  selic: { value: 15, date: "10/12/2025", formatted: "15.00%" },
  ipca: { value: 0.09, date: "01/10/2025", formatted: "0.09%" },
  cdi: { value: 0.055131, date: "17/11/2025", formatted: "0.06%" }
};

async function fetchBCBSeries(seriesId: number, name: string): Promise<{ value: number; date: string; formatted: string }> {
  try {
    const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${seriesId}/dados/ultimos/1?formato=json`;
    console.log(`Fetching ${name} from: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`${name} API returned ${response.status}`);
      throw new Error(`API returned ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error(`${name} API returned non-JSON content: ${contentType}`);
      throw new Error('Non-JSON response');
    }

    const data: BCBDataPoint[] = await response.json();
    
    if (!data || data.length === 0) {
      throw new Error('Empty response');
    }

    const value = parseFloat(data[0]?.valor || '0');
    return {
      value,
      date: data[0]?.data || '',
      formatted: `${value.toFixed(2)}%`
    };
  } catch (error) {
    console.error(`Error fetching ${name}:`, error);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Fetching BCB economic indicators...');

    const [selic, ipca, cdi] = await Promise.allSettled([
      fetchBCBSeries(432, 'Selic'),
      fetchBCBSeries(433, 'IPCA'),
      fetchBCBSeries(12, 'CDI'),
    ]);

    const indicators = {
      selic: selic.status === 'fulfilled' ? selic.value : FALLBACK_DATA.selic,
      ipca: ipca.status === 'fulfilled' ? ipca.value : FALLBACK_DATA.ipca,
      cdi: cdi.status === 'fulfilled' ? cdi.value : FALLBACK_DATA.cdi,
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
    
    // Return fallback data instead of error
    console.log('Using fallback data due to API error');
    return new Response(
      JSON.stringify(FALLBACK_DATA),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  }
});
