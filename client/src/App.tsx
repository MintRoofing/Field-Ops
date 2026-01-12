import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navigation } from "@/components/Navigation";
import { useAuth } from "@/hooks/use-auth";
import Dashboard from "@/pages/Dashboard";
import LiveMap from "@/pages/LiveMap";
import Photos from "@/pages/Photos";
import Chat from "@/pages/Chat";
import Login from "@/pages/Login";
import Users from "@/pages/Users";
import TimeTracking from "@/pages/TimeTracking";
import Projects from "@/pages/Projects";
import Settings from "@/pages/Settings";

function ProtectedRoute({ component: Component, adminOnly = false }: { component: React.ComponentType; adminOnly?: boolean }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (adminOnly && user.role !== 'admin') {
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="lg:pl-72 pt-16 lg:pt-0 min-h-screen p-4 md:p-8">
        <Component />
      </main>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/"><ProtectedRoute component={Dashboard} /></Route>
      <Route path="/map"><ProtectedRoute component={LiveMap} /></Route>
      <Route path="/photos"><ProtectedRoute component={Photos} /></Route>
      <Route path="/projects"><ProtectedRoute component={Projects} /></Route>
      <Route path="/chat"><ProtectedRoute component={Chat} /></Route>
      <Route path="/chat/:boardId"><ProtectedRoute component={Chat} /></Route>
      <Route path="/users"><ProtectedRoute component={Users} adminOnly /></Route>
      <Route path="/time-tracking"><ProtectedRoute component={TimeTracking} adminOnly /></Route>
      <Route path="/settings"><ProtectedRoute component={Settings} /></Route>
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
