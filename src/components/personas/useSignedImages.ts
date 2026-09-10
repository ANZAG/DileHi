import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Creates signed URLs for private "internal-files" paths.
 * Steckbrief-Bilder liegen im privaten Bucket, daher ist ein signierter Link nötig.
 */
export const useSignedImages = (paths: string[]) => {
  const key = [...paths].sort().join("|");
  const { data } = useQuery({
    queryKey: ["persona-signed-urls", key],
    enabled: paths.length > 0,
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from("internal-files")
        .createSignedUrls(paths, 60 * 60);
      if (error || !data) return {} as Record<string, string>;
      const map: Record<string, string> = {};
      data.forEach((item, i) => {
        if (item.signedUrl) map[paths[i]] = item.signedUrl;
      });
      return map;
    },
  });
  return data ?? {};
};
