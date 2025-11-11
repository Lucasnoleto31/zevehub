import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BankrollManager from "./BankrollManager";
import TradingGoals from "./TradingGoals";
import TimeAnalysis from "./TimeAnalysis";
import ReportExport from "./ReportExport";
import { Wallet, Target, Clock, FileText } from "lucide-react";

const AdvancedTools = ({ userId }: { userId: string }) => {
  return (
    <Tabs defaultValue="bankroll" className="w-full">
      <TabsList className="grid w-full grid-cols-4 mb-6">
        <TabsTrigger value="bankroll" className="flex items-center gap-2">
          <Wallet className="w-4 h-4" />
          <span className="hidden sm:inline">Gestão de Banca</span>
        </TabsTrigger>
        <TabsTrigger value="goals" className="flex items-center gap-2">
          <Target className="w-4 h-4" />
          <span className="hidden sm:inline">Metas</span>
        </TabsTrigger>
        <TabsTrigger value="time" className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          <span className="hidden sm:inline">Análise Temporal</span>
        </TabsTrigger>
        <TabsTrigger value="reports" className="flex items-center gap-2">
          <FileText className="w-4 h-4" />
          <span className="hidden sm:inline">Relatórios</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="bankroll" className="animate-fade-in">
        <BankrollManager userId={userId} />
      </TabsContent>

      <TabsContent value="goals" className="animate-fade-in">
        <TradingGoals userId={userId} />
      </TabsContent>

      <TabsContent value="time" className="animate-fade-in">
        <TimeAnalysis userId={userId} />
      </TabsContent>

      <TabsContent value="reports" className="animate-fade-in">
        <ReportExport userId={userId} />
      </TabsContent>
    </Tabs>
  );
};

export default AdvancedTools;
