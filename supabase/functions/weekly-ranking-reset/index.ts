import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Starting weekly ranking reset and rewards distribution...')

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Calcular datas da semana
    const now = new Date()
    const lastMonday = new Date(now)
    lastMonday.setDate(now.getDate() - ((now.getDay() + 6) % 7) - 7)
    lastMonday.setHours(0, 0, 0, 0)

    const lastSunday = new Date(lastMonday)
    lastSunday.setDate(lastMonday.getDate() + 6)
    lastSunday.setHours(23, 59, 59, 999)

    console.log(`Processing week from ${lastMonday.toISOString()} to ${lastSunday.toISOString()}`)

    // Buscar ranking da semana passada baseado em pontos ganhos
    const { data: weeklyRanking, error: rankingError } = await supabaseClient
      .from('profiles')
      .select('id, full_name, points')
      .order('points', { ascending: false })
      .limit(100)

    if (rankingError) {
      console.error('Error fetching weekly ranking:', rankingError)
      throw rankingError
    }

    console.log(`Found ${weeklyRanking.length} users in ranking`)

    // Distribuir recompensas para o top 3
    const rewards = [
      { position: 1, points: 500, message: '🏆 1º lugar no ranking semanal! +500 pontos bônus' },
      { position: 2, points: 300, message: '🥈 2º lugar no ranking semanal! +300 pontos bônus' },
      { position: 3, points: 150, message: '🥉 3º lugar no ranking semanal! +150 pontos bônus' }
    ]

    for (const reward of rewards) {
      if (weeklyRanking[reward.position - 1]) {
        const winner = weeklyRanking[reward.position - 1]
        
        // Adicionar pontos de recompensa
        const { error: updateError } = await supabaseClient
          .from('profiles')
          .update({ 
            points: winner.points + reward.points 
          })
          .eq('id', winner.id)

        if (updateError) {
          console.error(`Error updating points for position ${reward.position}:`, updateError)
        } else {
          console.log(`Awarded ${reward.points} points to ${winner.full_name} (position ${reward.position})`)
        }

        // Criar notificação
        const { error: notifError } = await supabaseClient
          .from('messages')
          .insert({
            user_id: winner.id,
            title: `Ranking Semanal - ${reward.position}º Lugar`,
            content: reward.message,
            priority: 'high',
            is_global: false
          })

        if (notifError) {
          console.error(`Error creating notification for position ${reward.position}:`, notifError)
        }
      }
    }

    // Salvar snapshot do ranking na tabela weekly_points
    const thisMonday = new Date(now)
    thisMonday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
    thisMonday.setHours(0, 0, 0, 0)

    const thisSunday = new Date(thisMonday)
    thisSunday.setDate(thisMonday.getDate() + 6)

    for (const user of weeklyRanking) {
      const { error: insertError } = await supabaseClient
        .from('weekly_points')
        .insert({
          user_id: user.id,
          points: user.points,
          week_start: thisMonday.toISOString().split('T')[0],
          week_end: thisSunday.toISOString().split('T')[0]
        })

      if (insertError && insertError.code !== '23505') { // Ignore duplicate errors
        console.error('Error saving weekly points:', insertError)
      }
    }

    // Verificar badge "Lenda da Comunidade" (Top 3 por 4 semanas)
    const fourWeeksAgo = new Date(now)
    fourWeeksAgo.setDate(now.getDate() - 28)

    for (let i = 0; i < 3; i++) {
      const userId = weeklyRanking[i]?.id
      if (!userId) continue

      // Contar quantas semanas o usuário esteve no top 3
      const { count } = await supabaseClient
        .from('weekly_points')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('week_start', fourWeeksAgo.toISOString().split('T')[0])
        .order('points', { ascending: false })
        .limit(3)

      if (count && count >= 4) {
        // Verificar se já tem a badge
        const { data: existingBadge } = await supabaseClient
          .from('user_badges')
          .select('*')
          .eq('user_id', userId)
          .eq('badge_id', 'lendaria')
          .single()

        if (!existingBadge) {
          await supabaseClient
            .from('user_badges')
            .insert({
              user_id: userId,
              badge_id: 'lendaria'
            })

          console.log(`Awarded "Lenda da Comunidade" badge to user ${userId}`)
        }
      }
    }

    console.log('Weekly ranking reset completed successfully')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Weekly ranking reset completed',
        top3: weeklyRanking.slice(0, 3).map((u, i) => ({
          position: i + 1,
          name: u.full_name,
          points: u.points
        }))
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error in weekly ranking reset:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
