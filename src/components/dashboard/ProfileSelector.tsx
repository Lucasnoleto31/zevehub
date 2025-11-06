import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Info } from "lucide-react";
import { InvestmentProfile, PROFILE_LABELS, PROFILE_MULTIPLIERS, useInvestmentProfile } from "@/hooks/useInvestmentProfile";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ProfileSelectorProps {
  userId: string;
}

const ProfileSelector = ({ userId }: ProfileSelectorProps) => {
  const { profile, loading, updateProfile, getMultiplier } = useInvestmentProfile(userId);

  if (loading) {
    return null;
  }

  const handleProfileChange = (value: string) => {
    updateProfile(value as InvestmentProfile);
  };

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Perfil de Investimento
        </CardTitle>
        <CardDescription>
          Selecione seu perfil para visualizar os resultados proporcionais
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Select value={profile} onValueChange={handleProfileChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione seu perfil" />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(PROFILE_LABELS) as InvestmentProfile[]).map((key) => (
                <SelectItem key={key} value={key}>
                  {PROFILE_LABELS[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="secondary" className="text-lg font-bold px-4 py-2 whitespace-nowrap">
            {(getMultiplier() * 100).toFixed(0)}%
          </Badge>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Todos os resultados exibidos são baseados na matriz (Perfil 5 - 100%) e serão 
            automaticamente ajustados para o seu perfil selecionado. Os valores reais das 
            operações não são alterados.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-2 gap-2 pt-2">
          {(Object.entries(PROFILE_MULTIPLIERS) as [InvestmentProfile, number][]).map(([key, multiplier]) => (
            <div
              key={key}
              className={`p-2 rounded-lg border text-center transition-colors ${
                profile === key 
                  ? 'border-primary bg-primary/10' 
                  : 'border-border bg-card'
              }`}
            >
              <div className="text-xs text-muted-foreground">
                {PROFILE_LABELS[key].split(' ')[0]}
              </div>
              <div className="font-bold text-sm">
                {(multiplier * 100).toFixed(0)}%
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProfileSelector;
