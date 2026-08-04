import { useContext } from "react";
import { useColorScheme } from "react-native";

import colors from "@/constants/colors";
import { ThemeContext } from "@/context/ThemeContext";

/**
 * Returns the design tokens for the active color scheme.
 *
 * The scheme comes from the user's saved preference (light / dark / system) via
 * {@link ThemeContext}. When no provider is mounted, or the preference is
 * `system`, it falls back to the device appearance. The returned object contains
 * all color tokens for the active palette plus scheme-independent values like
 * `radius`.
 */
export function useColors() {
  const system = useColorScheme();
  const theme = useContext(ThemeContext);
  const scheme = theme ? theme.scheme : system === "dark" ? "dark" : "light";
  const palette =
    scheme === "dark" && "dark" in colors
      ? (colors as { dark: typeof colors.light }).dark
      : colors.light;
  return { ...palette, radius: colors.radius };
}
