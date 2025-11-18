import { useEffect, useState } from "react";

interface RecentProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string;
  visitedAt: string;
}

const STORAGE_KEY = "recent_profiles";
const MAX_RECENT = 5;

export const useRecentProfiles = () => {
  const [recentProfiles, setRecentProfiles] = useState<RecentProfile[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setRecentProfiles(JSON.parse(stored));
      } catch (error) {
        console.error("Error loading recent profiles:", error);
      }
    }
  }, []);

  const addRecentProfile = (profile: Omit<RecentProfile, "visitedAt">) => {
    const newProfile: RecentProfile = {
      ...profile,
      visitedAt: new Date().toISOString(),
    };

    const filtered = recentProfiles.filter((p) => p.id !== profile.id);
    const updated = [newProfile, ...filtered].slice(0, MAX_RECENT);
    
    setRecentProfiles(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const clearRecentProfiles = () => {
    setRecentProfiles([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  return {
    recentProfiles,
    addRecentProfile,
    clearRecentProfiles,
  };
};
