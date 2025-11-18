import { useState, useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Search, TrendingUp, Activity, Clock, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface Robot {
  id: string;
  name: string;
  summary: string;
  riskLevel: "Baixo" | "Médio" | "Alto";
  totalOperations: number;
  winRate: number;
  totalResult: number;
  return30d: number;
  return3m: number;
  return12m: number;
  chartData: { date: string; value: number }[];
  operations: {
    date: string;
    time: string;
    asset: string;
    contracts: number;
    result: number;
  }[];
}

const Robos = () => {
  const [roles, setRoles] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRobot, setSelectedRobot] = useState<Robot | null>(null);
  const [simulatorValue, setSimulatorValue] = useState<number>(10000);
  const [simulatedReturn, setSimulatedReturn] = useState<number | null>(null);
  const [robots, setRobots] = useState<Robot[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const isAdmin = roles.includes("admin");

  useEffect(() => {
    fetchUserRoles();
    fetchRobotsData();
  }, []);

  const fetchUserRoles = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (data) {
      setRoles(data.map((r) => r.role));
    }
  };

  const fetchRobotsData = async () => {
    try {
      setLoading(true);

      // Fetch ALL operations with strategies (no limit, no user filter to show all robots)
      const { data: operations, error } = await supabase
        .from("trading_operations")
        .select("*")
        .not("strategy", "is", null)
        .order("operation_date", { ascending: true });

      if (error) throw error;

      // Group operations by strategy (robot)
      const robotsMap = new Map<string, any>();

      operations?.forEach((op) => {
        const strategy = op.strategy!;
        if (!robotsMap.has(strategy)) {
          robotsMap.set(strategy, {
            name: strategy,
            operations: [],
            results: [],
            dates: [],
          });
        }
        const robot = robotsMap.get(strategy);
        robot.operations.push(op);
        robot.results.push(op.result);
        robot.dates.push(op.operation_date);
      });

      // Calculate metrics for each robot
      const robotsList: Robot[] = Array.from(robotsMap.entries()).map(([name, data]) => {
        const totalOperations = data.operations.length;
        const winningOps = data.results.filter((r: number) => r > 0).length;
        const winRate = (winningOps / totalOperations) * 100;
        const totalResult = data.results.reduce((sum: number, r: number) => sum + r, 0);

        // Calculate returns by period - considering initial capital as average operation value
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        const twelveMonthsAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

        const ops30d = data.operations.filter((op: any) => new Date(op.operation_date) >= thirtyDaysAgo);
        const ops3m = data.operations.filter((op: any) => new Date(op.operation_date) >= threeMonthsAgo);
        const ops12m = data.operations.filter((op: any) => new Date(op.operation_date) >= twelveMonthsAgo);

        const return30d = ops30d.reduce((sum: number, op: any) => sum + op.result, 0);
        const return3m = ops3m.reduce((sum: number, op: any) => sum + op.result, 0);
        const return12m = ops12m.reduce((sum: number, op: any) => sum + op.result, 0);

        // Calculate percentage returns based on average capital per operation
        const avgOperationValue = 10000; // Assuming R$10k average capital per operation
        const return30dPct = ops30d.length > 0 ? (return30d / (avgOperationValue * ops30d.length)) * 100 : 0;
        const return3mPct = ops3m.length > 0 ? (return3m / (avgOperationValue * ops3m.length)) * 100 : 0;
        const return12mPct = ops12m.length > 0 ? (return12m / (avgOperationValue * ops12m.length)) * 100 : 0;

        // Generate chart data (cumulative starting from 100)
        let cumulative = 100;
        const initialCapital = 100;
        const chartData = data.operations.map((op: any) => {
          const returnPct = (op.result / avgOperationValue) * 100;
          cumulative += returnPct;
          return {
            date: format(new Date(op.operation_date), "dd/MM"),
            value: cumulative,
          };
        });

        // Add initial point
        if (chartData.length > 0) {
          chartData.unshift({
            date: format(new Date(data.operations[0].operation_date), "dd/MM"),
            value: initialCapital,
          });
        }

        // Determine risk level based on win rate and volatility
        let riskLevel: "Baixo" | "Médio" | "Alto" = "Médio";
        if (winRate > 70) riskLevel = "Baixo";
        else if (winRate < 50) riskLevel = "Alto";

        return {
          id: name,
          name,
          summary: `${totalOperations} operações realizadas com ${winRate.toFixed(1)}% de assertividade`,
          riskLevel,
          totalOperations,
          winRate,
          totalResult,
          return30d: return30dPct,
          return3m: return3mPct,
          return12m: return12mPct,
          chartData,
          operations: data.operations.map((op: any) => ({
            date: format(new Date(op.operation_date), "dd/MM/yyyy"),
            time: op.operation_time,
            asset: op.asset,
            contracts: op.contracts,
            result: op.result,
          })),
        };
      });

      setRobots(robotsList);
    } catch (error) {
      console.error("Error fetching robots data:", error);
      toast({
        title: "Erro ao carregar robôs",
        description: "Não foi possível carregar os dados dos robôs.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredRobots = robots.filter(
    (robot) =>
      robot.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      robot.summary.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSimulate = () => {
    if (!selectedRobot) return;
    // Calculate return based on 30-day percentage
    const returnValue = (simulatorValue * selectedRobot.return30d) / 100;
    setSimulatedReturn(returnValue);
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case "Baixo":
        return "bg-green-600";
      case "Médio":
        return "bg-yellow-600";
      case "Alto":
        return "bg-red-600";
      default:
        return "bg-gray-600";
    }
  };

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
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent flex items-center gap-2">
                🤖 Robôs Premium
              </h1>
              <p className="text-muted-foreground mt-2">
                Transparência total e experiência completa
              </p>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar robô..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Robot List */}
            {!selectedRobot && (
              <>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : filteredRobots.length === 0 ? (
                  <Card className="p-8 text-center">
                    <p className="text-muted-foreground">
                      Nenhum robô encontrado. Registre operações com estratégias para ver seus robôs aqui.
                    </p>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredRobots.map((robot) => (
                  <Card
                    key={robot.id}
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => setSelectedRobot(robot)}
                  >
                    <CardHeader>
                      <CardTitle className="flex items-start justify-between gap-2">
                        <span>{robot.name}</span>
                        <Badge className={getRiskColor(robot.riskLevel)}>
                          {robot.riskLevel}
                        </Badge>
                      </CardTitle>
                      <CardDescription>{robot.summary}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <TrendingUp className="h-4 w-4" />
                        <span>Retorno 30d: {robot.return30d.toFixed(1)}%</span>
                      </div>
                    </CardContent>
                  </Card>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Robot Details */}
            {selectedRobot && (
              <div className="space-y-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedRobot(null);
                    setSimulatedReturn(null);
                  }}
                >
                  ← Voltar para lista
                </Button>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{selectedRobot.name}</span>
                      <Badge className={getRiskColor(selectedRobot.riskLevel)}>
                        {selectedRobot.riskLevel}
                      </Badge>
                    </CardTitle>
                    <CardDescription>{selectedRobot.summary}</CardDescription>
                  </CardHeader>
                </Card>

                {/* Estatísticas */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Estatísticas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-muted-foreground">Total de Operações</Label>
                      <p className="mt-1 text-2xl font-bold">{selectedRobot.totalOperations}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Taxa de Acerto</Label>
                      <p className="mt-1 text-2xl font-bold text-green-600">
                        {selectedRobot.winRate.toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Resultado Total</Label>
                      <p className={`mt-1 text-2xl font-bold ${selectedRobot.totalResult >= 0 ? "text-green-600" : "text-red-600"}`}>
                        R$ {selectedRobot.totalResult.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Nível de Risco</Label>
                      <Badge className={`mt-1 ${getRiskColor(selectedRobot.riskLevel)}`}>
                        {selectedRobot.riskLevel}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Resultados */}
                <Card>
                  <CardHeader>
                    <CardTitle>Resultados</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={selectedRobot.chartData}>
                          <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <XAxis 
                            dataKey="date" 
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                          />
                          <YAxis 
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                          />
                          <Tooltip 
                            contentStyle={{
                              backgroundColor: "hsl(var(--background))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px"
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke="hsl(142, 76%, 36%)"
                            strokeWidth={2}
                            fill="url(#colorValue)"
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">30 dias</p>
                        <p className={`text-2xl font-bold ${selectedRobot.return30d >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {selectedRobot.return30d >= 0 ? "+" : ""}{selectedRobot.return30d.toFixed(2)}%
                        </p>
                      </div>
                      <div className="text-center p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">3 meses</p>
                        <p className={`text-2xl font-bold ${selectedRobot.return3m >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {selectedRobot.return3m >= 0 ? "+" : ""}{selectedRobot.return3m.toFixed(2)}%
                        </p>
                      </div>
                      <div className="text-center p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">12 meses</p>
                        <p className={`text-2xl font-bold ${selectedRobot.return12m >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {selectedRobot.return12m >= 0 ? "+" : ""}{selectedRobot.return12m.toFixed(2)}%
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Simulador */}
                <Card>
                  <CardHeader>
                    <CardTitle>Simulador de Investimento</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="simulator_value">
                        Quanto você teria investido?
                      </Label>
                      <Input
                        id="simulator_value"
                        type="number"
                        value={simulatorValue}
                        onChange={(e) => setSimulatorValue(Number(e.target.value))}
                        className="mt-2"
                      />
                    </div>
                    <Button onClick={handleSimulate} className="w-full">
                      Simular Retorno (30 dias)
                    </Button>
                    {simulatedReturn !== null && (
                      <div className={`p-4 border rounded-lg ${
                        simulatedReturn >= 0 
                          ? "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800"
                          : "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800"
                      }`}>
                        <p className="text-sm text-muted-foreground">
                          Retorno estimado (baseado em {selectedRobot.return30d.toFixed(2)}% em 30 dias):
                        </p>
                        <p className={`text-2xl font-bold ${simulatedReturn >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {simulatedReturn >= 0 ? "+" : ""}R$ {simulatedReturn.toFixed(2)}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Total: R$ {(simulatorValue + simulatedReturn).toFixed(2)}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>


                {/* Histórico */}
                <Card>
                  <CardHeader>
                    <CardTitle>Histórico Completo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Horário</TableHead>
                          <TableHead>Ativo</TableHead>
                          <TableHead>Contratos</TableHead>
                          <TableHead className="text-right">Resultado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedRobot.operations.map((op, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{op.date}</TableCell>
                            <TableCell>{op.time}</TableCell>
                            <TableCell>{op.asset}</TableCell>
                            <TableCell>{op.contracts}</TableCell>
                            <TableCell
                              className={`text-right font-medium ${
                                op.result > 0 ? "text-green-600" : "text-red-600"
                              }`}
                            >
                              {op.result > 0 ? "+" : ""}R$ {op.result.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Robos;
