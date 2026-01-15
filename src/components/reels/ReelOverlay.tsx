import { Badge } from "@/components/ui/badge";

interface Reel {
  id: string;
  title: string;
  description: string | null;
  category: string;
  created_at: string;
}

interface ReelOverlayProps {
  reel: Reel;
}

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  "analise-tecnica": { label: "Análise Técnica", color: "bg-blue-500" },
  "gestao-risco": { label: "Gestão de Risco", color: "bg-red-500" },
  "psicologia": { label: "Psicologia", color: "bg-purple-500" },
  "setups": { label: "Setups", color: "bg-green-500" },
  "noticias": { label: "Notícias", color: "bg-yellow-500" },
  "dicas": { label: "Dicas Rápidas", color: "bg-cyan-500" },
};

export const ReelOverlay = ({ reel }: ReelOverlayProps) => {
  const categoryInfo = CATEGORY_LABELS[reel.category] || {
    label: reel.category,
    color: "bg-primary",
  };

  return (
    <div className="absolute bottom-12 left-0 right-16 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none z-20">
      <div className="space-y-2">
        <Badge className={`${categoryInfo.color} text-white border-0`}>
          {categoryInfo.label}
        </Badge>
        <h2 className="text-white font-bold text-lg leading-tight">
          {reel.title}
        </h2>
        {reel.description && (
          <p className="text-white/80 text-sm line-clamp-2">
            {reel.description}
          </p>
        )}
      </div>
    </div>
  );
};
