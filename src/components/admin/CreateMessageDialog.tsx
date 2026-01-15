import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, MessageSquarePlus, Paperclip, X, FileText } from "lucide-react";

interface CreateMessageDialogProps {
  clients: Array<{ id: string; full_name: string; email: string }>;
  onMessageCreated: () => void;
}

const CreateMessageDialog = ({ clients, onMessageCreated }: CreateMessageDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    priority: "normal",
    isGlobal: false,
    userId: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        toast.error("Apenas arquivos PDF são permitidos");
        return;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error("O arquivo deve ter no máximo 10MB");
        return;
      }
      setSelectedFile(file);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    setUploadingFile(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `attachments/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("message-attachments")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("message-attachments")
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error: any) {
      console.error("Erro ao fazer upload:", error);
      toast.error("Erro ao fazer upload do arquivo");
      return null;
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.content) {
      toast.error("Título e conteúdo são obrigatórios");
      return;
    }

    if (!formData.isGlobal && !formData.userId) {
      toast.error("Selecione um destinatário ou marque como mensagem global");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      let attachmentUrl: string | null = null;
      if (selectedFile) {
        attachmentUrl = await uploadFile(selectedFile);
        if (!attachmentUrl) {
          setLoading(false);
          return;
        }
      }

      if (formData.isGlobal) {
        // Create individual messages for each client with personalized content
        const messagesToInsert = clients.map((client) => {
          const personalizedContent = `Olá ${client.full_name || 'Cliente'},\n\n${formData.content}`;
          return {
            title: formData.title,
            content: personalizedContent,
            priority: formData.priority,
            is_global: false,
            user_id: client.id,
            created_by: user?.id,
            attachment_url: attachmentUrl,
          };
        });

        const { error } = await supabase.from("messages").insert(messagesToInsert);
        if (error) throw error;

        toast.success(`Mensagem enviada para ${clients.length} clientes!`);
      } else {
        // Single message for specific user
        const selectedClient = clients.find(c => c.id === formData.userId);
        const personalizedContent = selectedClient 
          ? `Olá ${selectedClient.full_name || 'Cliente'},\n\n${formData.content}`
          : formData.content;

        const { error } = await supabase.from("messages").insert({
          title: formData.title,
          content: personalizedContent,
          priority: formData.priority,
          is_global: false,
          user_id: formData.userId,
          created_by: user?.id,
          attachment_url: attachmentUrl,
        });

        if (error) throw error;
        toast.success("Mensagem enviada com sucesso!");
      }

      setFormData({
        title: "",
        content: "",
        priority: "normal",
        isGlobal: false,
        userId: "",
      });
      setSelectedFile(null);
      setOpen(false);
      onMessageCreated();
    } catch (error: any) {
      console.error("Erro ao enviar mensagem:", error);
      toast.error(error.message || "Erro ao enviar mensagem");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <MessageSquarePlus className="w-4 h-4" />
          Nova Mensagem
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Criar Nova Mensagem</DialogTitle>
          <DialogDescription>
            Envie uma mensagem ou comunicado para os clientes
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Título da mensagem"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Conteúdo</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Escreva o conteúdo da mensagem..."
              rows={6}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">Prioridade</Label>
            <Select
              value={formData.priority}
              onValueChange={(value) => setFormData({ ...formData, priority: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Baixa</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="urgent">Urgente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* PDF Upload */}
          <div className="space-y-2">
            <Label>Anexo (PDF)</Label>
            {selectedFile ? (
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                <FileText className="w-8 h-8 text-red-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={removeFile}
                  className="h-8 w-8"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="relative">
                <Input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  id="pdf-upload"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => document.getElementById("pdf-upload")?.click()}
                >
                  <Paperclip className="w-4 h-4" />
                  Anexar PDF (opcional)
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="global">Mensagem Global</Label>
              <p className="text-sm text-muted-foreground">
                Enviar para todos os clientes
              </p>
            </div>
            <Switch
              id="global"
              checked={formData.isGlobal}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, isGlobal: checked, userId: "" })
              }
            />
          </div>

          {!formData.isGlobal && (
            <div className="space-y-2">
              <Label htmlFor="recipient">Destinatário</Label>
              <Select
                value={formData.userId}
                onValueChange={(value) => setFormData({ ...formData, userId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.full_name || client.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || uploadingFile}>
              {loading || uploadingFile ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {uploadingFile ? "Enviando arquivo..." : "Enviando..."}
                </>
              ) : (
                "Enviar Mensagem"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateMessageDialog;
