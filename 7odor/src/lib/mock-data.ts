export interface Level {
  id: string;
  name: string;
  studentsCount: number;
  examsCount: number;
}

export interface Exam {
  id: string;
  name: string;
  levelId: string;
  levelName: string;
  date: string;
  status: "active" | "upcoming" | "done";
  studentsCount: number;
}

export interface Student {
  id: string;
  name: string;
  studentNumber: string;
  levelId: string;
  status?: "present" | "absent";
}

export const levels: Level[] = [
  { id: "l1", name: "السنة الأولى", studentsCount: 124, examsCount: 5 },
  { id: "l2", name: "السنة الثانية", studentsCount: 98, examsCount: 4 },
  { id: "l3", name: "السنة الثالثة", studentsCount: 87, examsCount: 6 },
  { id: "l4", name: "السنة الرابعة", studentsCount: 65, examsCount: 3 },
];

export const exams: Exam[] = [
  { id: "e1", name: "امتحان الرياضيات", levelId: "l1", levelName: "السنة الأولى", date: "2026-05-20", status: "active", studentsCount: 124 },
  { id: "e2", name: "امتحان الفيزياء", levelId: "l1", levelName: "السنة الأولى", date: "2026-05-22", status: "upcoming", studentsCount: 124 },
  { id: "e3", name: "امتحان الإنجليزية", levelId: "l2", levelName: "السنة الثانية", date: "2026-05-18", status: "active", studentsCount: 98 },
  { id: "e4", name: "امتحان العلوم", levelId: "l2", levelName: "السنة الثانية", date: "2026-05-25", status: "upcoming", studentsCount: 98 },
  { id: "e5", name: "امتحان التاريخ", levelId: "l3", levelName: "السنة الثالثة", date: "2026-05-15", status: "done", studentsCount: 87 },
  { id: "e6", name: "امتحان الجغرافيا", levelId: "l3", levelName: "السنة الثالثة", date: "2026-05-28", status: "upcoming", studentsCount: 87 },
  { id: "e7", name: "امتحان الفلسفة", levelId: "l4", levelName: "السنة الرابعة", date: "2026-05-19", status: "active", studentsCount: 65 },
];

const firstNames = ["محمد", "أحمد", "علي", "يوسف", "حسن", "خالد", "عمر", "إبراهيم", "سعيد", "كريم", "فاطمة", "مريم", "عائشة", "زينب", "ليلى", "نور", "هدى", "سارة", "أمينة", "خديجة"];
const lastNames = ["العلوي", "الإدريسي", "البكري", "الحسني", "الفاسي", "المرابط", "التازي", "الصقلي", "القاسمي", "الزياني"];

export function generateStudents(levelId: string, count: number): Student[] {
  const list: Student[] = [];
  for (let i = 0; i < count; i++) {
    const fn = firstNames[i % firstNames.length];
    const ln = lastNames[(i * 3) % lastNames.length];
    list.push({
      id: `${levelId}_s${i + 1}`,
      name: `${fn} ${ln}`,
      studentNumber: `${levelId.toUpperCase()}-${String(i + 1).padStart(4, "0")}`,
      levelId,
      status: Math.random() > 0.2 ? "present" : "absent",
    });
  }
  return list;
}

export const schools = [
  { id: "s1", name: "جامعة النخبة", students: 374, attendance: 92, exams: 18 },
  { id: "s2", name: "المعهد العالي للتقنيات", students: 512, attendance: 88, exams: 24 },
  { id: "s3", name: "كلية الآداب والعلوم", students: 290, attendance: 85, exams: 14 },
  { id: "s4", name: "مدرسة الهندسة العليا", students: 187, attendance: 95, exams: 9 },
  { id: "s5", name: "جامعة الابتكار", students: 421, attendance: 90, exams: 21 },
];

export const users = [
  { id: "u1", name: "إدارة جامعة النخبة", email: "elite@hadir.sa", role: "school" as const, school: "جامعة النخبة", status: "active", lastLogin: "2026-05-17" },
  { id: "u2", name: "إدارة المعهد العالي", email: "high@hadir.sa", role: "school" as const, school: "المعهد العالي للتقنيات", status: "active", lastLogin: "2026-05-16" },
  { id: "u3", name: "إدارة كلية الآداب", email: "arts@hadir.sa", role: "school" as const, school: "كلية الآداب والعلوم", status: "active", lastLogin: "2026-05-15" },
  { id: "u4", name: "المدير العام", email: "admin@hadir.sa", role: "super_admin" as const, school: "—", status: "active", lastLogin: "2026-05-18" },
  { id: "u5", name: "إدارة مدرسة الهندسة", email: "eng@hadir.sa", role: "school" as const, school: "مدرسة الهندسة العليا", status: "inactive", lastLogin: "2026-05-01" },
];

export const attendanceTrend = [
  { day: "السبت", present: 320, absent: 24 },
  { day: "الأحد", present: 305, absent: 39 },
  { day: "الإثنين", present: 318, absent: 26 },
  { day: "الثلاثاء", present: 312, absent: 32 },
  { day: "الأربعاء", present: 330, absent: 14 },
  { day: "الخميس", present: 298, absent: 46 },
  { day: "الجمعة", present: 325, absent: 19 },
];

export const monthlyReport = [
  { month: "يناير", attendance: 88 },
  { month: "فبراير", attendance: 91 },
  { month: "مارس", attendance: 87 },
  { month: "أبريل", attendance: 93 },
  { month: "مايو", attendance: 90 },
];

export const topAbsentStudents = [
  { name: "كريم التازي", level: "السنة الثانية", absences: 12 },
  { name: "ليلى الفاسي", level: "السنة الأولى", absences: 10 },
  { name: "يوسف العلوي", level: "السنة الثالثة", absences: 9 },
  { name: "نور الزياني", level: "السنة الرابعة", absences: 8 },
  { name: "أحمد البكري", level: "السنة الأولى", absences: 7 },
];

export const notifications = [
  { id: "n1", title: "امتحان جديد", body: "تم إنشاء امتحان الرياضيات للسنة الأولى", time: "قبل 5 دقائق", unread: true },
  { id: "n2", title: "تنبيه غياب", body: "نسبة الغياب تجاوزت 15% في السنة الثانية", time: "قبل ساعة", unread: true },
  { id: "n3", title: "تقرير جاهز", body: "تقرير شهر مايو متاح للتحميل", time: "قبل 3 ساعات", unread: false },
  { id: "n4", title: "تحديث النظام", body: "تم تحديث منصة حاضر إلى الإصدار الجديد", time: "أمس", unread: false },
];
