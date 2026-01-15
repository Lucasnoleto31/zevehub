import { useState, useRef, useEffect } from "react";
import { ReelOverlay } from "./ReelOverlay";
import { ReelActions } from "./ReelActions";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";
import { motion } from "framer-motion";

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

interface ReelPlayerProps {
  reel: Reel;
  onLike: () => void;
  onView: () => void;
  userId: string | null;
}

export const ReelPlayer = ({ reel, onLike, onView, userId }: ReelPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showControls, setShowControls] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const hasViewedRef = useRef(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const currentProgress = (video.currentTime / video.duration) * 100;
      setProgress(currentProgress);

      // Mark as viewed after 3 seconds
      if (video.currentTime >= 3 && !hasViewedRef.current) {
        hasViewedRef.current = true;
        onView();
      }
    };

    const handleEnded = () => {
      video.currentTime = 0;
      video.play();
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("ended", handleEnded);

    // Autoplay
    video.play().catch(console.error);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("ended", handleEnded);
    };
  }, [reel.id, onView]);

  useEffect(() => {
    // Check if user has liked this reel
    const checkLiked = async () => {
      if (!userId) return;
      
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await supabase
        .from("reel_interactions")
        .select("liked")
        .eq("reel_id", reel.id)
        .eq("user_id", userId)
        .single();

      if (data) {
        setIsLiked(data.liked);
      }
    };

    checkLiked();
    hasViewedRef.current = false;
  }, [reel.id, userId]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleLikeClick = () => {
    setIsLiked(!isLiked);
    onLike();
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    video.currentTime = percentage * video.duration;
  };

  return (
    <div
      className="relative h-full w-full flex items-center justify-center bg-black"
      onClick={togglePlay}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* Video */}
      <video
        ref={videoRef}
        src={reel.video_url}
        poster={reel.thumbnail_url || undefined}
        className="h-full w-full object-contain"
        playsInline
        loop
        muted={isMuted}
      />

      {/* Play/Pause Indicator */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: showControls ? 1 : 0, scale: 1 }}
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
      >
        <div className="w-20 h-20 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm">
          {isPlaying ? (
            <Pause className="w-10 h-10 text-white" />
          ) : (
            <Play className="w-10 h-10 text-white ml-1" />
          )}
        </div>
      </motion.div>

      {/* Progress Bar */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 cursor-pointer z-30"
        onClick={(e) => {
          e.stopPropagation();
          handleProgressClick(e);
        }}
      >
        <div
          className="h-full bg-primary transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Mute Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          toggleMute();
        }}
        className="absolute bottom-16 right-4 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center z-30 hover:bg-black/70 transition-colors"
      >
        {isMuted ? (
          <VolumeX className="w-5 h-5 text-white" />
        ) : (
          <Volume2 className="w-5 h-5 text-white" />
        )}
      </button>

      {/* Overlay Info */}
      <ReelOverlay reel={reel} />

      {/* Actions */}
      <ReelActions
        likesCount={reel.likes_count}
        viewsCount={reel.views_count}
        isLiked={isLiked}
        onLike={(e) => {
          e.stopPropagation();
          handleLikeClick();
        }}
      />
    </div>
  );
};
