import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TABLES_TO_CLEAR = [
  'comment_likes',
  'post_reactions', 
  'post_mentions',
  'post_reports',
  'user_notifications',
  'community_comments',
  'ai_classification_logs',
  'notifications',
  'community_posts',
  'trading_operations',
  'profit_operations',
  'journal_trades',
  'account_transfers',
  'personal_finances',
  'lancamentos_financas',
  'recurring_transactions',
  'category_budgets',
  'strategies',
  'financial_accounts',
  'finance_categories',
  'categorias_financas',
  'metas_financeiras',
  'opportunities',
  'messages',
  'client_bots',
  'contracts',
  'registered_clients',
  'economic_events',
  'risk_management_settings',
  'access_logs',
  'access_sync_logs',
  'activity_logs',
  'user_badges',
  'badge_progress',
  'user_community_titles',
  'user_permissions',
  'user_roles',
]

interface DeleteResult {
  deleted: number
  error?: string
}

async function deleteInBatches(supabase: any, table: string): Promise<DeleteResult> {
  let totalDeleted = 0
  let consecutiveErrors = 0
  const maxConsecutiveErrors = 3

  while (consecutiveErrors < maxConsecutiveErrors) {
    try {
      const { data: rows, error: selectError } = await supabase
        .from(table)
        .select('id')
        .limit(1)

      if (selectError) {
        console.error(`Select error on ${table}:`, selectError.message)
        consecutiveErrors++
        await new Promise(r => setTimeout(r, 100))
        continue
      }

      if (!rows || rows.length === 0) {
        return { deleted: totalDeleted }
      }

      const id = (rows[0] as { id: string }).id

      const { error: deleteError } = await supabase
        .from(table)
        .delete()
        .eq('id', id)

      if (deleteError) {
        console.error(`Delete error on ${table}:`, deleteError.message)
        consecutiveErrors++
        await new Promise(r => setTimeout(r, 100))
        continue
      }

      totalDeleted++
      consecutiveErrors = 0

      if (totalDeleted % 100 === 0) {
        console.log(`${table}: ${totalDeleted} deleted`)
      }

      await new Promise(r => setTimeout(r, 10))
    } catch (err) {
      console.error(`Exception on ${table}:`, err)
      consecutiveErrors++
      await new Promise(r => setTimeout(r, 100))
    }
  }

  return { 
    deleted: totalDeleted, 
    error: totalDeleted > 0 ? undefined : 'Max errors reached' 
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const results: { table: string; deleted: number; error?: string }[] = []

    for (const table of TABLES_TO_CLEAR) {
      console.log(`Processing ${table}...`)
      const result = await deleteInBatches(supabase, table)
      results.push({ table, ...result })
    }

    try {
      await supabase
        .from('profiles')
        .update({
          full_name: null,
          phone: null,
          avatar_url: null,
          cpf: null,
          genial_id: null,
          has_genial_account: false,
          investment_profile: null,
          points: 0,
          level: 1,
          daily_login_streak: 0,
          totp_enabled: false,
          totp_secret: null,
          totp_verified_at: null,
          access_status: 'pendente',
          access_approved_at: null,
          access_approved_by: null,
          trial_expires_at: null,
          assessor_id: null,
          followers_count: 0,
          following_count: 0
        })
        .neq('id', '00000000-0000-0000-0000-000000000000')

      results.push({ table: 'profiles', deleted: 0, error: 'Reset to defaults' })
    } catch (err) {
      results.push({ table: 'profiles', deleted: 0, error: String(err) })
    }

    const totalDeleted = results.reduce((sum, r) => sum + r.deleted, 0)
    const errors = results.filter(r => r.error && !r.error.includes('Reset') && !r.error.includes('defaults'))

    return new Response(
      JSON.stringify({
        success: errors.length === 0,
        totalDeleted,
        tablesProcessed: results.length,
        errors: errors.length,
        details: results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
