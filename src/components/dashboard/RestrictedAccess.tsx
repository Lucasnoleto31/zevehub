import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, MessageSquare, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface RestrictedAccessProps {
  accessStatus: string;
  userName?: string;
}

export const RestrictedAccess = ({ accessStatus, userName }: RestrictedAccessProps) => {
  const getStatusConfig = () => {
    switch (accessStatus) {
      case "pendente":
        return {
          icon: Clock,
          title: "Cadastro em Análise",
          description: "Seu cadastro está sendo analisado por um administrador da Zeve.",
          message: "Aguarde a aprovação para ter acesso completo a todas as funcionalidades do Zeve Hub.",
          badge: { label: "Pendente", variant: "secondary" as const },
          color: "text-yellow-500",
          bgColor: "bg-yellow-500/10",
        };
      case "reprovado":
        return {
          icon: XCircle,
          title: "Acesso Não Aprovado",
          description: "Seu acesso ao Zeve Hub não foi aprovado.",
          message: "Entre em contato com seu assessor para mais informações sobre o processo de aprovação.",
          badge: { label: "Reprovado", variant: "destructive" as const },
          color: "text-destructive",
          bgColor: "bg-destructive/10",
        };
      case "bloqueado":
        return {
          icon: AlertCircle,
          title: "Acesso Bloqueado",
          description: "Seu acesso ao Zeve Hub foi temporariamente bloqueado.",
          message: "Entre em contato com seu assessor para resolver esta situação.",
          badge: { label: "Bloqueado", variant: "destructive" as const },
          color: "text-destructive",
          bgColor: "bg-destructive/10",
        };
      default:
        return {
          icon: Clock,
          title: "Verificando Acesso",
          description: "Verificando seu status de acesso...",
          message: "",
          badge: { label: "Verificando", variant: "secondary" as const },
          color: "text-muted-foreground",
          bgColor: "bg-muted",
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  const handleContactAssessor = () => {
    window.open("https://wa.me/556299944855?text=Olá! Preciso de ajuda com meu acesso ao Zeve Hub.", "_blank");
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <Card className="max-w-lg w-full border-2">
        <CardHeader className="text-center pb-2">
          <div className={`w-20 h-20 rounded-full ${config.bgColor} flex items-center justify-center mx-auto mb-4`}>
            <Icon className={`w-10 h-10 ${config.color}`} />
          </div>
          <div className="flex justify-center mb-2">
            <Badge variant={config.badge.variant}>{config.badge.label}</Badge>
          </div>
          <CardTitle className="text-2xl">{config.title}</CardTitle>
          <CardDescription className="text-base mt-2">
            {config.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          {userName && (
            <p className="text-muted-foreground">
              Olá, <span className="font-medium text-foreground">{userName}</span>!
            </p>
          )}
          
          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">
              {config.message}
            </p>
          </div>

          <div className="space-y-3">
            <Button 
              className="w-full gap-2" 
              variant="default"
              onClick={handleContactAssessor}
            >
              <MessageSquare className="w-4 h-4" />
              Falar com meu assessor
            </Button>
            
            {accessStatus === "pendente" && (
              <p className="text-xs text-muted-foreground">
                Você receberá uma notificação quando seu acesso for aprovado.
              </p>
            )}
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium text-sm mb-3">O que você poderá acessar após aprovação:</h4>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-primary" />
                Dashboard completo
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-primary" />
                Operações de trading
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-primary" />
                Relatórios e métricas
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-primary" />
                Alertas e notificações
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-primary" />
                Ferramentas do trader
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-primary" />
                Comunidade Zeve
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
