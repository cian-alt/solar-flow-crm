'use client';

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  BarChart3,
  UserCheck,
  Bell,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import SolarFlowLogo from "@/components/logo/SolarFlowLogo";
import Avatar from "@/components/ui/Avatar";
import { useUser } from "@/context/UserContext";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Leads", href: "/leads", icon: Users },
  { label: "Reports", href: "/reports", icon: BarChart3 },
];

const secondaryNavItems: NavItem[] = [
  { label: "Team", href: "/team", icon: UserCheck },
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Settings", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile } = useUser();
  const [unreadCount, setUnreadCount] = useState(0);

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
    let userId: string | null = null;

    supabase.auth.getUser().then(({ data }) => {
      userId = data.user?.id ?? null;
      if (!userId) return;

      const channel = supabase
        .channel("sidebar-notifications")
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

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <aside className="glass-sidebar hidden md:flex flex-col w-[260px] h-screen shrink-0 z-20">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-white/50">
        <SolarFlowLogo size={30} />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-1" aria-label="Main navigation">
        {/* Main group */}
        <p className="px-3 pb-1 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
          Main
        </p>
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={isActive(item.href)}
          />
        ))}

        {/* Team / Settings group */}
        <p className="px-3 pb-1 pt-4 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
          Team
        </p>
        {secondaryNavItems.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={isActive(item.href)}
            badge={item.href === "/notifications" && unreadCount > 0 ? unreadCount : undefined}
          />
        ))}
      </nav>

      {/* User profile + logout */}
      <div className="px-3 py-4 border-t border-white/50 space-y-1">
        <Link
          href="/settings/profile"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors group min-h-[44px]",
            "hover:bg-slate-100/70"
          )}
        >
          <Avatar
            name={profile?.full_name ?? profile?.email}
            src={profile?.avatar_url}
            size="sm"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-800 truncate leading-tight">
              {profile?.full_name ?? "Account"}
            </p>
            <p className="text-[11px] text-slate-500 truncate leading-tight capitalize">
              {profile?.role_title ?? profile?.role ?? ""}
            </p>
          </div>
        </Link>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors text-sm min-h-[44px]"
        >
          <LogOut size={16} />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}

function NavLink({
  item,
  active,
  badge,
}: {
  item: NavItem;
  active: boolean;
  badge?: number;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={cn(
        "relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 min-h-[44px] group",
        active
          ? "bg-[#1B3A6B] text-white shadow-sm"
          : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
      )}
    >
      <motion.span
        whileHover={{ scale: 1.1 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
        className="shrink-0"
      >
        <Icon size={18} />
      </motion.span>
      <span className="flex-1">{item.label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full text-[11px] font-semibold bg-red-500 text-white leading-none">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );
}
