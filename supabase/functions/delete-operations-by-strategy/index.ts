import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { strategy } = await req.json()
    
    if (!strategy) {
      return new Response(
        JSON.stringify({ error: 'Strategy is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    let totalDeleted = 0
    let hasMore = true

    while (hasMore) {
      // Fetch a single ID
      const { data: operations, error: fetchError } = await supabase
        .from('trading_operations')
        .select('id')
        .ilike('strategy', strategy)
        .limit(1)

      if (fetchError) {
        console.error('Fetch error:', fetchError)
        throw fetchError
      }

      if (!operations || operations.length === 0) {
        hasMore = false
        break
      }

      const id = operations[0].id

      // Delete single record
      const { error: deleteError } = await supabase
        .from('trading_operations')
        .delete()
        .eq('id', id)

      if (deleteError) {
        console.error('Delete error:', deleteError)
        // Continue even with errors
        await new Promise(resolve => setTimeout(resolve, 500))
        continue
      }

      totalDeleted += 1
      
      if (totalDeleted % 10 === 0) {
        console.log(`Deleted ${totalDeleted} operations...`)
      }

      // Delay between deletions
      await new Promise(resolve => setTimeout(resolve, 200))
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        deleted: totalDeleted,
        strategy 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
