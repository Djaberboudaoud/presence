import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, ClipboardCheck, Layers, FileText, BarChart3,
  FileSpreadsheet, Download, Users, Settings, Bell, User,
  Moon, Sun, LogOut, Search, Menu, X, GraduationCap, Building2,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth, useTheme } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { notifications } from "@/lib/mock-data";

const schoolNav = [
  { to: "/", label: "لوحة التحكم", icon: LayoutDashboard },
  { to: "/attendance", label: "إدارة الحضور", icon: ClipboardCheck },
  { to: "/levels", label: "المستويات", icon: Layers },
  { to: "/export", label: "تصدير Excel", icon: Download },
];

const adminNav = [
  { to: "/", label: "اللوحة العامة", icon: LayoutDashboard },
  { to: "/users", label: "إدارة المستخدمين", icon: Users },
  { to: "/export", label: "تصدير Excel", icon: Download },
];



export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const nav = user?.role === "admin" ? adminNav : schoolNav;
  const unread = notifications.filter((n) => n.unread).length;

  const handleLogout = () => {
    logout();
    navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen bg-background bg-gradient-mesh">
      {/* Sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      <aside
        className={cn(
          "fixed top-0 right-0 z-50 h-screen w-72 bg-sidebar border-l border-sidebar-border transition-transform duration-300 lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex h-16 items-center justify-between px-5 border-b border-sidebar-border">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
              <GraduationCap className="size-5 text-primary-foreground" />
            </div>
            <div>
              <p className="font-bold text-sidebar-foreground leading-tight">حاضر</p>
              <p className="text-[10px] text-muted-foreground leading-tight">منصة إدارة الحضور</p>
            </div>
          </Link>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(false)}>
            <X className="size-5" />
          </Button>
        </div>

        <nav className="px-3 py-4 space-y-0.5 overflow-y-auto h-[calc(100vh-4rem)] flex flex-col">
          <div className="space-y-0.5 flex-1">
            <p className="px-3 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">القائمة الرئيسية</p>
            {nav.map((item) => {
              const active = pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                    active
                      ? "bg-gradient-primary text-primary-foreground shadow-glow"
                      : "text-sidebar-foreground hover:bg-sidebar-accent"
                  )}
                >
                  <item.icon className="size-4.5 shrink-0" />
                  <span>{item.label}</span>
                  {active && (
                    <motion.div
                      layoutId="active-dot"
                      className="mr-auto size-1.5 rounded-full bg-primary-foreground"
                    />
                  )}
                </Link>
              );
            })}
          </div>


        </nav>
      </aside>

      {/* Main */}
      <div className="lg:pr-72">
        {/* Topbar */}
        <header className="sticky top-0 z-30 h-16 glass border-b flex items-center gap-3 px-4 md:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className="size-5" />
          </Button>

          <div className="relative flex-1 max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input placeholder="ابحث عن طالب، امتحان، مستوى..." className="pr-9 bg-background/50" />
          </div>

          <div className="flex items-center gap-1.5 mr-auto">
            <Button variant="ghost" size="icon" onClick={toggle} aria-label="تبديل المظهر">
              {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="size-5" />
                  {unread > 0 && (
                    <span className="absolute top-1.5 left-1.5 size-2 rounded-full bg-destructive ring-2 ring-background" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex items-center justify-between">
                  <span>الإشعارات</span>
                  <Badge variant="secondary">{unread} جديد</Badge>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.slice(0, 4).map((n) => (
                  <DropdownMenuItem key={n.id} className="flex-col items-start gap-0.5 py-2.5">
                    <div className="flex w-full items-center gap-2">
                      {n.unread && <span className="size-1.5 rounded-full bg-primary" />}
                      <p className="text-sm font-medium">{n.title}</p>
                      <span className="mr-auto text-[10px] text-muted-foreground">{n.time}</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">{n.body}</p>
                  </DropdownMenuItem>
                ))}
                  <span className="w-full text-center text-primary cursor-not-allowed">عرض كل الإشعارات</span>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 px-2">
                  <Avatar className="size-8">
                    <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xs font-semibold">
                      {user?.name?.charAt(0) ?? "م"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:block text-right">
                    <p className="text-xs font-semibold leading-tight">{user?.name}</p>
                    <p className="text-[10px] text-muted-foreground leading-tight">
                      {user?.role === "admin" ? "مدير عام" : (user as any)?.school}
                    </p>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>{user?.name}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {user?.role === "admin" && (
                  <DropdownMenuItem><Building2 className="size-4 ml-2" /> المؤسسات</DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                  <LogOut className="size-4 ml-2" /> تسجيل الخروج
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
