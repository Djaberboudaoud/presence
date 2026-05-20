import { useEffect } from "react";
import { useTheme } from "@/lib/store";

export function ThemeInit() {
  const theme = useTheme((s) => s.theme);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.setAttribute("dir", "rtl");
    document.documentElement.setAttribute("lang", "ar");
  }, [theme]);
  return null;
}
