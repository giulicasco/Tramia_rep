import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: {
    value: number;
    label: string;
    positive?: boolean;
  };
  className?: string;
}

export function KpiCard({ title, value, icon, trend, className }: KpiCardProps) {
  return (
    <Card className={cn("brutalist-shadow", className)} data-testid={`kpi-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {title}
          </h3>
          <div className="text-accent">{icon}</div>
        </div>
        <div className="space-y-2">
          <div className="text-3xl font-bold text-foreground" data-testid={`kpi-value-${title.toLowerCase().replace(/\s+/g, "-")}`}>
            {value}
          </div>
          {trend && (
            <div className="flex items-center space-x-2">
              <span
                className={cn(
                  "text-sm",
                  trend.positive !== false ? "text-accent" : "text-warning"
                )}
                data-testid={`kpi-trend-${title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {trend.value > 0 ? "+" : ""}{trend.value}%
              </span>
              <span className="text-xs text-muted-foreground">{trend.label}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
