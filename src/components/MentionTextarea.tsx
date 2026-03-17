import React, { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

interface UserSuggestion {
  user_id: string;
  social_name: string;
  profile_photo: string | null;
}

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
}

export function MentionTextarea({
  value,
  onChange,
  placeholder,
  className,
  onKeyDown,
}: MentionTextareaProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<UserSuggestion[]>([]);
  const [popoverCoords, setPopoverCoords] = useState({ top: 0, left: 0 });
  const editorRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const savedRange = useRef<Range | null>(null);

  // Convert raw string with mentions to HTML for editor
  const rawToHtml = (text: string) => {
    if (!text) return "";
    return text
      .split("\n")
      .map(line => line.replace(/@\[([^\]]+)\]\(([a-f0-9-]{36})\)/g, (match, name, id) => {
        return `<span class="mention text-primary font-bold" data-id="${id}" contenteditable="false">@${name}</span>`;
      }))
      .join("<br>");
  };

  // Convert editor HTML back to raw string with mentions
  const htmlToRaw = (html: string) => {
    if (!html || html === "<br>") return "";
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;
    
    // Replace mention spans with raw format
    const mentions = tempDiv.querySelectorAll(".mention");
    mentions.forEach((mention) => {
      const id = mention.getAttribute("data-id");
      const name = mention.textContent?.substring(1); // remove @
      const raw = `@[${name}](${id})`;
      mention.replaceWith(document.createTextNode(raw));
    });

    // innerText handles <br> and blocks (div/p) as newlines correctly
    let text = tempDiv.innerText || "";
    // Clean up trailing invisible characters browsers sometimes add
    return text.replace(/\u00A0/g, " ").trimEnd();
  };

  // Sync internal HTML state with external value only when significantly different (e.g. cleared or externally set)
  useEffect(() => {
    if (editorRef.current) {
      const currentRaw = htmlToRaw(editorRef.current.innerHTML);
      // We only update if the external value is actually different from what we'd generate
      // This prevents the cursor from jumping during regular typing
      if (value !== currentRaw) {
        editorRef.current.innerHTML = rawToHtml(value);
      }
    }
  }, [value]);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from("social_profiles")
        .select("user_id, social_name, profile_photo")
        .limit(50);
      
      if (error) {
        console.error("Error fetching users for mentions:", error);
        return;
      }
      setUsers(data as UserSuggestion[]);
    };
    fetchUsers();
  }, []);

  const handleInput = () => {
    if (!editorRef.current) return;
    
    const html = editorRef.current.innerHTML;
    const raw = htmlToRaw(html);
    onChange(raw);

    // Mention Trigger Logic
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    savedRange.current = range.cloneRange();
    const textBeforeCursor = range.startContainer.textContent?.substring(0, range.startOffset) || "";
    const lastAtSymbol = textBeforeCursor.lastIndexOf("@");

    if (lastAtSymbol !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtSymbol + 1);
      const isStartOrAfterSpace = lastAtSymbol === 0 || textBeforeCursor[lastAtSymbol - 1] === " " || textBeforeCursor[lastAtSymbol - 1].charCodeAt(0) === 160;
      
      if (isStartOrAfterSpace && !textAfterAt.includes(" ")) {
        setQuery(textAfterAt);
        setOpen(true);
        
        // Position dropdown
        const rect = range.getBoundingClientRect();
        const editorRect = editorRef.current.getBoundingClientRect();
        setPopoverCoords({
          top: rect.bottom - editorRect.top,
          left: rect.left - editorRect.left,
        });
      } else {
        setOpen(false);
      }
    } else {
      setOpen(false);
    }
  };

  const selectUser = (user: UserSuggestion) => {
    if (!editorRef.current) return;

    const selection = window.getSelection();
    let range = savedRange.current;

    if (!range && selection && selection.rangeCount > 0) {
      range = selection.getRangeAt(0);
    }

    if (!range) return;
    const textNode = range.startContainer;
    const offset = range.startOffset;
    const textContent = textNode.textContent || "";
    const lastAtSymbol = textContent.lastIndexOf("@", offset - 1);

    if (lastAtSymbol !== -1) {
      try {
        // Use the range to replace the @query part
        range.setStart(textNode, lastAtSymbol);
        range.setEnd(textNode, offset);
        range.deleteContents();

        // Create mention element
        const mentionSpan = document.createElement("span");
        mentionSpan.className = "mention text-primary font-bold";
        mentionSpan.setAttribute("data-id", user.user_id);
        mentionSpan.setAttribute("contenteditable", "false");
        mentionSpan.textContent = `@${user.social_name}`;
        
        // Insert mention and a space after it
        const spaceNode = document.createTextNode("\u00A0"); // Non-breaking space
        
        range.insertNode(spaceNode);
        range.insertNode(mentionSpan);

        // Position cursor after the space
        const newRange = document.createRange();
        newRange.setStartAfter(spaceNode);
        newRange.collapse(true);
        
        const sel = window.getSelection();
        if (sel) {
          sel.removeAllRanges();
          sel.addRange(newRange);
        }

        // Essential for mobile to keep the keyboard open
        if (editorRef.current) {
          editorRef.current.focus();
        }
      } catch (err) {
        console.error("Error inserting mention:", err);
      } finally {
        setOpen(false);
        savedRange.current = null;
        // Small delay to ensure state updates before updating raw value
        setTimeout(() => handleInput(), 10);
      }
    }
  };

  const filteredUsers = users.filter(user => 
    user.social_name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className={cn("relative", className)}>
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onKeyDown={(e) => {
          if (onKeyDown) onKeyDown(e as any);
        }}
        className="w-full min-h-[40px] px-3 py-2 text-sm focus:outline-none overflow-y-auto"
        data-placeholder={placeholder}
        style={{ 
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          display: "block" // Ensure it's not flex
        }}
      />
      
      {open && (
        <div 
          ref={dropdownRef}
          onMouseDown={(e) => e.preventDefault()} // Prevent focus loss
          className="absolute z-[100] w-64 bg-white border border-gray-100 rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          style={{ 
            top: popoverCoords.top + 8, 
            left: Math.min(popoverCoords.left, (editorRef.current?.offsetWidth || 0) - 256) 
          }}
        >
          <div className="bg-gray-50/50 px-3 py-2 border-b border-gray-100">
            <span className="text-[10px] font-black text-primary uppercase tracking-widest">Kullanıcı Etiketle</span>
          </div>
          <Command className="w-full bg-transparent">
            <CommandList className="max-h-[200px] overflow-y-auto">
              <CommandEmpty className="p-4 text-xs text-gray-400 text-center">Kullanıcı bulunamadı</CommandEmpty>
              <CommandGroup>
                {filteredUsers.map((user) => (
                  <CommandItem
                    key={user.user_id}
                    onSelect={() => selectUser(user)}
                    onPointerDown={(e) => {
                      // Prevent focus loss on mobile
                      e.preventDefault();
                      selectUser(user);
                    }}
                    className="flex items-center gap-2.5 p-2.5 cursor-pointer hover:bg-gray-100 aria-selected:bg-primary/5 transition-colors"
                  >
                    <div className="relative">
                      <Avatar className="h-8 w-8 border border-gray-200">
                        <AvatarImage src={user.profile_photo || undefined} />
                        <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                          {user.social_name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-sm font-bold text-gray-700 leading-none mb-1">{user.social_name}</span>
                      <span className="text-[10px] text-gray-400 font-medium">@{user.social_name.toLowerCase().replace(/\s+/g, '')}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      )}

      <style>
        {`
          [contenteditable][data-placeholder]:empty:before {
            content: attr(data-placeholder);
            color: #94a3b8;
            cursor: text;
          }
          .mention {
            display: inline-block;
            background: #e0f2fe;
            color: #0284c7;
            padding: 0 6px;
            border-radius: 6px;
            margin: 0 2px;
            font-weight: 700;
            white-space: nowrap;
            pointer-events: none;
            unicode-bidi: isolate;
          }
        `}
      </style>
    </div>
  );
}
