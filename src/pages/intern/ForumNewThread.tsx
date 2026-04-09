import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ForumEditor from "@/components/forum/ForumEditor";
import { toast } from "@/hooks/use-toast";

const ForumNewThread = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const { data: category } = useQuery({
    queryKey: ["forum-category", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forum_categories")
        .select("*")
        .eq("slug", slug!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  const createThread = useMutation({
    mutationFn: async () => {
      if (!user || !category) return;
      const { data: thread, error: threadError } = await supabase
        .from("forum_threads")
        .insert({
          category_id: category.id,
          title: title.trim(),
          created_by: user.id,
        })
        .select()
        .single();
      if (threadError) throw threadError;

      const { error: postError } = await supabase
        .from("forum_posts")
        .insert({
          thread_id: thread.id,
          content: content.trim(),
          created_by: user.id,
        });
      if (postError) throw postError;

      return thread;
    },
    onSuccess: (thread) => {
      if (thread) navigate(`/intern/forum/thread/${thread.id}`, { replace: true });
    },
    onError: () => toast({ title: "Fehler", description: "Thema konnte nicht erstellt werden.", variant: "destructive" }),
  });

  if (!category) return null;

  return (
    <div className="container py-8 sm:py-12 max-w-2xl px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-4 mb-6">
          <Link to={`/intern/forum/${slug}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft size={16} /> {category.name}
          </Link>
          <h1 className="font-serif text-2xl font-bold">Neues Thema</h1>
        </div>

        <div className="space-y-4 border rounded-lg bg-card p-5">
          <div>
            <Label htmlFor="title">Titel</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Worum geht es?" className="mt-1" />
          </div>
          <div>
            <Label>Beitrag</Label>
            <div className="mt-1">
              <ForumEditor
                value={content}
                onChange={setContent}
                rows={8}
                showSubmitButton={false}
                placeholder="Schreibe deinen Beitrag…"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => createThread.mutate()} disabled={!title.trim() || !content.trim() || createThread.isPending}>
              Thema erstellen
            </Button>
            <Link to={`/intern/forum/${slug}`}>
              <Button variant="outline">Abbrechen</Button>
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ForumNewThread;
