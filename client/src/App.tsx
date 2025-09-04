import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AppShell } from "@/components/app-shell";
import Overview from "@/pages/overview";
import Conversations from "@/pages/conversations";
import Jobs from "@/pages/jobs";
import Agents from "@/pages/agents";
import Knowledge from "@/pages/knowledge";
import Reports from "@/pages/reports";
import Integrations from "@/pages/integrations";
import Settings from "@/pages/settings";
import Webhooks from "@/pages/webhooks";
import Billing from "@/pages/billing";
import Login from "@/pages/login";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route>
        <AppShell>
          <Switch>
            <Route path="/" component={Overview} />
            <Route path="/conversations" component={Conversations} />
            <Route path="/jobs" component={Jobs} />
            <Route path="/agents" component={Agents} />
            <Route path="/knowledge" component={Knowledge} />
            <Route path="/reports" component={Reports} />
            <Route path="/integrations" component={Integrations} />
            <Route path="/settings" component={Settings} />
            <Route path="/webhooks" component={Webhooks} />
            <Route path="/billing" component={Billing} />
            <Route component={NotFound} />
          </Switch>
        </AppShell>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="tramia-theme">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
