import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Search, CheckCircle2, XCircle, Save, Loader2, Users, RefreshCw,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/store";
import { studentsApi, levelsApi, type ApiStudent } from "@/lib/api";

export const Route = createFileRoute("/_app/attendance")({
  component: AttendancePage,
});

interface StudentWithStatus extends ApiStudent {
  status: "present" | "absent";
}

function AttendancePage() {
  const user = useAuth((s) => s.user);

  const [levels, setLevels]           = useState<string[]>([]);
  const [filieres, setFilieres]       = useState<string[]>([]);
  const [matieres, setMatieres]       = useState<string[]>([]);
  const [students, setStudents]       = useState<StudentWithStatus[]>([]);
  const [levelId, setLevelId]         = useState<string>("");
  const [filiereId, setFiliereId]     = useState<string>("");
  const [matiereId, setMatiereId]     = useState<string>("");
  const [query, setQuery]             = useState("");
  const [selected, setSelected]       = useState<Set<string>>(new Set());
  const [saving, setSaving]           = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Load levels on mount
  useEffect(() => {
    levelsApi.list().then((data) => {
      setLevels(data);
      if (data.length > 0) setLevelId(data[0]);
    }).catch(() => toast.error("فشل تحميل المستويات"));
  }, []);

  // Load filieres when level changes
  useEffect(() => {
    if (!levelId) return;
    setFiliereId("");
    setMatiereId("");
    levelsApi.filieres(levelId).then(setFilieres).catch(() => setFilieres([]));
  }, [levelId]);

  // Load matieres when filiere changes
  useEffect(() => {
    if (!levelId) return;
    setMatiereId("");
    levelsApi.matieres(levelId, filiereId || undefined).then(setMatieres).catch(() => setMatieres([]));
  }, [levelId, filiereId]);

  // Load students when matiere changes (or level/filiere)
  useEffect(() => {
    if (!levelId) return;
    setLoadingStudents(true);
    setSelected(new Set());
    studentsApi.list({
      niveau: levelId,
      filiere: filiereId || undefined,
      matiere: matiereId || undefined,
    }).then((data) => {
      setStudents(
        data.map((s) => ({ ...s, status: (s.status === "غائب" ? "absent" : "present") }))
      );
    }).catch(() => toast.error("فشل تحميل الطلاب"))
      .finally(() => setLoadingStudents(false));
  }, [levelId, filiereId, matiereId]);

  const filtered = useMemo(() =>
    students.filter(
      (s) =>
        s.NOM.includes(query) ||
        s.PRENOM.includes(query) ||
        s.ID.includes(query) ||
        (s.NSALLE ?? "").includes(query)
    ),
    [students, query]
  );

  const presentCount = students.filter((s) => s.status === "present").length;
  const absentCount  = students.length - presentCount;

  const toggleStatus = (id: string) =>
    setStudents((prev) =>
      prev.map((s) =>
        s.ID === id ? { ...s, status: s.status === "present" ? "absent" : "present" } : s
      )
    );

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((s) => s.ID)));
  };

  const bulkMark = (status: "present" | "absent") => {
    if (selected.size === 0) { toast.warning("اختر طلاباً أولاً"); return; }
    setStudents((prev) =>
      prev.map((s) => selected.has(s.ID) ? { ...s, status } : s)
    );
    toast.success(`تم تحديث ${selected.size} طالب`);
    setSelected(new Set());
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Loop over students and update status if modified
      const promises = students.map(s => 
        studentsApi.updateStatus(s.ID, {
          status: s.status === "absent" ? "غائب" : "حاضر",
          niveau: s.NIVEAU || undefined,
          filiere: s.FILIERE || undefined,
          matiere: matiereId || undefined, // or s.MATIERE
        })
      );
      await Promise.all(promises);
      toast.success("تم حفظ الحضور بنجاح", {
        description: `${presentCount} حاضر • ${absentCount} غائب`,
      });
    } catch (e) {
      toast.error("حدث خطأ أثناء حفظ الحضور");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="إدارة الحضور"
        subtitle={`${user?.NOMCENTRE ?? ""} — حدد المستوى ثم سجّل الحضور`}
        actions={
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button className="bg-gradient-primary shadow-glow">
                {saving ? <Loader2 className="size-4 ml-2 animate-spin" /> : <Save className="size-4 ml-2" />}
                حفظ الحضور
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>تأكيد حفظ الحضور</AlertDialogTitle>
                <AlertDialogDescription>
                  سيتم حفظ بيانات الحضور لـ {students.length} طالب: {presentCount} حاضر و {absentCount} غائب.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                <AlertDialogAction onClick={handleSave} className="bg-gradient-primary">
                  تأكيد الحفظ
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        }
      />

      <Card className="glass mb-4">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Level */}
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">المستوى (NIVEAU)</label>
              <Select value={levelId} onValueChange={setLevelId} disabled={levels.length === 0}>
                <SelectTrigger><SelectValue placeholder="اختر مستوى" /></SelectTrigger>
                <SelectContent>
                  {levels.map((l) => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filiere */}
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">الفيلير (FILIERE)</label>
              <Select value={filiereId || "all"} onValueChange={(v) => setFiliereId(v === "all" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="الكل" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الفيليرات</SelectItem>
                  {filieres.map((f) => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Matiere */}
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">المادة (MATIERE)</label>
              <Select value={matiereId || "all"} onValueChange={(v) => setMatiereId(v === "all" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="الكل" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع المواد</SelectItem>
                  {matieres.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search */}
            <div className="md:col-span-1">
              <label className="text-xs text-muted-foreground mb-1.5 block">بحث عن طالب</label>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="الاسم أو الرقم أو القاعة..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pr-9"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="gap-1.5">
              <Users className="size-3" /> {students.length} طالب
            </Badge>
            <Badge className="bg-success/15 text-success border-success/30 gap-1.5">
              <CheckCircle2 className="size-3" /> {presentCount} حاضر
            </Badge>
            <Badge className="bg-destructive/15 text-destructive border-destructive/30 gap-1.5">
              <XCircle className="size-3" /> {absentCount} غائب
            </Badge>
            <div className="mr-auto flex gap-2">
              <Button size="sm" variant="outline" onClick={() => bulkMark("present")} disabled={selected.size === 0}>
                تحديد كحاضر ({selected.size})
              </Button>
              <Button size="sm" variant="outline" onClick={() => bulkMark("absent")} disabled={selected.size === 0}>
                تحديد كغائب
              </Button>
              <Button size="sm" variant="ghost" onClick={() => {
                setLoadingStudents(true);
                studentsApi.list({ niveau: levelId, filiere: filiereId || undefined, matiere: matiereId || undefined })
                  .then((d) => setStudents(d.map((s) => ({ ...s, status: (s.status === "غائب" ? "absent" : "present") }))))
                  .catch(() => toast.error("فشل التحديث"))
                  .finally(() => setLoadingStudents(false));
              }}>
                <RefreshCw className={`size-3.5 ${loadingStudents ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass overflow-hidden">
        {loadingStudents ? (
          <div className="flex items-center justify-center p-16">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-muted-foreground">
                <tr>
                  <th className="p-3 text-right w-10">
                    <Checkbox
                      checked={selected.size === filtered.length && filtered.length > 0}
                      onCheckedChange={toggleAll}
                    />
                  </th>
                  <th className="p-3 text-right">الرقم (ID)</th>
                  <th className="p-3 text-right">الاسم واللقب</th>
                  <th className="p-3 text-right">المستوى / الفيلير</th>
                  <th className="p-3 text-right">القاعة</th>
                  <th className="p-3 text-right">الحالة</th>
                  <th className="p-3 text-right">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => (
                  <motion.tr
                    key={`${s.ID}-${i}`}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.008 }}
                    className="border-t hover:bg-secondary/30 transition"
                  >
                    <td className="p-3">
                      <Checkbox
                        checked={selected.has(s.ID)}
                        onCheckedChange={() => toggleSelect(s.ID)}
                      />
                    </td>
                    <td className="p-3 font-mono text-xs">{s.ID}</td>
                    <td className="p-3 font-medium">{s.NOM} {s.PRENOM}</td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {s.NIVEAU ?? "—"}
                      {s.FILIERE ? ` / ${s.FILIERE}` : ""}
                    </td>
                    <td className="p-3 text-xs">{s.NSALLE ?? "—"}</td>
                    <td className="p-3">
                      <Badge className={cn(
                        "gap-1.5",
                        s.status === "present"
                          ? "bg-success/15 text-success border-success/30"
                          : "bg-destructive/15 text-destructive border-destructive/30"
                      )}>
                        {s.status === "present"
                          ? <><CheckCircle2 className="size-3" /> حاضر</>
                          : <><XCircle className="size-3" /> غائب</>}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <Button size="sm" variant="ghost" onClick={() => toggleStatus(s.ID)}>
                        تبديل
                      </Button>
                    </td>
                  </motion.tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-10 text-center text-muted-foreground">
                      {students.length === 0 ? "لا يوجد طلاب في هذا المستوى" : "لا توجد نتائج مطابقة"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
