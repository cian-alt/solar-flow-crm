'use client';

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell, Search, ChevronDown, User, Settings, LogOut, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/ui/Avatar";
import { useUser } from "@/context/UserContext";

interface TopNavProps {
  onMenuToggle?: () => void;
}

export default function TopNav({ onMenuToggle }: TopNavProps) {
  const router = useRouter();
  const { profile } = useUser();
  const [unreadCount, setUnreadCount] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchUnreadCount = useCallback(async () => {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userData.user.id)
      .eq("read", false);

    setUnreadCount(count ?? 0);
  }, []);

  useEffect(() => {
    fetchUnreadCount();

    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      const userId = data.user?.id;
      if (!userId) return;

      const channel = supabase
        .channel("topnav-notifications")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          () => {
            fetchUnreadCount();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    });
  }, [fetchUnreadCount]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <header className="h-16 shrink-0 flex items-center justify-between px-4 md:px-6 border-b border-white/50 bg-white/40 backdrop-blur-md z-10">
      {/* Left: mobile hamburger + search */}
      <div className="flex items-center gap-3 flex-1">
        {/* Mobile menu button */}
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="md:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
        )}

        {/* Search */}
        <button
          className="flex items-center gap-2.5 h-10 px-3.5 rounded-xl bg-white/60 backdrop-blur-sm border border-slate-200/80 text-slate-400 text-sm transition-all hover:border-slate-300 hover:bg-white/80 min-h-[44px] w-full max-w-sm"
          aria-label="Search"
          onClick={() => {
            // Global search modal — to be implemented
          }}
        >
          <Search size={16} className="shrink-0" />
          <span className="hidden sm:block truncate">
            Search leads, contacts, companies...
          </span>
          <span className="sm:hidden">Search...</span>
        </button>
      </div>

      {/* Right: notifications + user */}
      <div className="flex items-center gap-2 ml-4 shrink-0">
        {/* Notifications */}
        <Link
          href="/notifications"
          className="relative p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Link>

        {/* User dropdown */}
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setDropdownOpen((o) => !o)}
            className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 transition-colors min-h-[44px]"
            aria-expanded={dropdownOpen}
            aria-haspopup="menu"
          >
            <Avatar
              name={profile?.full_name ?? profile?.email}
              src={profile?.avatar_url}
              size="sm"
            />
            <ChevronDown
              size={14}
              className={cn(
                "text-slate-400 transition-transform duration-200 hidden sm:block",
                dropdownOpen && "rotate-180"
              )}
            />
          </button>

          {/* Dropdown menu */}
          {dropdownOpen && (
            <div
              className="absolute right-0 top-full mt-2 w-52 glass-card py-1 z-50"
              role="menu"
            >
              {/* User info */}
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-800 truncate">
                  {profile?.full_name ?? "Account"}
                </p>
                <p className="text-xs text-slate-500 truncate">{profile?.email ?? ""}</p>
              </div>

              <Link
                href="/settings/profile"
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors min-h-[44px]"
                role="menuitem"
                onClick={() => setDropdownOpen(false)}
              >
                <User size={16} className="text-slate-400" />
                Profile
              </Link>

              <Link
                href="/settings"
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors min-h-[44px]"
                role="menuitem"
                onClick={() => setDropdownOpen(false)}
              >
                <Settings size={16} className="text-slate-400" />
                Settings
              </Link>

              <div className="border-t border-slate-100 mt-1">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors min-h-[44px]"
                  role="menuitem"
                >
                  <LogOut size={16} />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
