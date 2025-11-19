import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield } from "lucide-react";
import * as OTPAuth from "otpauth";

interface TwoFactorVerificationProps {
  open: boolean;
  onVerify: (code: string) => Promise<boolean>;
  onCancel: () => void;
}

export function TwoFactorVerification({ open, onVerify, onCancel }: TwoFactorVerificationProps) {
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");

  const handleVerify = async () => {
    if (code.length !== 6) {
      setError("Código deve ter 6 dígitos");
      return;
    }

    setVerifying(true);
    setError("");

    try {
      const isValid = await onVerify(code);
      if (!isValid) {
        setError("Código inválido");
      }
    } catch (err) {
      setError("Erro ao verificar código");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => !verifying && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Autenticação de Dois Fatores</DialogTitle>
          <DialogDescription className="text-center">
            Digite o código de 6 dígitos do seu aplicativo autenticador
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="code">Código de Verificação</Label>
            <Input
              id="code"
              type="text"
              placeholder="000000"
              maxLength={6}
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, ""));
                setError("");
              }}
              className="text-center text-2xl tracking-widest"
              disabled={verifying}
              autoFocus
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={verifying}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleVerify}
            disabled={verifying || code.length !== 6}
            className="flex-1"
          >
            {verifying ? "Verificando..." : "Verificar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
