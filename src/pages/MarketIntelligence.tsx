import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { Filter, RefreshCw, TrendingUp, TrendingDown, Calendar, DollarSign, Activity } from "lucide-react";
import { toast } from "sonner";

const MarketIntelligence = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<string[]>([]);

  const handleRefresh = () => {
    setLoading(true);
    toast.info("Atualizando dados do mercado...");
    setTimeout(() => {
      setLoading(false);
      toast.success("Dados atualizados com sucesso!");
    }, 2000);
  };

  const handleFilter = () => {
    toast.info("Modal de filtros em desenvolvimento");
  };

  const isAdmin = roles.includes("admin");

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-background to-muted/20">
        <AppSidebar isAdmin={isAdmin} />
        
        <main className="flex-1 p-4 md:p-6">
          <div className="mb-4">
            <SidebarTrigger />
          </div>
          
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent flex items-center gap-2">
                  📊 Sala de Inteligência de Mercado
                </h1>
                <p className="text-muted-foreground mt-2">
                  Interpretação clara, dados confiáveis e análises que importam.
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button onClick={handleRefresh} disabled={loading}>
                  <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Atualizar Dados
                </Button>
                <Button variant="outline" onClick={handleFilter}>
                  <Filter className="mr-2 h-4 w-4" />
                  Filtrar
                </Button>
              </div>
            </div>

            {/* Relatórios Diários e Semanais */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Relatórios Diários e Semanais</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      🌅 Abertura do Mercado – Hoje
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="space-y-1">
                      <p className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        Ibovespa: <Badge variant="default" className="bg-green-600">▲ 0.85%</Badge>
                      </p>
                      <p className="flex items-center gap-2">
                        <TrendingDown className="h-4 w-4 text-red-600" />
                        Dólar: <Badge variant="destructive">▼ 0.40%</Badge>
                      </p>
                      <p className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        S&P500: <Badge variant="default" className="bg-green-600">▲ 0.32%</Badge>
                      </p>
                      <p className="text-sm text-muted-foreground">• Juros Futuros: estáveis</p>
                      <p className="text-sm text-muted-foreground">• Principais destaques do dia</p>
                    </div>
                    <Button variant="outline" size="sm" className="w-full mt-4">
                      Ver relatório completo
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      🗓️ Resumo Semanal
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="space-y-1 text-sm">
                      <p>• Eventos relevantes da semana</p>
                      <p>• Fluxo estrangeiro</p>
                      <p>• Setores que se destacaram</p>
                      <p>• Expectativas para a próxima semana</p>
                    </div>
                    <Button variant="outline" size="sm" className="w-full mt-4">
                      Ver relatório completo
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Insights das Grandes Casas */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Insights das Grandes Casas</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-l-4 border-l-blue-500">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-blue-600">
                      🏛️ Macro
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <p>• Inflação tende a desacelerar</p>
                    <p>• Expectativa de corte na Selic</p>
                    <p>• Panorama global favorável</p>
                    <Button variant="link" size="sm" className="p-0 h-auto mt-2">
                      Ver detalhes →
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-green-500">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-600">
                      📉 Juros
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <p>• Reprecificação na curva longa</p>
                    <p>• Aumento da demanda por NTNB</p>
                    <p>• Volatilidade moderada</p>
                    <Button variant="link" size="sm" className="p-0 h-auto mt-2">
                      Ver detalhes →
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-500">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-purple-600">
                      💱 Câmbio
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <p>• Dólar pressionado</p>
                    <p>• Fluxo externo positivo</p>
                    <p>• Expectativa de estabilidade</p>
                    <Button variant="link" size="sm" className="p-0 h-auto mt-2">
                      Ver detalhes →
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-orange-500">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-orange-600">
                      ⛽ Commodities
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <p>• Petróleo em leve alta</p>
                    <p>• Minério de ferro estável</p>
                    <p>• Expectativa de demanda asiática</p>
                    <Button variant="link" size="sm" className="p-0 h-auto mt-2">
                      Ver detalhes →
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Calendário Econômico */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Calendar className="h-6 w-6" />
                Calendário Econômico Explicado
              </h2>
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Evento</TableHead>
                        <TableHead>Impacto</TableHead>
                        <TableHead className="hidden md:table-cell">Descrição</TableHead>
                        <TableHead>Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">Terça – 09:30</TableCell>
                        <TableCell>Payroll (EUA)</TableCell>
                        <TableCell>
                          <Badge variant="destructive">🔴 Alto</Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          Principal indicador de emprego americano.
                        </TableCell>
                        <TableCell>
                          <Button variant="link" size="sm" className="p-0 h-auto">
                            Detalhes
                          </Button>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Quarta – 18:00</TableCell>
                        <TableCell>Copom</TableCell>
                        <TableCell>
                          <Badge variant="destructive">🔴 Alto</Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          Decisão da taxa Selic.
                        </TableCell>
                        <TableCell>
                          <Button variant="link" size="sm" className="p-0 h-auto">
                            Detalhes
                          </Button>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Sexta – 10:00</TableCell>
                        <TableCell>IPCA</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-yellow-500">🟡 Médio</Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          Indicador oficial de inflação brasileira.
                        </TableCell>
                        <TableCell>
                          <Button variant="link" size="sm" className="p-0 h-auto">
                            Detalhes
                          </Button>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            {/* Tendências & Probabilidades */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Tendências & Probabilidades (Machine Learning)</h2>
              
              <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    🤖 Indicador Geral do Mercado
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Probabilidade de Alta:</span>
                    <Badge variant="default" className="bg-green-600 text-lg">62%</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Probabilidade de Queda:</span>
                    <Badge variant="destructive" className="text-lg">38%</Badge>
                  </div>
                  <div className="mt-4 p-3 bg-background rounded-lg">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Tendência: <span className="text-green-600">Levemente positiva</span>
                    </p>
                  </div>
                </CardContent>
              </Card>

              <div>
                <h3 className="text-lg font-semibold mb-3">Tendências por Ativo</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">WIN</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="text-sm">Tendência: <span className="font-semibold text-green-600">Alta</span></p>
                      <p className="text-sm">Probabilidade: <Badge className="bg-green-600">67%</Badge></p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">WDO</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="text-sm">Tendência: <span className="font-semibold text-muted-foreground">Neutro</span></p>
                      <p className="text-sm">Probabilidade: <Badge variant="secondary">51%</Badge></p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">PETR4</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="text-sm">Tendência: <span className="font-semibold text-green-600">Alta</span></p>
                      <p className="text-sm">Probabilidade: <Badge className="bg-green-600">72%</Badge></p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">VALE3</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="text-sm">Tendência: <span className="font-semibold text-red-600">Baixa</span></p>
                      <p className="text-sm">Probabilidade: <Badge variant="destructive">48%</Badge></p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default MarketIntelligence;
