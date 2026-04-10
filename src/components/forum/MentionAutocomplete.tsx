import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface MentionAutocompleteProps {
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  value: string;
  onChange: (value: string) => void;
}

interface MemberOption {
  id: string;
  display_name: string;
}

const MentionAutocomplete = ({ textareaRef, value, onChange }: MentionAutocompleteProps) => {
  const [show, setShow] = useState(false);
  const [filter, setFilter] = useState("");
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [mentionStart, setMentionStart] = useState(-1);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: members = [] } = useQuery<MemberOption[]>({
    queryKey: ["forum-mention-members"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_member_directory");
      return (data || []).map((m: any) => ({ id: m.id, display_name: m.display_name }));
    },
    staleTime: 60000,
  });

  const filtered = filter
    ? members.filter(m => m.display_name.toLowerCase().includes(filter.toLowerCase())).slice(0, 8)
    : members.slice(0, 8);

  const insertMention = useCallback((name: string) => {
    if (mentionStart < 0) return;
    const ta = textareaRef.current;
    if (!ta) return;
    
    const cursorPos = ta.selectionStart;
    const before = value.slice(0, mentionStart);
    const after = value.slice(cursorPos);
    const newValue = before + `@${name} ` + after;
    onChange(newValue);
    setShow(false);
    
    // Set cursor after mention
    requestAnimationFrame(() => {
      const newPos = mentionStart + name.length + 2;
      ta.focus();
      ta.setSelectionRange(newPos, newPos);
    });
  }, [mentionStart, value, onChange, textareaRef]);

  // Listen for @ input
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;

    const handleInput = () => {
      const pos = ta.selectionStart;
      const text = ta.value;
      
      // Look backwards for @ that starts a mention
      let atPos = -1;
      for (let i = pos - 1; i >= 0; i--) {
        if (text[i] === "@") {
          // Make sure @ is at start or preceded by whitespace/newline
          if (i === 0 || /[\s\n]/.test(text[i - 1])) {
            atPos = i;
          }
          break;
        }
        if (/[\s\n]/.test(text[i]) && i < pos - 1) break;
      }

      if (atPos >= 0) {
        const query = text.slice(atPos + 1, pos);
        if (query.length <= 30 && !/\n/.test(query)) {
          setFilter(query);
          setMentionStart(atPos);
          setSelectedIndex(0);
          setShow(true);

          // Calculate position
          const rect = ta.getBoundingClientRect();
          const lineHeight = parseInt(getComputedStyle(ta).lineHeight) || 20;
          const lines = text.slice(0, atPos).split("\n");
          const lineNum = lines.length - 1;
          setPosition({
            top: lineNum * lineHeight + lineHeight + 4,
            left: 8,
          });
          return;
        }
      }

      setShow(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!show) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
      } else if (e.key === "Enter" || e.key === "Tab") {
        if (filtered.length > 0) {
          e.preventDefault();
          insertMention(filtered[selectedIndex]?.display_name || "");
        }
      } else if (e.key === "Escape") {
        setShow(false);
      }
    };

    ta.addEventListener("input", handleInput);
    ta.addEventListener("keydown", handleKeyDown);
    return () => {
      ta.removeEventListener("input", handleInput);
      ta.removeEventListener("keydown", handleKeyDown);
    };
  }, [textareaRef, show, filtered, selectedIndex, insertMention]);

  // Close on outside click
  useEffect(() => {
    if (!show) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShow(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [show]);

  if (!show || filtered.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="absolute z-50 bg-popover border rounded-md shadow-lg py-1 max-h-48 overflow-y-auto w-56"
      style={{ top: position.top, left: position.left }}
    >
      {filtered.map((member, idx) => (
        <button
          key={member.id}
          className={`w-full text-left px-3 py-1.5 text-sm hover:bg-accent transition-colors ${
            idx === selectedIndex ? "bg-accent text-accent-foreground" : "text-popover-foreground"
          }`}
          onMouseDown={(e) => {
            e.preventDefault();
            insertMention(member.display_name);
          }}
          onMouseEnter={() => setSelectedIndex(idx)}
        >
          @{member.display_name}
        </button>
      ))}
    </div>
  );
};

export default MentionAutocomplete;
