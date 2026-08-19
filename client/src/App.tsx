import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import DashboardLayout from "@/components/DashboardLayout";
import Applications from "@/pages/Applications";
import Approvals from "@/pages/Approvals";
import Dashboard from "@/pages/Dashboard";
import Directory from "@/pages/Directory";
import NotFound from "@/pages/NotFound";
import Profile from "@/pages/Profile";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

function Router() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/profile" component={Profile} />
        <Route path="/directory" component={Directory} />
        <Route path="/applications" component={Applications} />
        <Route path="/approvals" component={Approvals} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
