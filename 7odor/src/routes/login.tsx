import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { GraduationCap, User, Lock, Loader2, ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const login = useAuth((s) => s.login);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error("يرجى إدخال اسم المستخدم وكلمة المرور");
      return;
    }
    setLoading(true);
    try {
      const user = await login(username, password);
      toast.success(`مرحباً بك — ${user.NOMCENTRE}`);
      navigate({ to: "/dashboard" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "فشل الاتصال بالخادم";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background bg-gradient-mesh px-4 py-10">
      {/* Floating shapes */}
      <div className="absolute inset-0 -z-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-gradient-primary opacity-20 blur-3xl"
            style={{
              width: 200 + i * 60,
              height: 200 + i * 60,
              top: `${(i * 17) % 80}%`,
              left: `${(i * 23) % 80}%`,
            }}
            animate={{
              x: [0, 40, -20, 0],
              y: [0, -30, 20, 0],
              scale: [1, 1.1, 0.95, 1],
            }}
            transition={{ duration: 18 + i * 2, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative w-full max-w-md"
      >
        <div className="glass rounded-3xl p-8 md:p-10 shadow-glow">
          <div className="flex flex-col items-center text-center mb-7">
            <motion.div
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="size-14 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow mb-4"
            >
              <GraduationCap className="size-7 text-primary-foreground" />
            </motion.div>
            <h1 className="text-2xl font-bold tracking-tight">مرحباً بعودتك</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              سجّل الدخول إلى منصة <span className="text-gradient font-semibold">حاضر</span>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username">اسم المستخدم</Label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="username"
                  type="text"
                  placeholder="أدخل اسم المستخدم"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pr-9 h-11 bg-background/60"
                  dir="ltr"
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">كلمة المرور</Label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-9 h-11 bg-background/60"
                  dir="ltr"
                  autoComplete="current-password"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox id="remember" defaultChecked />
                <span>تذكرني</span>
              </label>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-gradient-primary hover:opacity-90 shadow-glow text-base font-semibold"
            >
              {loading ? (
                <><Loader2 className="size-4 ml-2 animate-spin" /> جارٍ تسجيل الدخول</>
              ) : (
                <>تسجيل الدخول <ArrowLeft className="size-4 mr-2" /></>
              )}
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t text-center">
            <p className="text-xs text-muted-foreground">
              منصة حاضر — نظام إدارة حضور الامتحانات
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          © 2026 حاضر — منصة إدارة حضور الامتحانات
        </p>
      </motion.div>
    </div>
  );
}
