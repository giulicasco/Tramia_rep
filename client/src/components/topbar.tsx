import { useState, useEffect } from "react";
import { Search, Moon, Sun, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "./theme-provider";

export function Topbar() {
  const { theme, setTheme } = useTheme();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("es-AR", {
      hour12: false,
      timeZone: "America/Argentina/Buenos_Aires",
    });
  };

  return (
    <header className="bg-card border-b border-border px-6 py-4" data-testid="topbar">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-foreground" data-testid="page-title">
            Overview
          </h1>
          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            <span className="live-indicator">●</span>
            <span>Live Data</span>
            <span className="font-mono" data-testid="current-time">
              {formatTime(currentTime)} UTC-3
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Global Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="text"
              placeholder="Search conversations, jobs... (Press / to focus)"
              className="pl-10 pr-4 py-2 w-80 bg-input border-border focus:ring-ring"
              data-testid="global-search"
            />
          </div>


          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="sm"
            className="p-2 hover:bg-muted transition-all duration-200 hover:scale-105"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            data-testid="theme-toggle"
            title={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4 text-yellow-500 hover:text-yellow-400 transition-colors" />
            ) : (
              <Moon className="h-4 w-4 text-blue-500 hover:text-blue-400 transition-colors" />
            )}
          </Button>

          {/* Notifications */}
          <Button
            variant="ghost"
            size="sm"
            className="p-2 hover:bg-muted relative"
            data-testid="notifications-button"
          >
            <Bell className="h-4 w-4" />
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 text-xs flex items-center justify-center font-mono p-0 min-w-[20px]"
            >
              3
            </Badge>
          </Button>
        </div>
      </div>
    </header>
  );
}
