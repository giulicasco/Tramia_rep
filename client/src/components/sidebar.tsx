import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth, getInitials, formatRole } from "@/lib/auth";
import {
  BarChart3,
  MessageSquare,
  ListTodo,
  Bot,
  Brain,
  FileText,
  Settings,
  Webhook,
  CreditCard,
  Plug,
  ExternalLink,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const navigationItems = [
  {
    label: "Overview",
    href: "/",
    icon: BarChart3,
    shortcut: "g o",
  },
  {
    label: "Conversations",
    href: "/conversations",
    icon: MessageSquare,
    shortcut: "g c",
    badge: "24",
    badgeVariant: "accent" as const,
  },
  {
    label: "Jobs Queue",
    href: "/jobs",
    icon: ListTodo,
    shortcut: "g j",
    badge: "12",
    badgeVariant: "warning" as const,
  },
  {
    label: "Agents & Prompts",
    href: "/agents",
    icon: Bot,
    shortcut: "g a",
  },
  {
    label: "Knowledge",
    href: "/knowledge",
    icon: Brain,
    shortcut: "g k",
    count: "156",
  },
  {
    label: "Reports",
    href: "/reports",
    icon: FileText,
    shortcut: "g r",
  },
];

const settingsItems = [
  {
    label: "Integrations",
    href: "/integrations",
    icon: Plug,
    shortcut: "g i",
    status: [
      { name: "Chatwoot", active: true },
      { name: "HeyReach", active: true },
      { name: "n8n", active: false },
    ],
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    shortcut: "g s",
  },
  {
    label: "Webhooks",
    href: "/webhooks",
    icon: Webhook,
    shortcut: "g w",
  },
  {
    label: "Billing",
    href: "/billing",
    icon: CreditCard,
    shortcut: "g b",
  },
];

export function Sidebar() {
  const [location] = useLocation();
  const { data: auth, isLoading } = useAuth();

  if (isLoading || !auth) {
    return (
      <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
        <div className="p-4">
          <div className="h-16 bg-muted animate-pulse rounded" />
        </div>
      </aside>
    );
  }

  const { user, organization } = auth;

  return (
    <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col" data-testid="sidebar">
      {/* Organization Switcher */}
      <div className="p-4 border-b border-sidebar-border">
        <Button
          variant="ghost"
          className="w-full justify-start px-3 py-3 h-auto text-left hover:bg-sidebar-accent"
          data-testid="org-switcher"
        >
          <div className="flex items-center space-x-3 w-full">
            <div className="w-8 h-8 bg-sidebar-primary text-sidebar-primary-foreground flex items-center justify-center font-mono font-bold text-sm">
              T
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-sidebar-foreground truncate">
                {organization.name}
              </div>
              <div className="text-xs text-muted-foreground font-mono truncate">
                {organization.slug}
              </div>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </div>
        </Button>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto" data-testid="sidebar-nav">
        {navigationItems.map((item) => {
          const isActive = location === item.href;
          const Icon = item.icon;

          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  "flex items-center space-x-3 px-3 py-2 transition-colors group cursor-pointer",
                  isActive
                    ? "bg-sidebar-primary/10 text-sidebar-primary border-l-2 border-sidebar-primary"
                    : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span className="font-medium truncate">{item.label}</span>
                
                {/* Badge for active items */}
                {item.badge && (
                  <Badge
                    variant={item.badgeVariant}
                    className={cn(
                      "ml-auto live-indicator font-mono text-xs",
                      item.badgeVariant === "accent" && "bg-accent text-accent-foreground",
                      item.badgeVariant === "warning" && "bg-warning text-warning-foreground"
                    )}
                  >
                    {item.badge}
                  </Badge>
                )}

                {/* Count for knowledge */}
                {item.count && (
                  <span className="ml-auto text-xs text-muted-foreground font-mono">
                    {item.count}
                  </span>
                )}

                {/* Keyboard shortcut hint */}
                {!isActive && item.shortcut && (
                  <span className="ml-auto text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.shortcut}
                  </span>
                )}
              </div>
            </Link>
          );
        })}

        <div className="border-t border-sidebar-border my-4" />

        {settingsItems.map((item) => {
          const isActive = location === item.href;
          const Icon = item.icon;

          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  "flex items-center space-x-3 px-3 py-2 transition-colors group cursor-pointer",
                  isActive
                    ? "bg-sidebar-primary/10 text-sidebar-primary border-l-2 border-sidebar-primary"
                    : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span className="font-medium truncate">{item.label}</span>

                {/* Integration status indicators */}
                {item.status && (
                  <div className="ml-auto flex space-x-1">
                    {item.status.map((integration) => (
                      <div
                        key={integration.name}
                        className={cn(
                          "w-2 h-2 rounded-full",
                          integration.active ? "bg-accent" : "bg-warning"
                        )}
                        title={`${integration.name} ${integration.active ? "connected" : "warning"}`}
                      />
                    ))}
                  </div>
                )}

                {/* Keyboard shortcut hint */}
                {!isActive && item.shortcut && (
                  <span className="ml-auto text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.shortcut}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User Info */}
      <div className="p-4 border-t border-sidebar-border" data-testid="user-info">
        <div className="flex items-center space-x-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-secondary text-secondary-foreground text-sm font-semibold">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-sidebar-foreground truncate">
              {user.name}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {formatRole(user.roles[0] || "viewer")}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="p-1 hover:bg-sidebar-accent"
            data-testid="logout-button"
          >
            <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-sidebar-foreground" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
