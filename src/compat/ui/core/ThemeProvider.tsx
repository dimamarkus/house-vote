"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

type ThemeProviderProps = {
  attribute?: "class" | "data-theme";
  children: ReactNode;
  defaultTheme?: string;
  disableTransitionOnChange?: boolean;
  enableSystem?: boolean;
};

export function ThemeProvider({
  attribute = "class",
  children,
  defaultTheme = "system",
  disableTransitionOnChange = false,
  enableSystem = true,
}: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute={attribute}
      defaultTheme={defaultTheme}
      disableTransitionOnChange={disableTransitionOnChange}
      enableSystem={enableSystem}
    >
      {children}
    </NextThemesProvider>
  );
}
