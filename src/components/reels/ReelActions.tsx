import { Heart, Eye, Share2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface ReelActionsProps {
  likesCount: number;
  viewsCount: number;
  isLiked: boolean;
  onLike: (e: React.MouseEvent) => void;
}

export const ReelActions = ({
  likesCount,
  viewsCount,
  isLiked,
  onLike,
}: ReelActionsProps) => {
  const formatCount = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (navigator.share) {
      navigator.share({
        title: "Confira esse Reel!",
        url: window.location.href,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copiado!");
    }
  };

  return (
    <div className="absolute right-4 bottom-32 flex flex-col items-center gap-6 z-30">
      {/* Like Button */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={onLike}
        className="flex flex-col items-center gap-1"
      >
        <motion.div
          animate={isLiked ? { scale: [1, 1.3, 1] } : {}}
          transition={{ duration: 0.3 }}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
            isLiked ? "bg-red-500" : "bg-black/50 hover:bg-black/70"
          }`}
        >
          <Heart
            className={`w-6 h-6 ${
              isLiked ? "text-white fill-white" : "text-white"
            }`}
          />
        </motion.div>
        <span className="text-white text-xs font-medium">
          {formatCount(likesCount)}
        </span>
      </motion.button>

      {/* Views */}
      <div className="flex flex-col items-center gap-1">
        <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center">
          <Eye className="w-6 h-6 text-white" />
        </div>
        <span className="text-white text-xs font-medium">
          {formatCount(viewsCount)}
        </span>
      </div>

      {/* Share Button */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={handleShare}
        className="flex flex-col items-center gap-1"
      >
        <div className="w-12 h-12 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors">
          <Share2 className="w-6 h-6 text-white" />
        </div>
        <span className="text-white text-xs font-medium">Compartilhar</span>
      </motion.button>
    </div>
  );
};
