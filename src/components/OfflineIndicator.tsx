import { useEffect, useState } from "react";
import { WifiOff, Wifi } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { addConnectionListeners } from "@/lib/register-sw";

const OfflineIndicator = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOnlineNotification, setShowOnlineNotification] = useState(false);

  useEffect(() => {
    const cleanup = addConnectionListeners(
      () => {
        setIsOnline(true);
        setShowOnlineNotification(true);
        
        // Esconde a notificação de online após 3 segundos
        setTimeout(() => {
          setShowOnlineNotification(false);
        }, 3000);
      },
      () => {
        setIsOnline(false);
        setShowOnlineNotification(false);
      }
    );

    return cleanup;
  }, []);

  if (isOnline && !showOnlineNotification) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
      <Alert
        variant={isOnline ? "default" : "destructive"}
        className="shadow-lg min-w-[300px]"
      >
        {isOnline ? (
          <Wifi className="h-4 w-4" />
        ) : (
          <WifiOff className="h-4 w-4" />
        )}
        <AlertDescription className="ml-2">
          {isOnline
            ? "Conexão restaurada! Você está online novamente."
            : "Você está offline. Algumas funcionalidades podem estar limitadas."}
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default OfflineIndicator;
