import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={cn("flex items-center gap-1 p-1 rounded-full bg-muted border border-border", className)}>
        <div className="h-7 w-7 rounded-full" />
        <div className="h-7 w-7 rounded-full" />
      </div>
    );
  }

  const currentTheme = theme === 'system' ? resolvedTheme : theme;

  return (
    <div className={cn("flex items-center gap-1 p-1 rounded-full bg-muted border border-border", className)}>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-7 w-7 rounded-full",
          currentTheme === "light" && "bg-background shadow-sm"
        )}
        onClick={() => setTheme("light")}
      >
        <Sun className="h-4 w-4" />
        <span className="sr-only">Light mode</span>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-7 w-7 rounded-full",
          currentTheme === "dark" && "bg-background shadow-sm"
        )}
        onClick={() => setTheme("dark")}
      >
        <Moon className="h-4 w-4" />
        <span className="sr-only">Dark mode</span>
      </Button>
    </div>
  );
}
