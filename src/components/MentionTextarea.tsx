import React, { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Check, AtSign, Search, User } from "lucide-react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { motion, AnimatePresence } from "framer-motion";

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
  const [virtualElement, setVirtualElement] = useState<{ getBoundingClientRect: () => DOMRect } | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const editorRef = useRef<HTMLDivElement>(null);
  const savedRange = useRef<Range | null>(null);
  const isInternalUpdate = useRef(false);

  // Convert raw string with mentions to HTML for editor
  const rawToHtml = (text: string) => {
    if (!text) return "";
    return text
      .split("\n")
      .map(line => {
        // Escape HTML
        const escaped = line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        return escaped.replace(/@\[([^\]]+)\]\(([a-f0-9-]{36})\)/g, (match, name, id) => {
          return `<span class="mention" data-id="${id}" contenteditable="false">@${name}<span class="mention-delete" data-action="delete">×</span></span>`;
        });
      })
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
      // Text content might include the '×' so we only take the name part
      const fullText = mention.textContent || "";
      const name = fullText.startsWith("@") ? fullText.substring(1, fullText.length - 1) : fullText.substring(0, fullText.length - 1); 
      const raw = `@[${name}](${id})`;
      mention.replaceWith(document.createTextNode(raw));
    });

    let text = tempDiv.innerText || "";
    return text.replace(/\u00A0/g, " ").trimEnd();
  };

  // Sync internal HTML state with external value
  useEffect(() => {
    if (isInternalUpdate.current) {
      const timeout = setTimeout(() => {
        isInternalUpdate.current = false;
      }, 50);
      return () => clearTimeout(timeout);
    }
    if (editorRef.current) {
      const currentRaw = htmlToRaw(editorRef.current.innerHTML);
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
    
    isInternalUpdate.current = true;
    onChange(raw);

    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    savedRange.current = range.cloneRange();
    
    const textBeforeCursor = range.startContainer.textContent?.substring(0, range.startOffset) || "";
    const lastAtSymbol = textBeforeCursor.lastIndexOf("@");

    if (lastAtSymbol !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtSymbol + 1);
      const charBeforeAt = lastAtSymbol > 0 ? textBeforeCursor[lastAtSymbol - 1] : null;
      const isStartOrAfterSpace = lastAtSymbol === 0 || 
                                  charBeforeAt === " " || 
                                  charBeforeAt === "\u00A0" || 
                                  (charBeforeAt && charBeforeAt.charCodeAt(0) === 160);
      
      if (isStartOrAfterSpace && !textAfterAt.includes(" ")) {
        setQuery(textAfterAt);
        setOpen(true);
        setSelectedIndex(0);
        
        const rect = range.getBoundingClientRect();
        setVirtualElement({
          getBoundingClientRect: () => rect,
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
      isInternalUpdate.current = true;
      try {
        range.setStart(textNode, lastAtSymbol);
        range.setEnd(textNode, offset);
        range.deleteContents();

        const mentionSpan = document.createElement("span");
        mentionSpan.className = "mention";
        mentionSpan.setAttribute("data-id", user.user_id);
        mentionSpan.setAttribute("contenteditable", "false");
        mentionSpan.innerHTML = `@${user.social_name}<span class="mention-delete" data-action="delete">×</span>`;
        
        const spaceNode = document.createTextNode("\u00A0"); 
        range.insertNode(spaceNode);
        range.insertNode(mentionSpan);

        const newRange = document.createRange();
        newRange.setStartAfter(spaceNode);
        newRange.collapse(true);
        
        const sel = window.getSelection();
        if (sel) {
          sel.removeAllRanges();
          sel.addRange(newRange);
        }

        editorRef.current.focus();
      } catch (err) {
        console.error("Error inserting mention:", err);
      } finally {
        setOpen(false);
        savedRange.current = null;
        // Update raw value directly without re-triggering suggestion logic
        if (editorRef.current) {
          const raw = htmlToRaw(editorRef.current.innerHTML);
          isInternalUpdate.current = true;
          onChange(raw);
        }
      }
    }
  };

  const filteredUsers = users.filter(user => 
    user.social_name.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 6);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (open && filteredUsers.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex(i => (i + 1) % filteredUsers.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(i => (i - 1 + filteredUsers.length) % filteredUsers.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        selectUser(filteredUsers[selectedIndex]);
        return;
      }
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
    }
    if (onKeyDown) onKeyDown(e as any);
  };

  const handleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.dataset.action === "delete") {
      const mention = target.closest(".mention");
      if (mention) {
        mention.remove();
        if (editorRef.current) {
          const raw = htmlToRaw(editorRef.current.innerHTML);
          isInternalUpdate.current = true;
          onChange(raw);
        }
      }
    }
  };

  return (
    <div className={cn("relative group w-full", className)}>
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onClick={handleClick}
        spellCheck={false}
        className="w-full min-h-[50px] px-4 py-3 text-sm focus:outline-none overflow-y-auto transition-all duration-200 bg-white/50 hover:bg-white focus:bg-white rounded-xl border border-transparent focus:border-primary/20"
        data-placeholder={placeholder}
        style={{ 
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          display: "block"
        }}
      />

      <PopoverPrimitive.Root open={open}>
        {virtualElement && (
          <PopoverPrimitive.Anchor 
            virtualRef={{ current: virtualElement }} 
          />
        )}
        <PopoverPrimitive.Portal forceMount>
          <AnimatePresence>
            {open && (
              <PopoverPrimitive.Content 
                forceMount
                side="bottom" 
                align="start" 
                sideOffset={8}
                onOpenAutoFocus={(e) => e.preventDefault()}
                onCloseAutoFocus={(e) => e.preventDefault()}
                onPointerDownOutside={(e) => {
                    if (editorRef.current?.contains(e.target as Node)) {
                        return;
                    }
                    setOpen(false);
                }}
                className="z-[100] outline-none"
                style={{ pointerEvents: open ? 'auto' : 'none' }}
              >
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 5, scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  className="w-72 bg-white/80 backdrop-blur-2xl border border-white/40 rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] overflow-hidden ring-1 ring-black/5"
                >
                  <div className="bg-gradient-to-r from-primary/5 via-primary/[0.02] to-transparent px-4 py-3 border-b border-gray-100/50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <AtSign className="w-3 h-3 text-primary animate-pulse" />
                        <span className="text-[10px] font-black text-primary uppercase tracking-[0.15em]">Söz Bizde</span>
                    </div>
                    {query && (
                        <div className="flex items-center gap-1 opacity-40">
                            <Search className="w-2.5 h-2.5" />
                            <span className="text-[9px] font-bold">"{query}"</span>
                        </div>
                    )}
                  </div>
                  
                  <div className="py-1.5 px-1.5 max-h-[300px] overflow-y-auto scrollbar-hide">
                    {filteredUsers.length === 0 ? (
                      <div className="py-8 px-4 text-center">
                        <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                            <User className="w-5 h-5 text-gray-300" />
                        </div>
                        <p className="text-[11px] font-medium text-gray-400">Aradığın kullanıcı buralarda değil gibi...</p>
                      </div>
                    ) : (
                      filteredUsers.map((user, index) => (
                        <div
                          key={user.user_id}
                          onClick={() => selectUser(user)}
                          onMouseEnter={() => setSelectedIndex(index)}
                          className={cn(
                            "group/item relative flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-all duration-200 rounded-xl",
                            selectedIndex === index 
                             ? "bg-primary shadow-lg shadow-primary/30 scale-[1.02]" 
                             : "hover:bg-gray-50/80 text-gray-700"
                          )}
                        >
                          <div className="relative shrink-0">
                            <Avatar className={cn(
                              "h-9 w-9 border-2 transition-transform duration-300",
                              selectedIndex === index ? "border-white/40 scale-105" : "border-gray-100 group-hover/item:scale-105"
                            )}>
                              <AvatarImage src={user.profile_photo || undefined} />
                              <AvatarFallback className={cn(
                                "text-xs font-black",
                                selectedIndex === index ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                              )}>
                                {user.social_name.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            {selectedIndex === index && (
                                <motion.div 
                                    layoutId="active-dot"
                                    className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 border-2 border-primary rounded-full" 
                                />
                            )}
                          </div>
                          <div className="flex flex-col text-left min-w-0 flex-1">
                            <span className={cn(
                              "text-[13px] font-bold leading-tight truncate transition-colors",
                              selectedIndex === index ? "text-white" : "text-gray-800"
                            )}>
                              {user.social_name}
                            </span>
                            <span className={cn(
                              "text-[10px] font-semibold truncate transition-colors mt-0.5",
                              selectedIndex === index ? "text-white/70" : "text-gray-400"
                            )}>
                              @{user.social_name.toLowerCase().replace(/\s+/g, '')}
                            </span>
                          </div>
                          <AnimatePresence>
                            {selectedIndex === index && (
                                <motion.div 
                                    initial={{ opacity: 0, x: -5 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="ml-auto"
                                >
                                    <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/20">
                                        <Check className="w-3 h-3 text-white" />
                                    </div>
                                </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="px-4 py-2 border-t border-gray-100/50 bg-gray-50/30 flex justify-between items-center">
                    <span className="text-[8px] font-bold text-gray-400">YÖNLENDİR: ↓↑</span>
                    <span className="text-[8px] font-bold text-gray-400">SEÇ: ENTER</span>
                  </div>
                </motion.div>
              </PopoverPrimitive.Content>
            )}
          </AnimatePresence>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>

      <style>
        {`
          [contenteditable][data-placeholder]:empty:before {
            content: attr(data-placeholder);
            color: #94a3b8;
            cursor: text;
          }
          .mention {
            display: inline-flex;
            align-items: center;
            background: linear-gradient(135deg, hsl(var(--primary) / 0.15) 0%, hsl(var(--primary) / 0.05) 100%);
            color: hsl(var(--primary));
            padding: 1px 4px 1px 10px;
            border-radius: 20px;
            margin: 0 4px;
            font-weight: 800;
            font-size: 0.95em;
            white-space: nowrap;
            pointer-events: auto;
            unicode-bidi: isolate;
            border: 1px solid hsl(var(--primary) / 0.2);
            box-shadow: 0 2px 4px -1px hsl(var(--primary) / 0.1);
            transition: all 0.2s ease;
            gap: 4px;
          }
          .mention-delete {
            width: 16px;
            height: 16px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-center: center;
            background: hsl(var(--primary) / 0.1);
            color: hsl(var(--primary));
            font-size: 14px;
            line-height: 1;
            cursor: pointer;
            transition: all 0.2s ease;
            user-select: none;
            flex-shrink: 0;
            padding-bottom: 2px;
          }
          .mention-delete:hover {
            background: hsl(var(--primary));
            color: white;
            box-shadow: 0 4px 12px -2px hsl(var(--primary) / 0.3);
          }
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
          .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}
      </style>
    </div>
  );
}
