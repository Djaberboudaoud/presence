import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Layers, Users, ChevronLeft, Loader2, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { levelsApi, studentsApi } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/lib/store";

export const Route = createFileRoute("/_app/levels")({
  component: LevelsPage,
});

interface LevelInfo {
  niveau: string;
  studentCount: number;
  filieres: string[];
}

function LevelsPage() {
  const user = useAuth((s) => s.user);
  const [levels, setLevels]   = useState<LevelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [sStudents, setSStudents] = useState<{ NOM: string; PRENOM: string; ID: string; NSALLE: string | null; FILIERE: string | null }[]>([]);
  const [loadingStu, setLoadingStu] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const niveaux = await levelsApi.list();
      const infos: LevelInfo[] = await Promise.all(
        niveaux.map(async (n) => {
          const [fils, studs] = await Promise.all([
            levelsApi.filieres(n),
            studentsApi.list({ niveau: n }),
          ]);
          return { niveau: n, studentCount: studs.length, filieres: fils };
        })
      );
      setLevels(infos);
    } catch {
      toast.error("فشل تحميل المستويات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSelect = async (n: string) => {
    if (selected === n) { setSelected(null); return; }
    setSelected(n);
    setLoadingStu(true);
    try {
      const data = await studentsApi.list({ niveau: n });
      setSStudents(data.map((s) => ({
        NOM: s.NOM, PRENOM: s.PRENOM, ID: s.ID, NSALLE: s.NSALLE, FILIERE: s.FILIERE,
      })));
    } catch {
      toast.error("فشل تحميل الطلاب");
    } finally {
      setLoadingStu(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="المستويات"
        subtitle={`مركز: ${user?.NOMCENTRE ?? ""}`}
        actions={
          <Button variant="outline" size="icon" onClick={load} disabled={loading}>
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : levels.length === 0 ? (
        <Card className="glass p-10 text-center text-muted-foreground">
          لا توجد بيانات. يرجى استيراد قوائم المترشحين أولاً.
        </Card>
      ) : (
        <div className="space-y-3">
          {levels.map((l, i) => (
            <motion.div
              key={l.niveau}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <Card className="glass overflow-hidden">
                {/* Level header row */}
                <CardContent
                  className="p-4 cursor-pointer hover:bg-secondary/30 transition"
                  onClick={() => handleSelect(l.niveau)}
                >
                  <div className="flex items-center gap-4">
                    <div className="size-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow shrink-0">
                      <Layers className="size-5 text-primary-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{l.niveau}</p>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {l.filieres.slice(0, 5).map((f) => (
                          <Badge key={f} variant="secondary" className="text-[10px] px-1.5 py-0">{f}</Badge>
                        ))}
                        {l.filieres.length > 5 && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">+{l.filieres.length - 5}</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="font-bold text-lg leading-tight">{l.studentCount}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Users className="size-3" /> مترشح
                        </p>
                      </div>
                      <ChevronLeft className={`size-4 text-muted-foreground transition-transform ${selected === l.niveau ? "-rotate-90" : ""}`} />
                    </div>
                  </div>
                </CardContent>

                {/* Expanded students */}
                {selected === l.niveau && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border-t"
                  >
                    {loadingStu ? (
                      <div className="flex items-center justify-center p-8">
                        <Loader2 className="size-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <div className="overflow-x-auto max-h-64">
                        <table className="w-full text-xs">
                          <thead className="bg-secondary/40 text-muted-foreground sticky top-0">
                            <tr>
                              <th className="p-2 text-right">الرقم</th>
                              <th className="p-2 text-right">الاسم</th>
                              <th className="p-2 text-right">اللقب</th>
                              <th className="p-2 text-right">الفيلير</th>
                              <th className="p-2 text-right">القاعة</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sStudents.map((s) => (
                              <tr key={s.ID} className="border-t hover:bg-secondary/20">
                                <td className="p-2 font-mono">{s.ID}</td>
                                <td className="p-2">{s.NOM}</td>
                                <td className="p-2">{s.PRENOM}</td>
                                <td className="p-2 text-muted-foreground">{s.FILIERE ?? "—"}</td>
                                <td className="p-2 text-muted-foreground">{s.NSALLE ?? "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </motion.div>
                )}
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
