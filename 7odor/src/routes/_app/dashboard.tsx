import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Users, TrendingUp, FileText, Building2, Layers, Loader2, Trash2
} from "lucide-react";
import { useAuth } from "@/lib/store";
import { StatCard } from "@/components/stat-card";
import { PageHeader } from "@/components/page-header";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
  CartesianGrid, PieChart, Pie, Cell, BarChart, Bar, Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { statsApi, type AdminStats, type SchoolStats, studentsApi } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/dashboard")({
  component: DashboardPage,
});

const COLORS = [
  "oklch(0.6 0.22 270)",
  "oklch(0.7 0.16 200)",
  "oklch(0.65 0.18 155)",
  "oklch(0.75 0.17 75)",
  "oklch(0.65 0.22 25)",
];

function isAdminStats(s: AdminStats | SchoolStats): s is AdminStats {
  return "total_schools" in s;
}

function DashboardPage() {
  const user    = useAuth((s) => s.user);
  const isAdmin = user?.role === "admin";

  const [stats, setStats]     = useState<AdminStats | SchoolStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  const fetchStats = () => {
    setLoading(true);
    statsApi
      .get()
      .then(setStats)
      .catch(() => toast.error("فشل تحميل الإحصائيات"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleReset = async () => {
    setResetting(true);
    try {
      await studentsApi.resetStatus();
      toast.success("تم حذف جميع سجلات الحضور بنجاح");
      setResetOpen(false);
      fetchStats();
    } catch (e) {
      toast.error("حدث خطأ أثناء حذف الحضور");
    } finally {
      setResetting(false);
    }
  };

  const adminCards = stats && isAdminStats(stats)
    ? [
        { title: "إجمالي المراكز",   value: String(stats.total_schools),  delta: "مركز امتحاني",          icon: Building2, tint: "primary"     as any },
        { title: "إجمالي المترشحين", value: String(stats.total_students), delta: "في كل المراكز",         icon: Users,     tint: "primary"     as any },
        { title: "نسبة إنجاز الحضور", value: `${stats.completion_rate}%`, delta: "من إجمالي المترشحين",   icon: FileText,  tint: stats.completion_rate === 100 ? "success" : "warning" as any },
        { title: "المستويات المتاحة", value: String(stats.by_level.length), delta: "مستوى مختلف",         icon: Layers,    tint: "success"     as any },
      ]
    : [];

  /* ─── School stat cards ─── */
  const schoolCards = stats && !isAdminStats(stats)
    ? [
        { title: "إجمالي المترشحين",  value: String((stats as SchoolStats).total_students), delta: "في مركزك",            icon: Users,     tint: "primary"     as any },
        { title: "المستويات",          value: String((stats as SchoolStats).by_level.length), delta: "مستوى دراسي",       icon: Layers,    tint: "success"     as any },
        { title: "الفيليرات",          value: String((stats as SchoolStats).by_filiere.length), delta: "تخصص مختلف",     icon: FileText,  tint: "warning"     as any },
        { title: "القاعات",            value: String((stats as SchoolStats).by_salle.length), delta: "قاعة امتحانية",    icon: TrendingUp, tint: "primary"    as any },
      ]
    : [];

  const cards = isAdmin ? adminCards : schoolCards;

  /* ─── Pie data (by level) ─── */
  const pieDataRaw = stats ? (isAdminStats(stats) ? stats.by_level : (stats as SchoolStats).by_level) : [];
  const pieMap = new Map<string, number>();
  pieDataRaw.forEach(l => {
    const key = l.NIVEAU || "غير محدد";
    pieMap.set(key, (pieMap.get(key) || 0) + l.cnt);
  });
  const pieData = Array.from(pieMap.entries()).map(([name, value]) => ({ name, value }));

  /* ─── Bar data ─── */
  const barData = stats && isAdminStats(stats)
    ? stats.by_school.slice(0, 8).map((s) => ({
        name: s.NOMCENTRE,
        students: s.student_count,
      }))
    : stats && !isAdminStats(stats)
    ? (stats as SchoolStats).by_salle.map((s) => ({
        name: `قاعة ${s.NSALLE}`,
        students: s.cnt,
      }))
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="size-10 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={isAdmin ? "اللوحة العامة" : "لوحة التحكم"}
        subtitle={
          isAdmin
            ? "نظرة شاملة على جميع المراكز الامتحانية"
            : `مرحباً — ${user?.NOMCENTRE ?? ""} (${user?.NCENTRE ?? ""})`
        }
        actions={
          isAdmin ? (
            <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="shadow-glow">
                  <Trash2 className="size-4 ml-2" /> حذف الحضور
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>تأكيد حذف الحضور</AlertDialogTitle>
                  <AlertDialogDescription>
                    هل أنت متأكد من حذف وإعادة ضبط الحضور لجميع المراكز؟ سيتم إعادة جميع الحالات إلى "غير محدد" (unmarked). هذا الإجراء لا يمكن التراجع عنه.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleReset}
                    disabled={resetting}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    {resetting ? <Loader2 className="size-4 animate-spin ml-1" /> : null}
                    تأكيد الحذف
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : undefined
        }
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map((s, i) => (
          <StatCard key={s.title} {...s} index={i} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Levels distribution pie */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-1"
        >
          <Card className="glass h-full">
            <CardHeader>
              <CardTitle className="text-base">توزيع المترشحين حسب المستوى</CardTitle>
            </CardHeader>
            <CardContent>
              {pieData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={4}
                      >
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "var(--color-popover)",
                          border: "1px solid var(--color-border)",
                          borderRadius: "12px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-col gap-1.5 mt-2">
                    {pieData.map((d, i) => (
                      <div key={d.name} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5">
                          <span
                            className="size-2.5 rounded-full"
                            style={{ background: COLORS[i % COLORS.length] }}
                          />
                          {d.name}
                        </span>
                        <span className="font-semibold">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-center text-muted-foreground py-10">لا توجد بيانات</p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Bar chart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="lg:col-span-2"
        >
          <Card className="glass h-full">
            <CardHeader>
              <CardTitle className="text-base">
                {isAdmin ? "عدد المترشحين لكل مركز" : "توزيع المترشحين حسب القاعة"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {barData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={barData} margin={{ top: 10, right: 0, bottom: 30, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis
                      dataKey="name"
                      stroke="var(--color-muted-foreground)"
                      fontSize={10}
                      angle={-30}
                      textAnchor="end"
                      reversed
                    />
                    <YAxis
                      stroke="var(--color-muted-foreground)"
                      fontSize={12}
                      orientation="right"
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--color-popover)",
                        border: "1px solid var(--color-border)",
                        borderRadius: "12px",
                      }}
                    />
                    <Legend />
                    <Bar
                      dataKey="students"
                      name="عدد المترشحين"
                      fill="var(--color-primary)"
                      radius={[8, 8, 0, 0]}
                    >
                      {barData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[280px] text-muted-foreground">
                  لا توجد بيانات كافية
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* School: filiere breakdown table */}
      {!isAdmin && stats && (
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="glass">
            <CardHeader>
              <CardTitle className="text-base">توزيع المترشحين حسب التخصص (FILIERE)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-muted-foreground border-b">
                    <tr>
                      <th className="pb-2 text-right">التخصص</th>
                      <th className="pb-2 text-right">عدد المترشحين</th>
                      <th className="pb-2 text-right">النسبة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(stats as SchoolStats).by_filiere.map((f) => {
                      const pct = stats
                        ? Math.round((f.cnt / (stats as SchoolStats).total_students) * 100)
                        : 0;
                      return (
                        <tr key={f.FILIERE} className="border-t hover:bg-secondary/30">
                          <td className="py-2.5 font-medium">{f.FILIERE}</td>
                          <td className="py-2.5">{f.cnt}</td>
                          <td className="py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-secondary rounded-full h-1.5">
                                <div
                                  className="bg-primary h-1.5 rounded-full"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground w-8">{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Admin: schools table */}
      {isAdmin && stats && isAdminStats(stats) && (
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="glass">
            <CardHeader>
              <CardTitle className="text-base">تفاصيل المراكز الامتحانية</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-muted-foreground border-b">
                    <tr>
                      <th className="pb-2 text-right">رمز المركز</th>
                      <th className="pb-2 text-right">اسم المركز</th>
                      <th className="pb-2 text-right">عدد المترشحين</th>
                      <th className="pb-2 text-right">حاضر</th>
                      <th className="pb-2 text-right">غائب</th>
                      <th className="pb-2 text-right">نسبة الإنجاز</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.by_school.map((s) => {
                      const pct = s.total_rows > 0 ? Math.round((s.marked_rows / s.total_rows) * 100) : 0;
                      const presPct = s.student_count > 0 ? Math.round((s.present_count / s.student_count) * 100) : 0;
                      const absPct = s.student_count > 0 ? Math.round((s.absent_count / s.student_count) * 100) : 0;
                      
                      return (
                        <tr key={s.NCENTRE} className="border-t hover:bg-secondary/30">
                          <td className="py-2.5 font-mono text-xs">{s.NCENTRE}</td>
                          <td className="py-2.5 font-medium">{s.NOMCENTRE}</td>
                          <td className="py-2.5">{s.student_count}</td>
                          <td className="py-2.5">
                            <span className="text-success font-semibold">{s.present_count}</span>
                            {s.present_count > 0 && <span className="text-xs text-muted-foreground mr-1">({presPct}%)</span>}
                          </td>
                          <td className="py-2.5">
                            <span className="text-destructive font-semibold">{s.absent_count}</span>
                            {s.absent_count > 0 && <span className="text-xs text-muted-foreground mr-1">({absPct}%)</span>}
                          </td>
                          <td className="py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-secondary rounded-full h-1.5 w-24">
                                <div
                                  className={`${pct === 100 ? 'bg-success' : 'bg-primary'} h-1.5 rounded-full`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground w-8">{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass md:col-span-2 lg:col-span-3">
            <CardHeader>
              <CardTitle>تفاصيل الحضور حسب المستوى</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-right">
                  <thead className="text-muted-foreground border-b">
                    <tr>
                      <th className="pb-2 text-right">المستوى</th>
                      <th className="pb-2 text-right">الشعبة</th>
                      <th className="pb-2 text-right">عدد المترشحين</th>
                      <th className="pb-2 text-right">حاضر</th>
                      <th className="pb-2 text-right">غائب</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.by_level.map((l, i) => {
                      const presPct = l.cnt > 0 ? Math.round((l.present_count / l.cnt) * 100) : 0;
                      const absPct = l.cnt > 0 ? Math.round((l.absent_count / l.cnt) * 100) : 0;
                      
                      return (
                        <tr key={`${l.NIVEAU}-${l.FILIERE}-${i}`} className="border-t hover:bg-secondary/30">
                          <td className="py-2.5 font-medium">{l.NIVEAU || "غير محدد"}</td>
                          <td className="py-2.5 font-medium text-muted-foreground">{l.FILIERE || "جذع مشترك"}</td>
                          <td className="py-2.5">{l.cnt}</td>
                          <td className="py-2.5">
                            <span className="text-success font-semibold">{l.present_count}</span>
                            {l.present_count > 0 && <span className="text-xs text-muted-foreground mr-1">({presPct}%)</span>}
                          </td>
                          <td className="py-2.5">
                            <span className="text-destructive font-semibold">{l.absent_count}</span>
                            {l.absent_count > 0 && <span className="text-xs text-muted-foreground mr-1">({absPct}%)</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
