import { Tour } from '@/contexts/TourContext';

export const mainTour: Tour = {
  id: 'main-tour',
  name: 'Tour Principal do Sistema',
  steps: [
    // Welcome
    {
      id: 'welcome',
      target: '[data-tour="welcome"]',
      title: '🎉 Bem-vindo ao Sistema!',
      content: 'Vamos fazer um tour completo por todas as funcionalidades do sistema. Você aprenderá a usar cada recurso de forma simples e objetiva.',
      placement: 'bottom',
    },
    // Sidebar Navigation
    {
      id: 'sidebar',
      target: '[data-tour="sidebar"]',
      title: '📱 Menu de Navegação',
      content: 'Este é o menu principal do sistema. Aqui você encontra acesso rápido a todas as páginas: Dashboard, Robôs, Trading, Finanças, Gerenciamento de Risco e Perfil.',
      placement: 'right',
    },
    // Dashboard
    {
      id: 'dashboard-stats',
      target: '[data-tour="dashboard-stats"]',
      title: '📊 Estatísticas do Dashboard',
      content: 'Aqui você visualiza suas principais métricas de performance: lucro total, taxa de acerto, fator de lucro e sequência atual de operações.',
      placement: 'bottom',
    },
    {
      id: 'equity-curve',
      target: '[data-tour="equity-curve"]',
      title: '📈 Curva de Equity',
      content: 'Este gráfico mostra a evolução do seu capital ao longo do tempo. É essencial para acompanhar seu crescimento e identificar períodos de drawdown.',
      placement: 'top',
    },
    {
      id: 'performance-chart',
      target: '[data-tour="performance-chart"]',
      title: '📉 Gráfico de Performance Mensal',
      content: 'Compare sua performance mês a mês. As barras verdes indicam meses positivos e vermelhas indicam meses negativos.',
      placement: 'top',
    },
    {
      id: 'heatmap',
      target: '[data-tour="heatmap"]',
      title: '🗓️ Heatmap de Performance',
      content: 'O heatmap mostra seus resultados por dia e horário. Identifique os melhores horários para operar com base nos seus dados históricos.',
      placement: 'top',
    },
    {
      id: 'advanced-metrics',
      target: '[data-tour="advanced-metrics"]',
      title: '📐 Métricas Avançadas',
      content: 'Métricas detalhadas como Sharpe Ratio, Sortino Ratio, Drawdown Máximo e outras. Passe o mouse sobre cada métrica para mais informações.',
      placement: 'bottom',
    },
    {
      id: 'period-filter',
      target: '[data-tour="period-filter"]',
      title: '📅 Filtro de Período',
      content: 'Filtre seus dados por período: Hoje, 7 dias, 30 dias, 90 dias ou defina um período personalizado. Todas as métricas serão recalculadas automaticamente.',
      placement: 'bottom',
    },
    // Trading Page
    {
      id: 'trading-intro',
      target: '[data-tour="trading-page"]',
      title: '💹 Página de Trading',
      content: 'Na página de Trading você pode importar suas operações, visualizar análises detalhadas e acompanhar seu desempenho em tempo real.',
      placement: 'bottom',
      page: '/trading',
    },
    {
      id: 'import-section',
      target: '[data-tour="import-section"]',
      title: '📥 Importação de Operações',
      content: 'Importe suas operações de forma automática via arquivo CSV ou Excel. O sistema processa e categoriza automaticamente cada operação.',
      placement: 'right',
    },
    // Operations/Robôs Page
    {
      id: 'operations-intro',
      target: '[data-tour="operations-page"]',
      title: '🤖 Página de Robôs/Operações',
      content: 'Aqui você gerencia todas as suas operações, cria estratégias e visualiza o dashboard detalhado de cada robô ou estratégia.',
      placement: 'bottom',
      page: '/operations',
    },
    {
      id: 'register-operation',
      target: '[data-tour="register-operation"]',
      title: '➕ Registrar Operação',
      content: 'Registre manualmente uma nova operação. Preencha os campos: ativo, contratos, resultado, horário e estratégia utilizada.',
      placement: 'right',
    },
    {
      id: 'strategies-tab',
      target: '[data-tour="strategies-tab"]',
      title: '🎯 Gerenciador de Estratégias',
      content: 'Crie e gerencie suas estratégias de trading. Cada estratégia pode ter regras e parâmetros específicos para análise.',
      placement: 'bottom',
    },
    // Finanças Page
    {
      id: 'financas-intro',
      target: '[data-tour="financas-page"]',
      title: '💰 Página de Finanças',
      content: 'Controle suas finanças pessoais: receitas, despesas, categorias e metas financeiras. Tenha uma visão completa do seu orçamento.',
      placement: 'bottom',
      page: '/financas',
    },
    // Risco Page
    {
      id: 'risco-intro',
      target: '[data-tour="risco-page"]',
      title: '⚠️ Gerenciamento de Risco',
      content: 'Configure seu gerenciamento de risco: capital disponível, porcentagem de risco por operação, stop loss e alvos. Essencial para longevidade no trading.',
      placement: 'bottom',
      page: '/risco',
    },
    // Profile Page
    {
      id: 'profile-intro',
      target: '[data-tour="profile-page"]',
      title: '👤 Seu Perfil',
      content: 'Gerencie suas informações pessoais, foto de perfil, segurança da conta (2FA) e preferências do sistema.',
      placement: 'bottom',
      page: '/profile',
    },
    // Final
    {
      id: 'tour-complete',
      target: '[data-tour="welcome"]',
      title: '🎊 Tour Concluído!',
      content: 'Parabéns! Você completou o tour do sistema. Agora você está pronto para aproveitar todas as funcionalidades. Se tiver dúvidas, você pode iniciar o tour novamente a qualquer momento.',
      placement: 'bottom',
    },
  ],
};

