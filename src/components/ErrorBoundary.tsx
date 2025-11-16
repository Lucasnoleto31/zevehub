import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Error Boundary caught an error:", error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-destructive/5 via-background to-destructive/10 p-4">
          <div className="absolute inset-0 bg-grid-pattern opacity-5" />
          
          <div className="w-full max-w-2xl relative z-10 animate-fade-in">
            <Card className="shadow-xl border-2 border-destructive/20">
              <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                  <AlertTriangle className="w-8 h-8 text-destructive" />
                </div>
                <CardTitle className="text-2xl">Ops! Algo deu errado</CardTitle>
                <CardDescription>
                  Encontramos um erro inesperado. Não se preocupe, seus dados estão seguros.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                  <p className="text-sm font-medium text-foreground">O que você pode fazer:</p>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Recarregar a página para tentar novamente</li>
                    <li>Voltar para a página inicial</li>
                    <li>Se o problema persistir, entre em contato com o suporte</li>
                  </ul>
                </div>

                {process.env.NODE_ENV === "development" && this.state.error && (
                  <details className="bg-destructive/5 p-4 rounded-lg">
                    <summary className="text-sm font-medium text-destructive cursor-pointer mb-2">
                      Detalhes técnicos (apenas em desenvolvimento)
                    </summary>
                    <div className="space-y-2 text-xs font-mono">
                      <div>
                        <p className="font-semibold text-destructive mb-1">Erro:</p>
                        <p className="text-muted-foreground break-all">
                          {this.state.error.toString()}
                        </p>
                      </div>
                      {this.state.errorInfo && (
                        <div>
                          <p className="font-semibold text-destructive mb-1">Stack Trace:</p>
                          <pre className="text-muted-foreground whitespace-pre-wrap break-all">
                            {this.state.errorInfo.componentStack}
                          </pre>
                        </div>
                      )}
                    </div>
                  </details>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button 
                    onClick={this.handleReload} 
                    className="flex-1"
                    size="lg"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Recarregar Página
                  </Button>
                  <Button 
                    onClick={this.handleGoHome} 
                    variant="outline"
                    className="flex-1"
                    size="lg"
                  >
                    <Home className="mr-2 h-4 w-4" />
                    Ir para Início
                  </Button>
                </div>

                <p className="text-center text-sm text-muted-foreground">
                  Se o problema continuar, entre em contato com nosso suporte técnico
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
