import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Award, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BadgeUnlockModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  badge: {
    badge_id: string;
    badge_name: string;
    badge_description: string;
  } | null;
}

const BADGE_ICONS: Record<string, string> = {
  primeiro_post: "🎯",
  helper: "🤝",
  analista: "📊",
  consistencia: "🔥",
  lendaria: "👑",
};

export function BadgeUnlockModal({
  open,
  onOpenChange,
  badge,
}: BadgeUnlockModalProps) {
  if (!badge) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">
            Badge Conquistada! 🎉
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center space-y-6 py-8">
          {/* Ícone animado */}
          <div className="relative">
            <div className="absolute inset-0 animate-ping">
              <div className="h-32 w-32 rounded-full bg-primary/20" />
            </div>
            <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 shadow-2xl">
              <span className="text-6xl">
                {BADGE_ICONS[badge.badge_id] || "🏆"}
              </span>
            </div>
          </div>

          {/* Informações da badge */}
          <div className="space-y-2 text-center">
            <Badge variant="secondary" className="text-lg px-4 py-2">
              <Award className="mr-2 h-4 w-4" />
              {badge.badge_name}
            </Badge>
            <p className="text-muted-foreground max-w-sm">
              {badge.badge_description}
            </p>
          </div>

          {/* Efeito de celebração */}
          <div className="flex gap-2">
            <Sparkles className="h-6 w-6 text-yellow-500 animate-pulse" />
            <Sparkles className="h-6 w-6 text-yellow-500 animate-pulse delay-75" />
            <Sparkles className="h-6 w-6 text-yellow-500 animate-pulse delay-150" />
          </div>

          <Button onClick={() => onOpenChange(false)} className="w-full">
            Continuar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
