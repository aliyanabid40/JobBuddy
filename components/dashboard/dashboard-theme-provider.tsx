"use client";

import React, { createContext, useContext, useEffect } from "react";

type Theme = "light";

interface DashboardThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const DashboardThemeContext = createContext<DashboardThemeContextType>({
  theme: "light",
  toggleTheme: () => { },
});

export function DashboardThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // App is light-theme only. Remove any stale "dark" class from localStorage.
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    try {
      localStorage.removeItem("jobbuddy_dashboard_theme");
    } catch { }
  }, []);

  return (
    <DashboardThemeContext.Provider value={{ theme: "light", toggleTheme: () => { } }}>
      <div className="bg-white text-zinc-900 min-h-screen w-full flex">
        {children}
      </div>
    </DashboardThemeContext.Provider>
  );
}

export function useDashboardTheme() {
  return useContext(DashboardThemeContext);
}
