import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ArrowLeft, Camera, Save, Mail, Phone, User as UserIcon, Lock, Shield, Trash2 } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TwoFactorAuth } from "@/components/profile/TwoFactorAuth";
import { ActivityLog } from "@/components/profile/ActivityLog";
import { ActiveSessions } from "@/components/profile/ActiveSessions";
import { AvatarCropDialog } from "@/components/profile/AvatarCropDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    avatar_url: "",
    totp_enabled: false,
  });

  const [notifications, setNotifications] = useState({
    email_notifications: true,
    push_notifications: true,
  });

  const [passwordData, setPasswordData] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);

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

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (profileData) {
        setFormData({
          full_name: profileData.full_name || "",
          email: profileData.email || "",
          phone: profileData.phone || "",
          avatar_url: profileData.avatar_url || "",
          totp_enabled: profileData.totp_enabled || false,
        });
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setImageToCrop(reader.result as string);
      setCropDialogOpen(true);
    };
    reader.readAsDataURL(file);
    
    // Limpar o input para permitir selecionar a mesma imagem novamente
    e.target.value = "";
  };

  const handleCroppedImage = async (croppedBlob: Blob) => {
    if (!user) return;

    setUploading(true);
    try {
      const fileName = `${user.id}/${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, croppedBlob, { 
          upsert: true,
          contentType: 'image/jpeg'
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      setFormData(prev => ({ ...prev, avatar_url: publicUrl }));
      toast.success("Foto atualizada com sucesso!");
    } catch (error: any) {
      console.error("Erro ao fazer upload:", error);
      toast.error("Erro ao fazer upload da foto");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          avatar_url: formData.avatar_url,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast.success("Perfil atualizado com sucesso!");
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar perfil");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordData.new_password || !passwordData.confirm_password) {
      toast.error("Preencha todos os campos de senha");
      return;
    }

    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error("As senhas não coincidem");
      return;
    }

    if (passwordData.new_password.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres");
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.new_password
      });

      if (error) throw error;

      setPasswordData({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });

      toast.success("Senha alterada com sucesso!");
    } catch (error: any) {
      console.error("Erro ao alterar senha:", error);
      toast.error(error.message || "Erro ao alterar senha");
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    if (deleteConfirmation !== "DELETAR") {
      toast.error("Digite DELETAR para confirmar");
      return;
    }

    try {
      // Primeiro, deletar dados do usuário
      const { error: profileError } = await supabase
        .from("profiles")
        .delete()
        .eq("id", user.id);

      if (profileError) throw profileError;

      // Depois, deletar a conta de autenticação
      const { error: authError } = await supabase.auth.admin.deleteUser(user.id);
      
      if (authError) {
        // Se não tiver permissão admin, apenas fazer logout
        await supabase.auth.signOut();
        toast.success("Conta removida. Você foi desconectado.");
        navigate("/auth");
        return;
      }

      toast.success("Conta deletada com sucesso");
      navigate("/auth");
    } catch (error: any) {
      console.error("Erro ao deletar conta:", error);
      toast.error("Erro ao deletar conta. Entre em contato com o suporte.");
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
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/dashboard")}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </Button>
              <h1 className="text-xl font-bold text-foreground">Meu Perfil</h1>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          {/* Avatar Section */}
          <Card>
            <CardHeader>
              <CardTitle>Foto de Perfil</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <div className="relative">
                <Avatar className="w-32 h-32 border-4 border-primary/20">
                  <AvatarImage src={formData.avatar_url} alt="Avatar" />
                  <AvatarFallback className="bg-gradient-primary text-primary-foreground text-3xl">
                    {formData.full_name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <label
                  htmlFor="avatar-upload"
                  className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-primary hover:bg-primary-hover cursor-pointer flex items-center justify-center transition-colors"
                >
                  <Camera className="w-5 h-5 text-primary-foreground" />
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarSelect}
                    disabled={uploading}
                  />
                </label>
              </div>
              {uploading && (
                <p className="text-sm text-muted-foreground">Fazendo upload...</p>
              )}
            </CardContent>
          </Card>

          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle>Informações Pessoais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Nome Completo</Label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                    className="pl-10"
                    placeholder="Seu nome completo"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    value={formData.email}
                    disabled
                    className="pl-10 bg-muted"
                    placeholder="seu@email.com"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  O e-mail não pode ser alterado
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="pl-10"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader>
              <CardTitle>Notificações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notificações por E-mail</Label>
                  <p className="text-sm text-muted-foreground">
                    Receba atualizações por e-mail
                  </p>
                </div>
                <Switch
                  checked={notifications.email_notifications}
                  onCheckedChange={(checked) => 
                    setNotifications(prev => ({ ...prev, email_notifications: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notificações Push</Label>
                  <p className="text-sm text-muted-foreground">
                    Receba notificações no navegador
                  </p>
                </div>
                <Switch
                  checked={notifications.push_notifications}
                  onCheckedChange={(checked) => 
                    setNotifications(prev => ({ ...prev, push_notifications: checked }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Two-Factor Authentication */}
          {user && (
            <TwoFactorAuth
              userId={user.id}
              email={formData.email}
              totpEnabled={formData.totp_enabled}
              onUpdate={checkUser}
            />
          )}

          {/* Activity Log */}
          {user && <ActivityLog userId={user.id} />}

          {/* Active Sessions */}
          {user && <ActiveSessions userId={user.id} />}

          {/* Security Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Segurança
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new_password">Nova Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="new_password"
                    type="password"
                    value={passwordData.new_password}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, new_password: e.target.value }))}
                    className="pl-10"
                    placeholder="Digite sua nova senha"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm_password">Confirmar Nova Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirm_password"
                    type="password"
                    value={passwordData.confirm_password}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirm_password: e.target.value }))}
                    className="pl-10"
                    placeholder="Confirme sua nova senha"
                  />
                </div>
              </div>

              <Button
                onClick={handleChangePassword}
                variant="outline"
                className="w-full"
              >
                Alterar Senha
              </Button>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-error/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-error">
                <Trash2 className="w-5 h-5" />
                Zona Perigosa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Deletar Conta Permanentemente</Label>
                <p className="text-sm text-muted-foreground">
                  Esta ação não pode ser desfeita. Todos os seus dados serão permanentemente removidos.
                </p>
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full">
                    Deletar Minha Conta
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-4">
                      <p>
                        Esta ação não pode ser desfeita. Isso irá permanentemente deletar sua conta
                        e remover todos os seus dados de nossos servidores.
                      </p>
                      <div className="space-y-2">
                        <Label htmlFor="delete-confirm">
                          Digite <span className="font-bold text-foreground">DELETAR</span> para confirmar:
                        </Label>
                        <Input
                          id="delete-confirm"
                          value={deleteConfirmation}
                          onChange={(e) => setDeleteConfirmation(e.target.value)}
                          placeholder="DELETAR"
                          className="font-mono"
                        />
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setDeleteConfirmation("")}>
                      Cancelar
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      className="bg-error hover:bg-error/90"
                      disabled={deleteConfirmation !== "DELETAR"}
                    >
                      Deletar Conta
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={saving}
              size="lg"
              className="gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </div>
      </main>

      {imageToCrop && (
        <AvatarCropDialog
          open={cropDialogOpen}
          onOpenChange={setCropDialogOpen}
          imageSrc={imageToCrop}
          onCropComplete={handleCroppedImage}
        />
      )}
    </div>
  );
};

export default Profile;
