/**
 * Registra o Service Worker para funcionalidade offline
 */
export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/',
      });

      console.log('✅ Service Worker registrado com sucesso:', registration.scope);

      // Detecta atualizações do service worker
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Novo service worker disponível
              console.log('🔄 Nova versão disponível! Recarregue a página para atualizar.');
              
              // Você pode mostrar uma notificação ao usuário aqui
              if (confirm('Nova versão disponível! Deseja atualizar agora?')) {
                newWorker.postMessage({ type: 'SKIP_WAITING' });
                window.location.reload();
              }
            }
          });
        }
      });

      // Detecta quando um novo service worker assume o controle
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });

      return registration;
    } catch (error) {
      console.error('❌ Erro ao registrar Service Worker:', error);
      throw error;
    }
  } else if (!import.meta.env.PROD) {
    console.log('ℹ️ Service Worker não registrado em desenvolvimento');
  } else {
    console.warn('⚠️ Service Workers não são suportados neste navegador');
  }
};

/**
 * Verifica o status da conexão
 */
export const checkOnlineStatus = () => {
  return navigator.onLine;
};

/**
 * Adiciona listeners para mudanças no status de conexão
 */
export const addConnectionListeners = (
  onOnline: () => void,
  onOffline: () => void
) => {
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);

  // Retorna função para remover listeners
  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
};

/**
 * Faz cache de URLs importantes para uso offline
 */
export const cacheImportantUrls = async (urls: string[]) => {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'CACHE_URLS',
      payload: urls,
    });
  }
};
