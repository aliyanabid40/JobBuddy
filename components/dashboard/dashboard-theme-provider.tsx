"use client";

import React, { createContext, useContext, useEffect, useSyncExternalStore } from "react";

type Theme = "dark" | "light";

interface DashboardThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const DashboardThemeContext = createContext<DashboardThemeContextType>({
  theme: "dark",
  toggleTheme: () => { },
});

const STORAGE_KEY = "jobbuddy_dashboard_theme";
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function getSnapshot(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") {
      return stored;
    }
  } catch { }
  return "dark";
}

function getServerSnapshot(): Theme {
  return "dark";
}

export function DashboardThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Synchronize the external DOM system whenever theme changes
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";
    try {
      localStorage.setItem(STORAGE_KEY, nextTheme);
    } catch { }
    notifyListeners();
  };

  return (
    <DashboardThemeContext.Provider value={{ theme, toggleTheme }}>
      <div
        className={`${theme === "dark" ? "dark bg-zinc-950 text-zinc-100" : "bg-white text-zinc-900"
          } min-h-screen w-full flex transition-colors duration-200`}
      >
        {children}
      </div>
    </DashboardThemeContext.Provider>
  );
}

export function useDashboardTheme() {
  return useContext(DashboardThemeContext);
}
