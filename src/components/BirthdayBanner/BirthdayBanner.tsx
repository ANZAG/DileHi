import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Cake, X } from "lucide-react";
import { useState } from "react";

interface BirthdayEntry {
  display_name: string;
  daysUntil: number; // 0 = today
}

function getBirthdayEntries(
  profiles: Array<{ display_name: string; birthdate: string | null }>,
  windowDays = 7
): BirthdayEntry[] {
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  return profiles
    .filter((p) => !!p.birthdate)
    .map((p) => {
      const bd = new Date(p.birthdate!);
      const thisYear = new Date(today.getFullYear(), bd.getMonth(), bd.getDate());
      const diff = Math.round(
        (thisYear.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24)
      );
      // If already past, look to next year
      const daysUntil = diff < 0 ? diff + 365 : diff;
      return { display_name: p.display_name, daysUntil };
    })
    .filter((e) => e.daysUntil <= windowDays)
    .sort((a, b) => a.daysUntil - b.daysUntil);
}

const BirthdayBanner = () => {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  const { data: entries = [] } = useQuery({
    queryKey: ["birthday-check"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, birthdate")
        .eq("is_active", true)
        .not("birthdate", "is", null);
      return getBirthdayEntries(data ?? []);
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 60, // 1h
  });

  if (dismissed || entries.length === 0) return null;

  const today = entries.filter((e) => e.daysUntil === 0);
  const upcoming = entries.filter((e) => e.daysUntil > 0);

  return (
    <div
      role="banner"
      className="relative rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 px-4 py-3 text-sm"
    >
      <button
        onClick={() => setDismissed(true)}
        aria-label="Geburtstags-Banner schließen"
        className="absolute top-2 right-2 p-1 rounded hover:bg-amber-200 dark:hover:bg-amber-800 transition-colors"
      >
        <X size={14} className="text-amber-700 dark:text-amber-300" />
      </button>

      <div className="flex flex-col gap-1.5 pr-6">
        {today.length > 0 && (
          <div className="flex items-start gap-2">
            <Cake size={16} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <p className="font-semibold text-amber-800 dark:text-amber-200">
              {today.length === 1 ? (
                <>🎉 Heute hat <span className="font-bold">{today[0].display_name}</span> Geburtstag!</>
              ) : (
                <>
                  🎉 Heute haben{" "}
                  {today.map((e, i) => (
                    <span key={e.display_name}>
                      {i > 0 && (i === today.length - 1 ? " und " : ", ")}
                      <span className="font-bold">{e.display_name}</span>
                    </span>
                  ))}{" "}
                  Geburtstag!
                </>
              )}
            </p>
          </div>
        )}

        {upcoming.length > 0 && (
          <div className="flex items-start gap-2">
            <Cake
              size={16}
              className="text-amber-500 dark:text-amber-500 mt-0.5 shrink-0 opacity-70"
            />
            <p className="text-amber-700 dark:text-amber-300">
              <span className="font-medium">Demnächst: </span>
              {upcoming.map((e, i) => (
                <span key={e.display_name}>
                  {i > 0 && ", "}
                  <span className="font-medium">{e.display_name}</span>{" "}
                  <span className="text-amber-500 dark:text-amber-400 text-xs">
                    (in {e.daysUntil} {e.daysUntil === 1 ? "Tag" : "Tagen"})
                  </span>
                </span>
              ))}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BirthdayBanner;
