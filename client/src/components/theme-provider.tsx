import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";
type Ctx = { theme: Theme; setTheme: (t: Theme) => void; };
const ThemeCtx = createContext<Ctx | undefined>(undefined);

export function ThemeProvider({ children, defaultTheme = "light", storageKey = "tramiai-theme" }: {children: React.ReactNode; defaultTheme?: Theme; storageKey?: string;}) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem(storageKey) as Theme | null;
    if (saved === "dark" || saved === "light") return saved;
    return defaultTheme;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    localStorage.setItem(storageKey, theme);
  }, [theme, storageKey]);

  return <ThemeCtx.Provider value={{ theme, setTheme }}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
