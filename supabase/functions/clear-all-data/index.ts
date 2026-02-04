import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Order matters - delete child tables before parent tables
const TABLES_TO_CLEAR = [
  // 1. Most dependent tables first (grandchildren)
  'comment_likes',
  'post_reactions', 
  'post_mentions',
  'post_reports',
  'user_notifications',
  
  // 2. Child tables
  'community_comments',
  'ai_classification_logs',
  'notifications',
  
  // 3. Tables with foreign keys to posts
  'community_posts',
  
  // 4. Trading tables
  'trading_operations',
  'profit_operations',
  'journal_trades',
  
  // 5. Finance tables with FKs
  'account_transfers',
  'personal_finances',
  'lancamentos_financas',
  'recurring_transactions',
  'category_budgets',
  
  // 6. Reference tables
  'strategies',
  'financial_accounts',
  'finance_categories',
  'categorias_financas',
  'metas_financeiras',
  
  // 7. Independent tables
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
  
  // 8. Core user tables (last)
  'user_permissions',
  'user_roles',
  // 'profiles' - NOT deleting profiles as it will break auth
]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const results: { table: string; deleted: number; error?: string }[] = []

    for (const table of TABLES_TO_CLEAR) {
      try {
        // First count records
        const { count, error: countError } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })

        if (countError) {
          results.push({ table, deleted: 0, error: countError.message })
          continue
        }

        const recordCount = count || 0

        if (recordCount === 0) {
          results.push({ table, deleted: 0 })
          continue
        }

        // Delete in batches of 100 to avoid timeout
        let totalDeleted = 0
        let hasMore = true

        while (hasMore) {
          // Get batch of IDs
          const { data: batch, error: selectError } = await supabase
            .from(table)
            .select('id')
            .limit(100)

          if (selectError) {
            results.push({ table, deleted: totalDeleted, error: selectError.message })
            hasMore = false
            continue
          }

          if (!batch || batch.length === 0) {
            hasMore = false
            continue
          }

          const ids = batch.map((r: { id: string }) => r.id)

          const { error: deleteError } = await supabase
            .from(table)
            .delete()
            .in('id', ids)

          if (deleteError) {
            results.push({ table, deleted: totalDeleted, error: deleteError.message })
            hasMore = false
            continue
          }

          totalDeleted += ids.length

          if (batch.length < 100) {
            hasMore = false
          }
        }

        results.push({ table, deleted: totalDeleted })
      } catch (err) {
        results.push({ table, deleted: 0, error: String(err) })
      }
    }

    // Clear profiles data but keep the records (reset to defaults)
    try {
      const { error: profilesError } = await supabase
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
        .neq('id', '00000000-0000-0000-0000-000000000000') // Match all

      results.push({ 
        table: 'profiles', 
        deleted: 0, 
        error: profilesError ? profilesError.message : 'Reset to defaults (not deleted)'
      })
    } catch (err) {
      results.push({ table: 'profiles', deleted: 0, error: String(err) })
    }

    const totalDeleted = results.reduce((sum, r) => sum + r.deleted, 0)
    const errors = results.filter(r => r.error && !r.error.includes('Reset'))

    return new Response(
      JSON.stringify({
        success: true,
        totalDeleted,
        tablesProcessed: results.length,
        errors: errors.length,
        details: results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error clearing database:', error)
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
