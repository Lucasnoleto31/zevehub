import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Shield, Key } from "lucide-react";
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";
import { supabase } from "@/integrations/supabase/client";

interface TwoFactorAuthProps {
  userId: string;
  email: string;
  totpEnabled: boolean;
  onUpdate: () => void;
}

export const TwoFactorAuth = ({ userId, email, totpEnabled, onUpdate }: TwoFactorAuthProps) => {
  const [qrCode, setQrCode] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isEnabling, setIsEnabling] = useState(false);

  const generateTOTP = async () => {
    try {
      const totp = new OTPAuth.TOTP({
        issuer: "Portal Zeve",
        label: email,
        algorithm: "SHA1",
        digits: 6,
        period: 30,
      });

      const secretBase32 = totp.secret.base32;
      setSecret(secretBase32);

      const otpauthUrl = totp.toString();
      const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
      setQrCode(qrCodeDataUrl);
      setIsEnabling(true);
    } catch (error) {
      console.error("Erro ao gerar TOTP:", error);
      toast.error("Erro ao gerar código 2FA");
    }
  };

  const verifyAndEnable = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error("Digite um código de 6 dígitos");
      return;
    }

    try {
      // Verificar o código TOTP
      const totp = new OTPAuth.TOTP({
        issuer: "Portal Zeve",
        label: email,
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(secret),
      });

      const isValid = totp.validate({ token: verificationCode, window: 1 }) !== null;

      if (!isValid) {
        toast.error("Código inválido. Tente novamente.");
        return;
      }

      // Salvar secret e ativar 2FA
      const { error } = await supabase
        .from("profiles")
        .update({
          totp_secret: secret,
          totp_enabled: true,
          totp_verified_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (error) throw error;

      toast.success("Autenticação 2FA ativada com sucesso!");
      setIsEnabling(false);
      setQrCode("");
      setSecret("");
      setVerificationCode("");
      onUpdate();
    } catch (error) {
      console.error("Erro ao verificar código:", error);
      toast.error("Erro ao ativar 2FA");
    }
  };

  const disable2FA = async () => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          totp_secret: null,
          totp_enabled: false,
          totp_verified_at: null,
        })
        .eq("id", userId);

      if (error) throw error;

      toast.success("Autenticação 2FA desativada");
      onUpdate();
    } catch (error) {
      console.error("Erro ao desativar 2FA:", error);
      toast.error("Erro ao desativar 2FA");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Autenticação de Dois Fatores (2FA)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Adicione uma camada extra de segurança à sua conta com autenticação de dois fatores.
        </p>

        {!totpEnabled && !isEnabling && (
          <Button onClick={generateTOTP} className="w-full">
            <Key className="w-4 h-4 mr-2" />
            Ativar 2FA
          </Button>
        )}

        {isEnabling && qrCode && (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-4">
              <p className="text-sm text-center">
                Escaneie este QR code com seu aplicativo autenticador (Google Authenticator, Authy, etc):
              </p>
              <img src={qrCode} alt="QR Code 2FA" className="w-48 h-48 border rounded" />
              <div className="text-center space-y-2">
                <p className="text-xs text-muted-foreground">Ou digite manualmente:</p>
                <code className="block text-sm bg-muted p-2 rounded">{secret}</code>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="verification_code">Código de Verificação</Label>
              <Input
                id="verification_code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="000000"
                maxLength={6}
                className="text-center text-2xl tracking-widest"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={verifyAndEnable} className="flex-1">
                Verificar e Ativar
              </Button>
              <Button
                onClick={() => {
                  setIsEnabling(false);
                  setQrCode("");
                  setSecret("");
                }}
                variant="outline"
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {totpEnabled && (
          <div className="space-y-4">
            <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
              <p className="text-sm text-success font-medium">
                ✓ Autenticação 2FA está ativa
              </p>
            </div>
            <Button onClick={disable2FA} variant="outline" className="w-full">
              Desativar 2FA
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
