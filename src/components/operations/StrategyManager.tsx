import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Bot, Plus, Trash2, Loader2, Edit2, Check, X } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";

interface StrategyManagerProps {
  userId: string;
}

interface Strategy {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

const StrategyManager = ({ userId }: StrategyManagerProps) => {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  
  // Edit state
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  useEffect(() => {
    loadStrategies();
    
    // Real-time subscription
    const channel = supabase
      .channel('strategies_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'strategies',
          filter: `user_id=eq.${userId}`
        },
        () => {
          loadStrategies();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const loadStrategies = async () => {
    try {
      const { data, error } = await supabase
        .from('strategies')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStrategies(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar estratégias:', error);
      toast.error('Erro ao carregar estratégias');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error('Nome da estratégia é obrigatório');
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('strategies')
        .insert({
          user_id: userId,
          name: name.trim(),
          description: description.trim() || null,
          is_active: true
        });

      if (error) throw error;

      toast.success('Estratégia cadastrada com sucesso!');
      
      // Reset form
      setName("");
      setDescription("");
    } catch (error: any) {
      console.error('Erro ao cadastrar estratégia:', error);
      toast.error('Erro ao cadastrar estratégia');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (strategyId: string) => {
    try {
      const { error } = await supabase
        .from('strategies')
        .delete()
        .eq('id', strategyId);

      if (error) throw error;
      toast.success('Estratégia excluída com sucesso!');
    } catch (error: any) {
      console.error('Erro ao excluir estratégia:', error);
      toast.error('Erro ao excluir estratégia');
    }
  };

  const handleToggleActive = async (strategyId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('strategies')
        .update({ is_active: !currentStatus })
        .eq('id', strategyId);

      if (error) throw error;
      toast.success(`Estratégia ${!currentStatus ? 'ativada' : 'desativada'} com sucesso!`);
    } catch (error: any) {
      console.error('Erro ao atualizar estratégia:', error);
      toast.error('Erro ao atualizar estratégia');
    }
  };

  const startEdit = (strategy: Strategy) => {
    setEditingId(strategy.id);
    setEditName(strategy.name);
    setEditDescription(strategy.description || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditDescription("");
  };

  const saveEdit = async (strategyId: string) => {
    if (!editName.trim()) {
      toast.error('Nome da estratégia é obrigatório');
      return;
    }

    try {
      const { error } = await supabase
        .from('strategies')
        .update({
          name: editName.trim(),
          description: editDescription.trim() || null
        })
        .eq('id', strategyId);

      if (error) throw error;
      
      toast.success('Estratégia atualizada com sucesso!');
      setEditingId(null);
    } catch (error: any) {
      console.error('Erro ao atualizar estratégia:', error);
      toast.error('Erro ao atualizar estratégia');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Formulário de Cadastro */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Nova Estratégia
          </CardTitle>
          <CardDescription>
            Cadastre uma nova estratégia de trading
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="strategy-name">Nome da Estratégia *</Label>
              <Input
                id="strategy-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Bot WIN v1.0, Estratégia XYZ"
                required
                disabled={submitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="strategy-description">Descrição</Label>
              <Textarea
                id="strategy-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva a estratégia..."
                rows={4}
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
                  Cadastrar Estratégia
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Lista de Estratégias */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            Minhas Estratégias
          </CardTitle>
          <CardDescription>
            Lista de estratégias cadastradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : strategies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bot className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Nenhuma estratégia cadastrada ainda</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[120px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {strategies.map((strategy) => (
                    <TableRow key={strategy.id}>
                      <TableCell className="font-medium">
                        {editingId === strategy.id ? (
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="h-8"
                          />
                        ) : (
                          strategy.name
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === strategy.id ? (
                          <Textarea
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            rows={2}
                            className="text-xs"
                          />
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            {strategy.description || '-'}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={strategy.is_active}
                            onCheckedChange={() => handleToggleActive(strategy.id, strategy.is_active)}
                          />
                          <Badge variant={strategy.is_active ? "default" : "outline"}>
                            {strategy.is_active ? 'Ativa' : 'Inativa'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {editingId === strategy.id ? (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => saveEdit(strategy.id)}
                              >
                                <Check className="w-4 h-4 text-success" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={cancelEdit}
                              >
                                <X className="w-4 h-4 text-muted-foreground" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => startEdit(strategy)}
                              >
                                <Edit2 className="w-4 h-4 text-primary" />
                              </Button>
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
                                      Tem certeza que deseja excluir a estratégia "{strategy.name}"? 
                                      Esta ação não pode ser desfeita.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => handleDelete(strategy.id)}
                                      className="bg-destructive hover:bg-destructive/90"
                                    >
                                      Excluir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
                        </div>
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

export default StrategyManager;
