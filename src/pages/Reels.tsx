import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ReelPlayer } from "@/components/reels/ReelPlayer";
import { CategoryFilter } from "@/components/reels/CategoryFilter";
import { ChevronLeft, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

interface Reel {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  category: string;
  duration_seconds: number | null;
  views_count: number;
  likes_count: number;
  created_at: string;
}

const CATEGORIES = [
  { id: "todos", label: "Todos", color: "bg-primary" },
  { id: "analise-tecnica", label: "Análise Técnica", color: "bg-blue-500" },
  { id: "gestao-risco", label: "Gestão de Risco", color: "bg-red-500" },
  { id: "psicologia", label: "Psicologia", color: "bg-purple-500" },
  { id: "setups", label: "Setups", color: "bg-green-500" },
  { id: "noticias", label: "Notícias", color: "bg-yellow-500" },
  { id: "dicas", label: "Dicas Rápidas", color: "bg-cyan-500" },
];

const Reels = () => {
  const navigate = useNavigate();
  const [reels, setReels] = useState<Reel[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState("todos");
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number>(0);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      setUserId(user.id);
    };
    checkUser();
  }, [navigate]);

  useEffect(() => {
    const fetchReels = async () => {
      setLoading(true);
      let query = supabase
        .from("reels")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (selectedCategory !== "todos") {
        query = query.eq("category", selectedCategory);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Erro ao carregar reels:", error);
      } else {
        setReels(data || []);
        setCurrentIndex(0);
      }
      setLoading(false);
    };

    fetchReels();
  }, [selectedCategory]);

  const goToNext = useCallback(() => {
    if (currentIndex < reels.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentIndex, reels.length]);

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndY = e.changedTouches[0].clientY;
    const diff = touchStartY.current - touchEndY;

    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        goToNext();
      } else {
        goToPrevious();
      }
    }
  };

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    if (e.deltaY > 0) {
      goToNext();
    } else {
      goToPrevious();
    }
  }, [goToNext, goToPrevious]);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener("wheel", handleWheel, { passive: false });
      return () => container.removeEventListener("wheel", handleWheel);
    }
  }, [handleWheel]);

  const handleLike = async (reelId: string) => {
    if (!userId) return;

    const { data: existing } = await supabase
      .from("reel_interactions")
      .select("*")
      .eq("reel_id", reelId)
      .eq("user_id", userId)
      .single();

    if (existing) {
      const newLiked = !existing.liked;
      await supabase
        .from("reel_interactions")
        .update({ liked: newLiked })
        .eq("id", existing.id);

      await supabase.rpc("increment_column", {
        table_name: "reels",
        column_name: "likes_count",
        row_id: reelId,
        increment_value: newLiked ? 1 : -1,
      });
    } else {
      await supabase.from("reel_interactions").insert({
        reel_id: reelId,
        user_id: userId,
        liked: true,
      });

      await supabase.rpc("increment_column", {
        table_name: "reels",
        column_name: "likes_count",
        row_id: reelId,
        increment_value: 1,
      });
    }

    setReels(prev =>
      prev.map(r =>
        r.id === reelId
          ? { ...r, likes_count: r.likes_count + (existing?.liked ? -1 : 1) }
          : r
      )
    );
  };

  const handleView = async (reelId: string) => {
    if (!userId) return;

    const { data: existing } = await supabase
      .from("reel_interactions")
      .select("*")
      .eq("reel_id", reelId)
      .eq("user_id", userId)
      .single();

    if (!existing) {
      await supabase.from("reel_interactions").insert({
        reel_id: reelId,
        user_id: userId,
        watched: true,
      });

      await supabase.rpc("increment_column", {
        table_name: "reels",
        column_name: "views_count",
        row_id: reelId,
        increment_value: 1,
      });

      setReels(prev =>
        prev.map(r =>
          r.id === reelId ? { ...r, views_count: r.views_count + 1 } : r
        )
      );
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-black overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-50 p-4 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard")}
            className="text-white hover:bg-white/20"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-white font-bold text-xl">Reels</h1>
          <div className="w-10" />
        </div>
        <CategoryFilter
          categories={CATEGORIES}
          selected={selectedCategory}
          onSelect={setSelectedCategory}
        />
      </div>

      {/* Reels Container */}
      {reels.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-white/60">
            <p className="text-lg">Nenhum reel disponível</p>
            <p className="text-sm mt-2">Volte mais tarde para novos conteúdos</p>
          </div>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -100 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            <ReelPlayer
              reel={reels[currentIndex]}
              onLike={() => handleLike(reels[currentIndex].id)}
              onView={() => handleView(reels[currentIndex].id)}
              userId={userId}
            />
          </motion.div>
        </AnimatePresence>
      )}

      {/* Navigation Arrows */}
      {reels.length > 1 && (
        <>
          {currentIndex > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={goToPrevious}
              className="absolute left-1/2 top-32 -translate-x-1/2 text-white/60 hover:text-white hover:bg-white/10 z-40"
            >
              <ChevronUp className="h-8 w-8" />
            </Button>
          )}
          {currentIndex < reels.length - 1 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={goToNext}
              className="absolute left-1/2 bottom-8 -translate-x-1/2 text-white/60 hover:text-white hover:bg-white/10 z-40"
            >
              <ChevronDown className="h-8 w-8" />
            </Button>
          )}
        </>
      )}

      {/* Progress Indicator */}
      {reels.length > 1 && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-1">
          {reels.map((_, index) => (
            <div
              key={index}
              className={`w-1 h-4 rounded-full transition-all ${
                index === currentIndex
                  ? "bg-primary scale-110"
                  : "bg-white/30"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Reels;
