import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Transaction } from "@/pages/PersonalFinances";
import { Upload, X, Paperclip } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface TransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: Transaction | null;
  onSave: () => void;
}

export const TransactionDialog = ({ open, onOpenChange, transaction, onSave }: TransactionDialogProps) => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [existingAttachment, setExistingAttachment] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);

  const { register, handleSubmit, reset, setValue, watch } = useForm({
    defaultValues: {
      title: "",
      amount: "",
      type: "expense" as "income" | "expense",
      category: "",
      description: "",
      transaction_date: new Date().toISOString().split('T')[0],
    },
  });

  const transactionType = watch("type");

  useEffect(() => {
    loadCategories();
  }, [transactionType]);

  useEffect(() => {
    if (transaction) {
      setValue("title", transaction.title);
      setValue("amount", transaction.amount.toString());
      setValue("type", transaction.type);
      setValue("category", transaction.category);
      setValue("description", transaction.description || "");
      setValue("transaction_date", transaction.transaction_date);
      setExistingAttachment((transaction as any).attachment_url || null);
    } else {
      reset();
      setExistingAttachment(null);
      setUploadedFile(null);
    }
  }, [transaction, setValue, reset]);

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("finance_categories")
        .select("*")
        .eq("type", transactionType)
        .order("name");

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Erro ao carregar categorias:", error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Arquivo muito grande. Máximo 5MB.");
        return;
      }
      setUploadedFile(file);
    }
  };

  const uploadFile = async (userId: string) => {
    if (!uploadedFile) return null;

    setUploading(true);
    try {
      const fileExt = uploadedFile.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, uploadedFile);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('receipts')
        .getPublicUrl(fileName);

      return data.publicUrl;
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      toast.error("Erro ao fazer upload do arquivo");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (data: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      let attachmentUrl = existingAttachment;
      
      if (uploadedFile) {
        attachmentUrl = await uploadFile(user.id);
      }

      const transactionData = {
        ...data,
        amount: parseFloat(data.amount),
        user_id: user.id,
        attachment_url: attachmentUrl,
      };

      if (transaction) {
        const { error } = await supabase
          .from("personal_finances")
          .update(transactionData)
          .eq("id", transaction.id);

        if (error) throw error;
        toast.success("Transação atualizada com sucesso!");
      } else {
        const { error } = await supabase
          .from("personal_finances")
          .insert([transactionData]);

        if (error) throw error;
        toast.success("Transação criada com sucesso!");
      }

      onSave();
    } catch (error) {
      console.error("Erro ao salvar transação:", error);
      toast.error("Erro ao salvar transação");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {transaction ? "Editar Transação" : "Nova Transação"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              {...register("title", { required: true })}
              placeholder="Ex: Salário de Janeiro"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Valor</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              {...register("amount", { required: true })}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Data</Label>
            <Input
              id="date"
              type="date"
              {...register("transaction_date", { required: true })}
            />
          </div>

          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select onValueChange={(value) => setValue("type", value as "income" | "expense")} value={watch("type")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income">Receita</SelectItem>
                <SelectItem value="expense">Despesa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select onValueChange={(value) => setValue("category", value)} value={watch("category")}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.name}>
                    <span className="flex items-center gap-2">
                      <span>{cat.icon}</span>
                      <span>{cat.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Adicione uma descrição"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Comprovante (opcional)</Label>
            <div className="flex flex-col gap-2">
              {existingAttachment && !uploadedFile && (
                <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                  <Paperclip className="h-4 w-4" />
                  <span className="text-sm flex-1">Arquivo anexado</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setExistingAttachment(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              
              {uploadedFile && (
                <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                  <Paperclip className="h-4 w-4" />
                  <span className="text-sm flex-1">{uploadedFile.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setUploadedFile(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                {uploadedFile || existingAttachment ? "Alterar arquivo" : "Anexar comprovante"}
              </Button>
              <input
                id="file-upload"
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              <p className="text-xs text-muted-foreground">
                Formatos aceitos: imagens e PDF (máx. 5MB)
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={uploading}>
              {uploading ? "Enviando..." : transaction ? "Atualizar" : "Criar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
