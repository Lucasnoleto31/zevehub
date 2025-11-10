import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Plus, TrendingUp, Calendar as CalendarIcon, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import OperationForm from "@/components/operations/OperationForm";
import OperationsTable from "@/components/operations/OperationsTable";
import OperationsDashboard from "@/components/operations/OperationsDashboard";
import OperationImport from "@/components/operations/OperationImport";
import DeleteAllOperations from "@/components/operations/DeleteAllOperations";
import DeleteOperationsByStrategy from "@/components/operations/DeleteOperationsByStrategy";
import StrategyManager from "@/components/operations/StrategyManager";

const Operations = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      setUser(session.user);

      // Verificar se usuário é admin
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);

      const hasAdminRole = rolesData?.some(r => r.role === "admin");
      setIsAdmin(hasAdminRole || false);
    } catch (error) {
      console.error("Erro ao verificar usuário:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/dashboard")}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </Button>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                <h1 className="text-xl font-bold text-foreground">Registro de Operações</h1>
              </div>
            </div>
            {isAdmin && (
              <div className="flex gap-2">
                <DeleteOperationsByStrategy userId={user?.id} />
                <DeleteAllOperations userId={user?.id} />
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="register" className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-3">
            <TabsTrigger value="register">Registrar</TabsTrigger>
            <TabsTrigger value="strategies">Estratégias</TabsTrigger>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          </TabsList>

          <TabsContent value="register" className="space-y-6">
            {isAdmin ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Plus className="w-5 h-5" />
                        Nova Operação
                      </CardTitle>
                      <CardDescription>
                        Registre os detalhes da sua operação
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <OperationForm userId={user?.id} />
                    </CardContent>
                  </Card>

                  <OperationImport userId={user?.id} />
                </div>

                <div className="lg:col-span-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Histórico de Operações</CardTitle>
                      <CardDescription>
                        Últimas operações registradas
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "justify-start text-left font-normal",
                                !dateFrom && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {dateFrom ? format(dateFrom, "dd/MM/yyyy", { locale: ptBR }) : "Data inicial"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={dateFrom}
                              onSelect={setDateFrom}
                              initialFocus
                              className="pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>

                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "justify-start text-left font-normal",
                                !dateTo && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {dateTo ? format(dateTo, "dd/MM/yyyy", { locale: ptBR }) : "Data final"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={dateTo}
                              onSelect={setDateTo}
                              initialFocus
                              className="pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>

                        {(dateFrom || dateTo) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setDateFrom(undefined);
                              setDateTo(undefined);
                            }}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Limpar filtros
                          </Button>
                        )}
                      </div>
                      <OperationsTable 
                        userId={user?.id} 
                        isAdmin={isAdmin}
                        dateFrom={dateFrom}
                        dateTo={dateTo}
                      />
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Histórico de Operações</CardTitle>
                  <CardDescription>
                    Todas as operações registradas (visualização apenas)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "justify-start text-left font-normal",
                            !dateFrom && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateFrom ? format(dateFrom, "dd/MM/yyyy", { locale: ptBR }) : "Data inicial"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateFrom}
                          onSelect={setDateFrom}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>

                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "justify-start text-left font-normal",
                            !dateTo && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateTo ? format(dateTo, "dd/MM/yyyy", { locale: ptBR }) : "Data final"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateTo}
                          onSelect={setDateTo}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>

                    {(dateFrom || dateTo) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDateFrom(undefined);
                          setDateTo(undefined);
                        }}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Limpar filtros
                      </Button>
                    )}
                  </div>
                  <OperationsTable 
                    userId={user?.id} 
                    isAdmin={isAdmin}
                    dateFrom={dateFrom}
                    dateTo={dateTo}
                  />
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="strategies">
            <StrategyManager userId={user?.id} />
          </TabsContent>

          <TabsContent value="dashboard">
            <OperationsDashboard userId={user?.id} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Operations;