export const dashboardTour: Tour = {
  id: 'dashboard-tour',
  name: 'Tour do Dashboard',
  steps: [
    {
      id: 'dashboard-overview',
      target: '[data-tour="dashboard-stats"]',
      title: '📊 Visão Geral',
      content: 'O Dashboard apresenta todas as suas métricas de trading em um só lugar. Vamos explorar cada seção.',
      placement: 'bottom',
    },
    {
      id: 'stat-cards',
      target: '[data-tour="stat-cards"]',
      title: '💵 Cards de Estatísticas',
      content: 'Estes cards mostram suas métricas principais: Lucro Total, Taxa de Acerto, Fator de Lucro e Sequência Atual.',
      placement: 'bottom',
    },
    {
      id: 'equity-detail',
      target: '[data-tour="equity-curve"]',
      title: '📈 Curva de Equity Detalhada',
      content: 'A curva de equity mostra a evolução acumulada do seu capital. Observe os picos e vales para entender seus ciclos de trading.',
      placement: 'top',
    },
    {
      id: 'monthly-detail',
      target: '[data-tour="performance-chart"]',
      title: '📅 Performance Mensal',
      content: 'Analise sua performance mês a mês. Identifique padrões sazonais e meses de melhor desempenho.',
      placement: 'top',
    },
    {
      id: 'heatmap-detail',
      target: '[data-tour="heatmap"]',
      title: '🔥 Heatmap Interativo',
      content: 'O heatmap revela seus melhores e piores horários de operação. Clique em uma célula para ver detalhes.',
      placement: 'top',
    },
    {
      id: 'metrics-detail',
      target: '[data-tour="advanced-metrics"]',
      title: '📐 Métricas Avançadas',
      content: 'Métricas como Sharpe Ratio medem o retorno ajustado ao risco. Quanto maior, melhor sua eficiência.',
      placement: 'bottom',
    },
  ],
};

export const quickTour: Tour = {
  id: 'quick-tour',
  name: 'Tour Rápido',
  steps: [
    {
      id: 'quick-nav',
      target: '[data-tour="sidebar"]',
      title: '🚀 Navegação Rápida',
      content: 'Use o menu lateral para navegar entre as páginas. Cada ícone representa uma funcionalidade diferente do sistema.',
      placement: 'right',
    },
    {
      id: 'quick-stats',
      target: '[data-tour="dashboard-stats"]',
      title: '📊 Suas Estatísticas',
      content: 'Aqui você vê suas principais métricas. Mantenha o foco no lucro consistente e na gestão de risco.',
      placement: 'bottom',
    },
    {
      id: 'quick-filter',
      target: '[data-tour="period-filter"]',
      title: '📅 Filtros',
      content: 'Use os filtros para analisar diferentes períodos e tomar decisões baseadas em dados históricos.',
      placement: 'bottom',
    },
  ],
};

export const allTours = {
  main: mainTour,
  dashboard: dashboardTour,
  quick: quickTour,
};
