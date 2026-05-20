import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Download, FileSpreadsheet, Loader2, Layers, BookOpen, GraduationCap, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { studentsApi, levelsApi } from "@/lib/api";
import { toast } from "sonner";
import * as XLSX from "xlsx";

export const Route = createFileRoute("/_app/export")({
  component: ExportPage,
});

function ExportPage() {
  const [niveaux, setNiveaux] = useState<string[]>([]);
  const [filieres, setFilieres] = useState<string[]>([]);
  const [matieres, setMatieres] = useState<string[]>([]);

  const [selectedNiveau, setSelectedNiveau] = useState<string>("all");
  const [selectedFiliere, setSelectedFiliere] = useState<string>("all");
  const [selectedMatiere, setSelectedMatiere] = useState<string>("all");

  const [studentCount, setStudentCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(false);
  const [loadingExport, setLoadingExport] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(true);

  // Filename dialog state
  const [showFilenameDialog, setShowFilenameDialog] = useState(false);
  const [filename, setFilename] = useState<string>("");
  const [pendingExportData, setPendingExportData] = useState<any>(null);

  // Load dropdown lists and student count
  const loadData = async () => {
    setLoadingOptions(true);
    try {
      const niv = selectedNiveau === "all" ? undefined : selectedNiveau;
      const fil = selectedFiliere === "all" ? undefined : selectedFiliere;
      const mat = selectedMatiere === "all" ? undefined : selectedMatiere;

      // 1. Fetch filtered lists from backend
      const [nivs, fils, mats] = await Promise.all([
        levelsApi.list(fil, mat),
        levelsApi.filieres(niv, mat),
        levelsApi.matieres(niv, fil),
      ]);

      setNiveaux(nivs);
      setFilieres(fils);
      setMatieres(mats);

      // 2. Fetch student count matching these filters
      setLoadingCount(true);
      const students = await studentsApi.list({
        niveau: niv,
        filiere: fil,
        matiere: mat,
      });
      setStudentCount(students.length);
    } catch (e) {
      toast.error("حدث خطأ أثناء تحميل البيانات");
    } finally {
      setLoadingOptions(false);
      setLoadingCount(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedNiveau, selectedFiliere, selectedMatiere]);

  const handleReset = () => {
    setSelectedNiveau("all");
    setSelectedFiliere("all");
    setSelectedMatiere("all");
    toast.info("تم إعادة تعيين التصفية");
  };

  const handleExportClick = async () => {
    setLoadingExport(true);
    try {
      const niv = selectedNiveau === "all" ? undefined : selectedNiveau;
      const fil = selectedFiliere === "all" ? undefined : selectedFiliere;
      const mat = selectedMatiere === "all" ? undefined : selectedMatiere;

      const students = await studentsApi.list({
        niveau: niv,
        filiere: fil,
        matiere: mat,
      });

      if (students.length === 0) {
        toast.warning("لا توجد بيانات لتصديرها تحت هذه التصفية");
        setLoadingExport(false);
        return;
      }

      // Generate default filename
      let filterName = "جميع_الطلاب";
      if (niv || fil || mat) {
        filterName = [niv, fil, mat].filter(Boolean).join("_");
      }
      const defaultFilename = `تصدير_${filterName}_${new Date().toLocaleDateString("ar-EG")}.xlsx`;

      // Prepare data for export
      const data = students.map((s) => ({
        ID: s.ID,
        IANNEXE: s.IANNEXE || "",
        IANNEEINS: s.IANNEEINS || "",
        INSEQ: s.INSEQ || "",
        ORDREC: s.ORDREC || "",
        ICODE: s.ICODE || "",
        NIVEAU: s.NIVEAU || "",
        FILIERE: s.FILIERE || "",
        MATIERE: s.MATIERE || "",
        NOM: s.NOM || "",
        PRENOM: s.PRENOM || "",
        WILAYA: s.WILAYA || "",
        NSALLE: s.NSALLE || "",
        NCENTRE: s.NCENTRE || "",
        status: s.status || "",
      }));

      // Store data and show dialog
      setPendingExportData({
        data,
        filename: defaultFilename,
      });
      setFilename(defaultFilename);
      setShowFilenameDialog(true);
    } catch (e) {
      toast.error("حدث خطأ أثناء جمع البيانات");
    } finally {
      setLoadingExport(false);
    }
  };

  const handleConfirmExport = () => {
    if (!filename.trim()) {
      toast.error("الرجاء إدخال اسم الملف");
      return;
    }

    if (!pendingExportData) {
      return;
    }

    try {
      const { data } = pendingExportData;
      let finalFilename = filename.trim();

      // Ensure .xlsx extension
      if (!finalFilename.endsWith(".xlsx")) {
        finalFilename += ".xlsx";
      }

      const ws = XLSX.utils.json_to_sheet(data);

      // Auto-fit column widths
      const maxLens = Object.keys(data[0] || {}).reduce((acc, key) => {
        acc[key] = Math.max(
          key.length,
          ...data.map((row: any) => String(row[key as keyof typeof row] || "").length)
        );
        return acc;
      }, {} as Record<string, number>);

      ws["!cols"] = Object.keys(maxLens).map((k) => ({ wch: maxLens[k] + 3 }));

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "الطلاب المصدّرين");

      XLSX.writeFile(wb, finalFilename);

      toast.success("تم تصدير الملف بنجاح", {
        description: `تم تصدير ${data.length} مترشح بنجاح!`,
      });

      // Reset state
      setShowFilenameDialog(false);
      setFilename("");
      setPendingExportData(null);
    } catch (e) {
      toast.error("حدث خطأ أثناء تصدير ملف Excel");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="تصدير Excel" subtitle="تصدير قوائم المترشحين مع تصفية ديناميكية ومترابطة" />

      {/* Statistics Card for filtered students count */}
      <div className="grid grid-cols-1 gap-6">
        <Card className="glass relative overflow-hidden">
          <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-right">
              <div className="size-12 rounded-2xl bg-gradient-primary text-primary-foreground flex items-center justify-center shadow-glow shrink-0">
                <FileSpreadsheet className="size-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">عدد المترشحين المطابقين للتصفية الحالية</p>
                <div className="flex items-baseline gap-2 mt-1">
                  {loadingCount ? (
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                  ) : (
                    <span className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
                      {studentCount !== null ? studentCount.toLocaleString() : "..."}
                    </span>
                  )}
                  <span className="text-sm text-muted-foreground">مترشح</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 w-full sm:w-auto justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={selectedNiveau === "all" && selectedFiliere === "all" && selectedMatiere === "all"}
                className="h-10 px-4"
              >
                إعادة تعيين التصفية
              </Button>
              <Button
                size="sm"
                onClick={() => loadData()}
                disabled={loadingOptions}
                variant="outline"
                className="size-10 p-0"
              >
                <RefreshCw className={`size-4 ${loadingOptions ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-right">
            <GraduationCap className="size-5 text-primary" /> خيارات التصفية التفاعلية
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* NIVEAU Select */}
            <div className="space-y-2 text-right">
              <Label className="flex items-center justify-end gap-1.5 font-semibold text-muted-foreground">
                المستوى (NIVEAU) <Layers className="size-4 text-muted-foreground" />
              </Label>
              <Select value={selectedNiveau} onValueChange={setSelectedNiveau}>
                <SelectTrigger className="w-full h-11 bg-background/50 border-muted">
                  <SelectValue placeholder="اختر المستوى" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل (جميع المستويات)</SelectItem>
                  {niveaux.map((niv) => (
                    <SelectItem key={niv} value={niv}>
                      {niv}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* FILIERE Select */}
            <div className="space-y-2 text-right">
              <Label className="flex items-center justify-end gap-1.5 font-semibold text-muted-foreground">
                الشعبة (FILIERE) <GraduationCap className="size-4 text-muted-foreground" />
              </Label>
              <Select value={selectedFiliere} onValueChange={setSelectedFiliere}>
                <SelectTrigger className="w-full h-11 bg-background/50 border-muted">
                  <SelectValue placeholder="اختر الشعبة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل (جميع الشعب)</SelectItem>
                  {filieres.map((fil) => (
                    <SelectItem key={fil} value={fil}>
                      {fil}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* MATIERE Select */}
            <div className="space-y-2 text-right">
              <Label className="flex items-center justify-end gap-1.5 font-semibold text-muted-foreground">
                المادة (MATIERE) <BookOpen className="size-4 text-muted-foreground" />
              </Label>
              <Select value={selectedMatiere} onValueChange={setSelectedMatiere}>
                <SelectTrigger className="w-full h-11 bg-background/50 border-muted">
                  <SelectValue placeholder="اختر المادة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل (جميع المواد)</SelectItem>
                  {matieres.map((mat) => (
                    <SelectItem key={mat} value={mat}>
                      {mat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="pt-4 border-t border-muted/50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground text-right sm:max-w-md leading-relaxed">
              * عند اختيار أي عنصر من الخيارات أعلاه، سيتم تلقائياً تصفية وتحديث قائمة الخيارات الأخرى لتتوافق مع ما هو متاح فقط لتجنب استخراج ملفات فارغة.
            </p>
            <Button
              onClick={handleExportClick}
              disabled={loadingExport || studentCount === 0}
              className="w-full sm:w-auto bg-gradient-primary shadow-glow h-12 px-8 font-bold text-sm"
            >
              {loadingExport ? (
                <>
                  <Loader2 className="size-4 ml-2 animate-spin" /> جارٍ معالجة التصدير...
                </>
              ) : (
                <>
                  <Download className="size-4 ml-2" /> تصدير البيانات المطابقة إلى Excel
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filename Dialog */}
      <Dialog open={showFilenameDialog} onOpenChange={setShowFilenameDialog}>
        <DialogContent className="glass" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle>حفظ ملف Excel</DialogTitle>
            <DialogDescription>
              أدخل اسم الملف أو استخدم الاسم الافتراضي. سيتم إضافة امتداد .xlsx تلقائياً
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2 text-right">
              <Label htmlFor="filename" className="font-semibold">
                اسم الملف
              </Label>
              <Input
                id="filename"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                placeholder="أدخل اسم الملف"
                dir="rtl"
                className="bg-background/50"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                الاسم الافتراضي: تصدير_[النصفية]_[التاريخ].xlsx
              </p>
            </div>
          </div>
          <DialogFooter className="flex flex-row-reverse gap-2">
            <Button
              onClick={handleConfirmExport}
              className="bg-gradient-primary shadow-glow"
            >
              <Download className="size-4 ml-2" />
              حفظ الملف
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowFilenameDialog(false)}
            >
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
