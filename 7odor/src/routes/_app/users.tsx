import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Search, Plus, MoreVertical, KeyRound, Edit, Trash2,
  Shield, UserCircle2, Loader2, RefreshCw,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { usersApi, type ApiUser, type CreateUserPayload } from "@/lib/api";

export const Route = createFileRoute("/_app/users")({
  component: UsersPage,
});

const EMPTY_FORM: CreateUserPayload = {
  username: "",
  password: "",
  role: "school",
  NCENTRE: "",
  NOMCENTRE: "",
};

function UsersPage() {
  const [list, setList]           = useState<ApiUser[]>([]);
  const [loading, setLoading]     = useState(true);
  const [query, setQuery]         = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [toDelete, setToDelete]   = useState<number | null>(null);
  const [deleting, setDeleting]   = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating]   = useState(false);
  const [form, setForm]           = useState<CreateUserPayload>(EMPTY_FORM);

  const [editOpen, setEditOpen]   = useState(false);
  const [editing, setEditing]     = useState(false);
  const [editForm, setEditForm]   = useState<{id: number, username: string, password: string}>({ id: 0, username: "", password: "" });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await usersApi.list();
      setList(data);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "فشل تحميل المستخدمين");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const filtered = list.filter((u) =>
    (u.username.includes(query) || u.NOMCENTRE.includes(query) || u.NCENTRE.includes(query)) &&
    (roleFilter === "all" || u.role === roleFilter)
  );

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await usersApi.delete(toDelete);
      setList((prev) => prev.filter((u) => u.id !== toDelete));
      toast.success("تم حذف الحساب");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "فشل الحذف");
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  };

  const handleCreate = async () => {
    if (!form.username || !form.password || !form.NCENTRE || !form.NOMCENTRE) {
      toast.error("يرجى تعبئة جميع الحقول");
      return;
    }
    setCreating(true);
    try {
      await usersApi.create(form);
      toast.success("تم إنشاء الحساب بنجاح");
      setCreateOpen(false);
      setForm(EMPTY_FORM);
      fetchUsers();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "فشل الإنشاء");
    } finally {
      setCreating(false);
    }
  };

  const handleUpdate = async () => {
    setEditing(true);
    try {
      await usersApi.update(editForm.id, {
        username: editForm.username,
        ...(editForm.password ? { password: editForm.password } : {})
      });
      toast.success("تم تعديل الحساب بنجاح");
      setEditOpen(false);
      fetchUsers();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "فشل التعديل");
    } finally {
      setEditing(false);
    }
  };

  const setField = (key: keyof CreateUserPayload, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div>
      <PageHeader
        title="إدارة المستخدمين"
        subtitle="إنشاء وتعديل حسابات المؤسسات والمديرين"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={fetchUsers} disabled={loading}>
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-primary shadow-glow">
                  <Plus className="size-4 ml-1" /> إضافة حساب
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>إنشاء حساب جديد</DialogTitle>
                  <DialogDescription>أنشئ حساباً جديداً لمؤسسة أو مدير عام</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>اسم المستخدم</Label>
                    <Input
                      className="mt-1.5" dir="ltr" placeholder="username"
                      value={form.username} onChange={(e) => setField("username", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>كلمة المرور</Label>
                    <Input
                      className="mt-1.5" dir="ltr" type="password" placeholder="••••••••"
                      value={form.password} onChange={(e) => setField("password", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>نوع الحساب</Label>
                    <Select
                      value={form.role}
                      onValueChange={(v) => setField("role", v)}
                    >
                      <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="school">حساب مدرسة</SelectItem>
                        <SelectItem value="admin">مدير عام</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>رمز المركز (NCENTRE)</Label>
                    <Input
                      className="mt-1.5" dir="ltr" placeholder="مثال: C001"
                      value={form.NCENTRE} onChange={(e) => setField("NCENTRE", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>اسم المركز (NOMCENTRE)</Label>
                    <Input
                      className="mt-1.5" placeholder="اسم المؤسسة"
                      value={form.NOMCENTRE} onChange={(e) => setField("NOMCENTRE", e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateOpen(false)}>إلغاء</Button>
                  <Button className="bg-gradient-primary" onClick={handleCreate} disabled={creating}>
                    {creating ? <Loader2 className="size-4 animate-spin ml-1" /> : null}
                    إنشاء
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <Card className="glass mb-4">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="ابحث بالاسم أو رمز المركز..."
              value={query} onChange={(e) => setQuery(e.target.value)}
              className="pr-9"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الأنواع</SelectItem>
              <SelectItem value="school">حسابات المؤسسات</SelectItem>
              <SelectItem value="admin">المديرون العامون</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="glass overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-16">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-muted-foreground">
                <tr>
                  <th className="p-3 text-right">المستخدم</th>
                  <th className="p-3 text-right">النوع</th>
                  <th className="p-3 text-right">رمز المركز</th>
                  <th className="p-3 text-right">اسم المركز</th>
                  <th className="p-3 text-right">تاريخ الإنشاء</th>
                  <th className="p-3 text-right w-12"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u, i) => (
                  <motion.tr
                    key={u.id}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-t hover:bg-secondary/30"
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-9">
                          <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xs">
                            {u.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{u.NOMCENTRE}</p>
                          <p className="text-xs text-muted-foreground" dir="ltr">{u.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      {u.role === "admin"
                        ? <Badge className="bg-primary/15 text-primary border-primary/30 gap-1"><Shield className="size-3" /> مدير عام</Badge>
                        : <Badge variant="secondary" className="gap-1"><UserCircle2 className="size-3" /> مدرسة</Badge>}
                    </td>
                    <td className="p-3 font-mono text-xs">{u.NCENTRE}</td>
                    <td className="p-3">{u.NOMCENTRE}</td>
                    <td className="p-3 text-muted-foreground text-xs">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString("ar-DZ") : "—"}
                    </td>
                    <td className="p-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            setEditForm({ id: u.id, username: u.username, password: "" });
                            setEditOpen(true);
                          }}>
                            <Edit className="size-4 ml-2" /> تعديل الحساب
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setToDelete(u.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="size-4 ml-2" /> حذف الحساب
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </motion.tr>
                ))}
                {filtered.length === 0 && !loading && (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-muted-foreground">
                      لا توجد نتائج
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف هذا الحساب نهائياً مع جميع بياناته. هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="size-4 animate-spin ml-1" /> : null}
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل الحساب</DialogTitle>
            <DialogDescription>تحديث اسم المستخدم وكلمة المرور للحساب</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>اسم المستخدم</Label>
              <Input
                className="mt-1.5" dir="ltr"
                value={editForm.username} onChange={(e) => setEditForm(prev => ({ ...prev, username: e.target.value }))}
              />
            </div>
            <div>
              <Label>كلمة المرور الجديدة</Label>
              <Input
                className="mt-1.5" dir="ltr" type="password" placeholder="اتركه فارغاً لعدم التغيير"
                value={editForm.password} onChange={(e) => setEditForm(prev => ({ ...prev, password: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>إلغاء</Button>
            <Button className="bg-gradient-primary" onClick={handleUpdate} disabled={editing}>
              {editing ? <Loader2 className="size-4 animate-spin ml-1" /> : null}
              حفظ التعديلات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
