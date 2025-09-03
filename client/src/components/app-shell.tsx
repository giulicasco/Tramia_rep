import { useEffect } from "react";
import { useLocation } from "wouter";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [location, setLocation] = useLocation();

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Global search with "/"
      if (e.key === "/" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
        return;
      }

      // Navigation shortcuts with "g" prefix
      if (e.key === "g" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        // Set a temporary flag to listen for the next key
        document.addEventListener("keydown", handleGNavigation, { once: true });
        return;
      }

      // Help with "?"
      if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        // TODO: Show help modal
        console.log("Show help modal");
        return;
      }
    };

    const handleGNavigation = (e: KeyboardEvent) => {
      switch (e.key) {
        case "o":
          setLocation("/");
          break;
        case "c":
          setLocation("/conversations");
          break;
        case "j":
          setLocation("/jobs");
          break;
        case "a":
          setLocation("/agents");
          break;
        case "k":
          setLocation("/knowledge");
          break;
        case "r":
          setLocation("/reports");
          break;
        case "i":
          setLocation("/integrations");
          break;
        case "s":
          setLocation("/settings");
          break;
        case "w":
          setLocation("/webhooks");
          break;
        case "b":
          setLocation("/billing");
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [setLocation]);

  return (
    <div className="flex h-screen bg-background" data-testid="app-shell">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 overflow-y-auto" data-testid="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
