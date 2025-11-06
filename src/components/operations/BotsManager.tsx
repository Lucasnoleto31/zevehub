import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Bot, Plus, Trash2, Loader2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface BotsManagerProps {
  userId: string;
}

interface ClientBot {
  id: string;
  bot_name: string;
  status: string;
  volume_operated: number | null;
  performance_percentage: number | null;
  created_at: string;
}

const BotsManager = ({ userId }: BotsManagerProps) => {
  const [bots, setBots] = useState<ClientBot[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  const [botName, setBotName] = useState("");
  const [status, setStatus] = useState("active");
  const [volumeOperated, setVolumeOperated] = useState("");
  const [performancePercentage, setPerformancePercentage] = useState("");

  useEffect(() => {
    loadBots();
    
    // Real-time subscription
    const channel = supabase
      .channel('client_bots_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'client_bots',
          filter: `user_id=eq.${userId}`
        },
        () => {
          loadBots();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const loadBots = async () => {
    try {
      const { data, error } = await supabase
        .from('client_bots')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBots(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar robôs:', error);
      toast.error('Erro ao carregar robôs');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!botName.trim()) {
      toast.error('Nome do robô é obrigatório');
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('client_bots')
        .insert({
          user_id: userId,
          bot_name: botName.trim(),
          status,
          volume_operated: volumeOperated ? parseFloat(volumeOperated) : null,
          performance_percentage: performancePercentage ? parseFloat(performancePercentage) : null
        });

      if (error) throw error;

      toast.success('Robô cadastrado com sucesso!');
      
      // Reset form
      setBotName("");
      setStatus("active");
      setVolumeOperated("");
      setPerformancePercentage("");
    } catch (error: any) {
      console.error('Erro ao cadastrar robô:', error);
      toast.error('Erro ao cadastrar robô');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (botId: string) => {
    try {
      const { error } = await supabase
        .from('client_bots')
        .delete()
        .eq('id', botId);

      if (error) throw error;
      toast.success('Robô excluído com sucesso!');
    } catch (error: any) {
      console.error('Erro ao excluir robô:', error);
      toast.error('Erro ao excluir robô');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'inactive':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'paused':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Ativo';
      case 'inactive':
        return 'Inativo';
      case 'paused':
        return 'Pausado';
      default:
        return status;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Formulário de Cadastro */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Novo Robô
          </CardTitle>
          <CardDescription>
            Cadastre um novo robô de trading
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bot-name">Nome do Robô *</Label>
              <Input
                id="bot-name"
                value={botName}
                onChange={(e) => setBotName(e.target.value)}
                placeholder="Ex: Bot WIN v1.0"
                required
                disabled={submitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus} disabled={submitting}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                  <SelectItem value="paused">Pausado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="volume">Volume Operado (R$)</Label>
              <Input
                id="volume"
                type="number"
                step="0.01"
                value={volumeOperated}
                onChange={(e) => setVolumeOperated(e.target.value)}
                placeholder="0.00"
                disabled={submitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="performance">Performance (%)</Label>
              <Input
                id="performance"
                type="number"
                step="0.01"
                value={performancePercentage}
                onChange={(e) => setPerformancePercentage(e.target.value)}
                placeholder="0.00"
                disabled={submitting}
              />
            </div>

            <Button type="submit" className="w-full gap-2" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Cadastrando...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Cadastrar Robô
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Lista de Robôs */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            Meus Robôs
          </CardTitle>
          <CardDescription>
            Lista de robôs cadastrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : bots.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bot className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum robô cadastrado ainda</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Volume</TableHead>
                    <TableHead className="text-right">Performance</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bots.map((bot) => (
                    <TableRow key={bot.id}>
                      <TableCell className="font-medium">{bot.bot_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusColor(bot.status)}>
                          {getStatusLabel(bot.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {bot.volume_operated 
                          ? bot.volume_operated.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                          : '-'
                        }
                      </TableCell>
                      <TableCell className={`text-right font-medium ${
                        bot.performance_percentage && bot.performance_percentage >= 0 
                          ? 'text-success' 
                          : 'text-destructive'
                      }`}>
                        {bot.performance_percentage !== null
                          ? `${bot.performance_percentage >= 0 ? '+' : ''}${bot.performance_percentage.toFixed(2)}%`
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir o robô "{bot.bot_name}"? 
                                Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDelete(bot.id)}
                                className="bg-destructive hover:bg-destructive/90"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BotsManager;
