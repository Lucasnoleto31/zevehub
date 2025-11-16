import * as Sentry from "@sentry/react";

/**
 * Inicializa o Sentry para monitoramento de erros em produção
 * 
 * Para configurar:
 * 1. Crie uma conta em https://sentry.io
 * 2. Crie um novo projeto React
 * 3. Adicione o DSN nas secrets do projeto com o nome VITE_SENTRY_DSN
 */
export const initSentry = () => {
  const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
  
  // Só inicializa em produção e se o DSN estiver configurado
  if (import.meta.env.PROD && sentryDsn) {
    Sentry.init({
      dsn: sentryDsn,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],
      // Performance Monitoring
      tracesSampleRate: 1.0, // Capture 100% das transações em produção
      // Session Replay
      replaysSessionSampleRate: 0.1, // 10% das sessões normais
      replaysOnErrorSampleRate: 1.0, // 100% das sessões com erro
      
      environment: import.meta.env.MODE,
      
      beforeSend(event, hint) {
        // Filtra erros conhecidos ou de extensões do navegador
        const error = hint.originalException;
        if (error && typeof error === 'object' && 'message' in error) {
          const message = String(error.message);
          // Ignora erros de extensões do Chrome
          if (message.includes('chrome-extension://')) {
            return null;
          }
        }
        return event;
      },
    });

    console.log("✅ Sentry inicializado para monitoramento de erros");
  } else if (!sentryDsn && import.meta.env.PROD) {
    console.warn("⚠️ Sentry DSN não configurado. Adicione VITE_SENTRY_DSN nas secrets do projeto.");
  }
};

/**
 * Captura erro manualmente
 */
export const captureError = (error: Error, context?: Record<string, any>) => {
  if (import.meta.env.PROD) {
    Sentry.captureException(error, { extra: context });
  } else {
    console.error("Error captured:", error, context);
  }
};

/**
 * Adiciona contexto do usuário
 */
export const setUserContext = (userId: string, email?: string, username?: string) => {
  if (import.meta.env.PROD) {
    Sentry.setUser({
      id: userId,
      email,
      username,
    });
  }
};

/**
 * Remove contexto do usuário (útil no logout)
 */
export const clearUserContext = () => {
  if (import.meta.env.PROD) {
    Sentry.setUser(null);
  }
};

/**
 * Adiciona breadcrumb personalizado
 */
export const addBreadcrumb = (message: string, category: string, level: Sentry.SeverityLevel = "info") => {
  if (import.meta.env.PROD) {
    Sentry.addBreadcrumb({
      message,
      category,
      level,
      timestamp: Date.now() / 1000,
    });
  }
};
