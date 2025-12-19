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
import { Camera, Save, Mail, Phone, User as UserIcon, Lock, Shield, Trash2 } from "lucide-react";
import { TwoFactorAuth } from "@/components/profile/TwoFactorAuth";
import { ActiveSessions } from "@/components/profile/ActiveSessions";
import { AvatarCropDialog } from "@/components/profile/AvatarCropDialog";
import { PremiumPageLayout, PremiumCard, PremiumLoader } from "@/components/layout/PremiumPageLayout";
import { motion } from "framer-motion";
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

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

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
      const { error: profileError } = await supabase
        .from("profiles")
        .delete()
        .eq("id", user.id);

      if (profileError) throw profileError;

      const { error: authError } = await supabase.auth.admin.deleteUser(user.id);
      
      if (authError) {
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
    return <PremiumLoader />;
  }

  return (
    <PremiumPageLayout
      title="Meu Perfil"
      subtitle="Configurações da conta"
      icon={UserIcon}
      maxWidth="lg"
    >
      <div className="space-y-6">
        {/* Avatar Section */}
        <motion.div variants={itemVariants}>
          <PremiumCard variant="gradient">
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-2 mb-2">
                <Camera className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold">Foto de Perfil</h3>
              </div>
              <div className="relative">
                <Avatar className="w-32 h-32 border-4 border-primary/20 ring-4 ring-primary/10 shadow-xl">
                  <AvatarImage src={formData.avatar_url} alt="Avatar" />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-3xl">
                    {formData.full_name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <label
                  htmlFor="avatar-upload"
                  className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-primary hover:bg-primary/90 cursor-pointer flex items-center justify-center transition-all duration-300 shadow-lg hover:scale-110"
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
                <p className="text-sm text-muted-foreground animate-pulse">Fazendo upload...</p>
              )}
            </div>
          </PremiumCard>
        </motion.div>

        {/* Personal Information */}
        <motion.div variants={itemVariants}>
          <PremiumCard>
            <div className="flex items-center gap-2 mb-6">
              <UserIcon className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold">Informações Pessoais</h3>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name" className="font-medium">Nome Completo</Label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                    className="pl-10 h-12 bg-background/50 border-border/50 focus:border-primary rounded-xl"
                    placeholder="Seu nome completo"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="font-medium">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    value={formData.email}
                    disabled
                    className="pl-10 h-12 bg-muted/50 border-border/50 rounded-xl"
                    placeholder="seu@email.com"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  O e-mail não pode ser alterado
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="font-medium">Telefone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="pl-10 h-12 bg-background/50 border-border/50 focus:border-primary rounded-xl"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
            </div>
          </PremiumCard>
        </motion.div>

        {/* Notifications */}
        <motion.div variants={itemVariants}>
          <PremiumCard>
            <div className="flex items-center gap-2 mb-6">
              <Mail className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold">Notificações</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="space-y-0.5">
                  <Label className="font-medium">Notificações por E-mail</Label>
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

              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="space-y-0.5">
                  <Label className="font-medium">Notificações Push</Label>
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
            </div>
          </PremiumCard>
        </motion.div>

        {/* Two-Factor Authentication */}
        {user && (
          <motion.div variants={itemVariants}>
            <TwoFactorAuth
              userId={user.id}
              email={formData.email}
              totpEnabled={formData.totp_enabled}
              onUpdate={checkUser}
            />
          </motion.div>
        )}

        {/* Active Sessions */}
        {user && (
          <motion.div variants={itemVariants}>
            <ActiveSessions userId={user.id} />
          </motion.div>
        )}

        {/* Security Section */}
        <motion.div variants={itemVariants}>
          <PremiumCard>
            <div className="flex items-center gap-2 mb-6">
              <Shield className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold">Segurança</h3>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new_password" className="font-medium">Nova Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="new_password"
                    type="password"
                    value={passwordData.new_password}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, new_password: e.target.value }))}
                    className="pl-10 h-12 bg-background/50 border-border/50 focus:border-primary rounded-xl"
                    placeholder="Digite sua nova senha"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm_password" className="font-medium">Confirmar Nova Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirm_password"
                    type="password"
                    value={passwordData.confirm_password}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirm_password: e.target.value }))}
                    className="pl-10 h-12 bg-background/50 border-border/50 focus:border-primary rounded-xl"
                    placeholder="Confirme sua nova senha"
                  />
                </div>
              </div>

              <Button
                onClick={handleChangePassword}
                variant="outline"
                className="w-full h-12 rounded-xl border-border/50 hover:bg-muted/50"
              >
                <Lock className="w-4 h-4 mr-2" />
                Alterar Senha
              </Button>
            </div>
          </PremiumCard>
        </motion.div>

        {/* Save Button */}
        <motion.div variants={itemVariants}>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-14 font-semibold text-base bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20 rounded-xl"
          >
            <Save className="w-5 h-5 mr-2" />
            {saving ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </motion.div>

        {/* Danger Zone */}
        <motion.div variants={itemVariants}>
          <PremiumCard className="border-destructive/20">
            <div className="flex items-center gap-2 mb-6">
              <Trash2 className="w-5 h-5 text-destructive" />
              <h3 className="text-lg font-semibold text-destructive">Zona de Perigo</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Ao deletar sua conta, todos os seus dados serão permanentemente removidos.
              Esta ação não pode ser desfeita.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full h-12 rounded-xl">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Deletar Minha Conta
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação é irreversível. Para confirmar, digite <strong>DELETAR</strong> abaixo.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <Input
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder="Digite DELETAR"
                  className="h-12 rounded-xl"
                />
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    className="bg-destructive hover:bg-destructive/90 rounded-xl"
                  >
                    Confirmar Exclusão
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </PremiumCard>
        </motion.div>
      </div>

      <AvatarCropDialog
        open={cropDialogOpen}
        onOpenChange={setCropDialogOpen}
        imageSrc={imageToCrop}
        onCropComplete={handleCroppedImage}
      />
    </PremiumPageLayout>
  );
};

export default Profile;
