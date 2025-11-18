import { useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Search, TrendingUp, Activity, Clock, AlertCircle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface Robot {
  id: string;
  name: string;
  summary: string;
  riskLevel: "Baixo" | "Médio" | "Alto";
  setup: string;
  logic: string;
  schedule: string;
  risk: string;
  return30d: number;
  return3m: number;
  return12m: number;
  chartData: { date: string; value: number }[];
  operations: {
    date: string;
    entry: string;
    exit: string;
    result: number;
  }[];
}

const mockRobots: Robot[] = [
  {
    id: "1",
    name: "Scalper Intraday",
    summary: "Operações rápidas no mini-índice com alvo de 200 pontos",
    riskLevel: "Médio",
    setup: "Mini-índice (WIN), stop 150 pontos, alvo 200 pontos",
    logic: "Identifica rompimentos de suportes/resistências em timeframe de 5min",
    schedule: "9h30 - 16h30",
    risk: "Médio - Exposição limitada por operação",
    return30d: 8.5,
    return3m: 24.3,
    return12m: 98.7,
    chartData: [
      { date: "Jan", value: 100 },
      { date: "Fev", value: 108 },
      { date: "Mar", value: 115 },
      { date: "Abr", value: 122 },
      { date: "Mai", value: 135 },
      { date: "Jun", value: 142 },
    ],
    operations: [
      { date: "17/11/2024 14:30", entry: "125.500", exit: "125.700", result: 200 },
      { date: "17/11/2024 11:15", entry: "125.200", exit: "125.400", result: 200 },
      { date: "16/11/2024 15:45", entry: "124.800", exit: "124.650", result: -150 },
      { date: "16/11/2024 10:20", entry: "124.500", exit: "124.700", result: 200 },
    ],
  },
  {
    id: "2",
    name: "Swing Trader",
    summary: "Posições de 2-5 dias em ações blue-chip",
    riskLevel: "Baixo",
    setup: "Ações Ibovespa, stop 3%, alvo 8-12%",
    logic: "Segue tendências de médio prazo usando médias móveis e RSI",
    schedule: "Análise diária após fechamento",
    risk: "Baixo - Diversificação em 5-8 ativos",
    return30d: 5.2,
    return3m: 18.9,
    return12m: 67.4,
    chartData: [
      { date: "Jan", value: 100 },
      { date: "Fev", value: 105 },
      { date: "Mar", value: 112 },
      { date: "Abr", value: 118 },
      { date: "Mai", value: 125 },
      { date: "Jun", value: 133 },
    ],
    operations: [
      { date: "15/11/2024", entry: "PETR4 R$ 38.50", exit: "PETR4 R$ 42.10", result: 935 },
      { date: "10/11/2024", entry: "VALE3 R$ 62.30", exit: "VALE3 R$ 68.90", result: 1060 },
      { date: "05/11/2024", entry: "ITUB4 R$ 28.10", exit: "ITUB4 R$ 27.25", result: -425 },
    ],
  },
  {
    id: "3",
    name: "Volatility Hunter",
    summary: "Aproveita gaps e alta volatilidade no pré-mercado",
    riskLevel: "Alto",
    setup: "Mini-índice, stop 300 pontos, alvo 500+ pontos",
    logic: "Opera gaps de abertura e notícias de forte impacto",
    schedule: "8h30 - 10h30 (pré-mercado e abertura)",
    risk: "Alto - Operações agressivas com maior exposição",
    return30d: 12.8,
    return3m: 38.5,
    return12m: 142.3,
    chartData: [
      { date: "Jan", value: 100 },
      { date: "Fev", value: 115 },
      { date: "Mar", value: 125 },
      { date: "Abr", value: 138 },
      { date: "Mai", value: 155 },
      { date: "Jun", value: 172 },
    ],
    operations: [
      { date: "17/11/2024 09:00", entry: "126.000", exit: "126.500", result: 500 },
      { date: "16/11/2024 08:45", entry: "125.500", exit: "125.200", result: -300 },
      { date: "15/11/2024 09:15", entry: "125.000", exit: "125.700", result: 700 },
    ],
  },
];

const Robos = () => {
  const [roles] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRobot, setSelectedRobot] = useState<Robot | null>(null);
  const [simulatorValue, setSimulatorValue] = useState<number>(10000);
  const [simulatedReturn, setSimulatedReturn] = useState<number | null>(null);

  const isAdmin = roles.includes("admin");

  const filteredRobots = mockRobots.filter(
    (robot) =>
      robot.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      robot.summary.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSimulate = () => {
    if (!selectedRobot) return;
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

                {/* Ficha Técnica */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Ficha Técnica
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-muted-foreground">Setup</Label>
                      <p className="mt-1">{selectedRobot.setup}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Lógica de Operação</Label>
                      <p className="mt-1">{selectedRobot.logic}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Horários</Label>
                      <p className="mt-1 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {selectedRobot.schedule}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Perfil de Risco</Label>
                      <p className="mt-1 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        {selectedRobot.risk}
                      </p>
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
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">30 dias</p>
                        <p className="text-2xl font-bold text-green-600">
                          +{selectedRobot.return30d.toFixed(1)}%
                        </p>
                      </div>
                      <div className="text-center p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">3 meses</p>
                        <p className="text-2xl font-bold text-green-600">
                          +{selectedRobot.return3m.toFixed(1)}%
                        </p>
                      </div>
                      <div className="text-center p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">12 meses</p>
                        <p className="text-2xl font-bold text-green-600">
                          +{selectedRobot.return12m.toFixed(1)}%
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
                      <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                        <p className="text-sm text-muted-foreground">
                          Retorno estimado:
                        </p>
                        <p className="text-2xl font-bold text-green-600">
                          R$ {simulatedReturn.toFixed(2)}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Total: R$ {(simulatorValue + simulatedReturn).toFixed(2)}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Integração */}
                <Card>
                  <CardHeader>
                    <CardTitle>Integração com Corretoras</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full" variant="outline">
                      Conectar Corretora
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      Em breve: integração automática com suas ordens
                    </p>
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
                          <TableHead>Entrada</TableHead>
                          <TableHead>Saída</TableHead>
                          <TableHead className="text-right">Resultado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedRobot.operations.map((op, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{op.date}</TableCell>
                            <TableCell>{op.entry}</TableCell>
                            <TableCell>{op.exit}</TableCell>
                            <TableCell
                              className={`text-right font-medium ${
                                op.result > 0 ? "text-green-600" : "text-red-600"
                              }`}
                            >
                              {op.result > 0 ? "+" : ""}
                              {op.result}
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
