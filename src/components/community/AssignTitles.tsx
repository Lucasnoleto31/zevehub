import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { UserPlus, X } from "lucide-react";

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string;
}

interface CommunityTitle {
  id: string;
  name: string;
  color: string;
  icon: string | null;
}

export const AssignTitles = () => {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [selectedTitle, setSelectedTitle] = useState<string>("");

  const { data: profiles } = useQuery({
    queryKey: ["profiles-search", searchTerm],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("id, full_name, avatar_url, email")
        .order("full_name");
      
      if (searchTerm) {
        query = query.ilike("full_name", `%${searchTerm}%`);
      }
      
      const { data, error } = await query.limit(10);
      if (error) throw error;
      return data as Profile[];
    },
    enabled: isOpen,
  });

  const { data: titles } = useQuery({
    queryKey: ["community-titles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_titles")
        .select("*")
        .order("priority", { ascending: false });
      
      if (error) throw error;
      return data as CommunityTitle[];
    },
  });

  const { data: userTitles } = useQuery({
    queryKey: ["user-community-titles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_community_titles")
        .select(`
          id,
          user_id,
          title_id,
          profiles!user_community_titles_user_id_fkey(id, full_name, avatar_url),
          community_titles!user_community_titles_title_id_fkey(id, name, color, icon)
        `);
      
      if (error) throw error;
      return data;
    },
  });

  const assignMutation = useMutation({
    mutationFn: async ({ userId, titleId }: { userId: string; titleId: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("user_community_titles").insert([{
        user_id: userId,
        title_id: titleId,
        granted_by: user?.id,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-community-titles"] });
      toast.success("Título atribuído com sucesso!");
      setIsOpen(false);
      setSelectedUser("");
      setSelectedTitle("");
      setSearchTerm("");
    },
    onError: () => toast.error("Erro ao atribuir título"),
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("user_community_titles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-community-titles"] });
      toast.success("Título removido com sucesso!");
    },
    onError: () => toast.error("Erro ao remover título"),
  });

  const handleAssign = () => {
    if (selectedUser && selectedTitle) {
      assignMutation.mutate({ userId: selectedUser, titleId: selectedTitle });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Títulos dos Membros</CardTitle>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <UserPlus className="h-4 w-4 mr-2" />
              Atribuir Título
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Atribuir Título a Membro</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Buscar Usuário</Label>
                <Input
                  placeholder="Digite o nome do usuário..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Selecione um usuário" />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles?.map((profile) => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {profile.full_name || profile.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Título</Label>
                <Select value={selectedTitle} onValueChange={setSelectedTitle}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um título" />
                  </SelectTrigger>
                  <SelectContent>
                    {titles?.map((title) => (
                      <SelectItem key={title.id} value={title.id}>
                        {title.icon} {title.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAssign} className="w-full" disabled={!selectedUser || !selectedTitle}>
                Atribuir Título
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {userTitles?.map((ut: any) => (
            <div
              key={ut.id}
              className="flex items-center justify-between p-3 rounded-lg border"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={ut.profiles?.avatar_url || ""} />
                  <AvatarFallback>
                    {ut.profiles?.full_name?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium">{ut.profiles?.full_name}</span>
                <Badge
                  style={{ backgroundColor: ut.community_titles?.color }}
                  className="text-white"
                >
                  {ut.community_titles?.icon} {ut.community_titles?.name}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeMutation.mutate(ut.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {!userTitles?.length && (
            <p className="text-center text-muted-foreground py-4">
              Nenhum título atribuído ainda
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};