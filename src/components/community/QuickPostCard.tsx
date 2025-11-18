import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ImagePlus, Smile } from "lucide-react";
import { CreatePostDialog } from "./CreatePostDialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function QuickPostCard() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["current-user-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .single();

      return data;
    },
  });

  return (
    <>
      <Card className="border-2 hover:border-primary/20 transition-colors">
        <CardContent className="pt-4">
          <div className="flex gap-3">
            <Avatar className="h-10 w-10 border-2 border-primary/20">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {profile?.full_name?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 space-y-3">
              <button
                onClick={() => setIsDialogOpen(true)}
                className="w-full text-left px-4 py-3 rounded-full bg-muted hover:bg-muted/80 transition-colors text-muted-foreground"
              >
                No que você está pensando, {profile?.full_name?.split(" ")[0] || "trader"}?
              </button>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsDialogOpen(true)}
                  className="flex-1 gap-2 text-muted-foreground hover:text-primary"
                >
                  <ImagePlus className="h-4 w-4" />
                  Foto
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsDialogOpen(true)}
                  className="flex-1 gap-2 text-muted-foreground hover:text-primary"
                >
                  <Smile className="h-4 w-4" />
                  Análise
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <CreatePostDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </>
  );
}
