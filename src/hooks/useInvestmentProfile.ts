import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type InvestmentProfile = 'start' | 'perfil_1' | 'perfil_2' | 'perfil_5' | 'perfil_10';

export const PROFILE_MULTIPLIERS: Record<InvestmentProfile, number> = {
  start: 0.1,
  perfil_1: 0.2,
  perfil_2: 0.4,
  perfil_5: 1.0,
  perfil_10: 2.0,
};

export const PROFILE_LABELS: Record<InvestmentProfile, string> = {
  start: 'Start (10%)',
  perfil_1: 'Perfil 1 (20%)',
  perfil_2: 'Perfil 2 (40%)',
  perfil_5: 'Perfil 5 (100% - Matriz)',
  perfil_10: 'Perfil 10 (200%)',
};

export const useInvestmentProfile = (userId: string | undefined) => {
  const [profile, setProfile] = useState<InvestmentProfile>('perfil_5');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadProfile();
    }
  }, [userId]);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("investment_profile")
        .eq("id", userId)
        .single();

      if (error) throw error;

      if (data?.investment_profile) {
        setProfile(data.investment_profile as InvestmentProfile);
      }
    } catch (error) {
      console.error("Erro ao carregar perfil:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (newProfile: InvestmentProfile) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ investment_profile: newProfile })
        .eq("id", userId);

      if (error) throw error;

      setProfile(newProfile);
      toast.success(`Perfil atualizado para ${PROFILE_LABELS[newProfile]}`);
    } catch (error: any) {
      console.error("Erro ao atualizar perfil:", error);
      toast.error("Erro ao atualizar perfil");
    }
  };

  const getMultiplier = () => PROFILE_MULTIPLIERS[profile];

  const applyMultiplier = (value: number) => value * getMultiplier();

  return {
    profile,
    loading,
    updateProfile,
    getMultiplier,
    applyMultiplier,
  };
};
