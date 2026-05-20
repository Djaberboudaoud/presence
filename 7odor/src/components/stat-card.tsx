import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  delta?: string;
  icon: LucideIcon;
  tint?: "primary" | "success" | "warning" | "destructive";
  index?: number;
}

const tints = {
  primary: "from-primary/15 to-primary-glow/10 text-primary",
  success: "from-success/15 to-success/5 text-success",
  warning: "from-warning/20 to-warning/5 text-warning",
  destructive: "from-destructive/15 to-destructive/5 text-destructive",
};

export function StatCard({ title, value, delta, icon: Icon, tint = "primary", index = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: "easeOut" }}
      className="glass rounded-2xl p-5 shadow-soft hover:shadow-glow transition-shadow"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">{value}</p>
          {delta && <p className="mt-1 text-xs text-success font-medium">{delta}</p>}
        </div>
        <div className={cn("rounded-xl p-3 bg-gradient-to-br", tints[tint])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </motion.div>
  );
}
