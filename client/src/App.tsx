import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Shell } from "@/components/layout/shell";

// Pages
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import PatientsList from "@/pages/patients/index";
import PatientDetails from "@/pages/patients/details";
import DoctorsList from "@/pages/doctors/index";
import MedicinesList from "@/pages/medicines/index";
import NotFound from "@/pages/not-found";
import { useAuth } from "./hooks/use-auth";
import { Loader2 } from "lucide-react";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { data: user, isLoading } = useAuth();
  
  if (isLoading) {
    return <div className="min-h-screen flex justify-center items-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;
  }
  
  if (!user) {
    return <Redirect to="/login" />;
  }
  
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      
      {/* Protected Routes Wrapped in Shell */}
      <Route path="/">
        <Shell><ProtectedRoute component={Dashboard} /></Shell>
      </Route>
      <Route path="/patients">
        <Shell><ProtectedRoute component={PatientsList} /></Shell>
      </Route>
      <Route path="/patients/:id">
        <Shell><ProtectedRoute component={PatientDetails} /></Shell>
      </Route>
      <Route path="/doctors">
        <Shell><ProtectedRoute component={DoctorsList} /></Shell>
      </Route>
      <Route path="/medicines">
        <Shell><ProtectedRoute component={MedicinesList} /></Shell>
      </Route>
      <Route path="/room-types">
        {/* Simplified fallback for room types, reuses dashboard frame */}
        <Shell><ProtectedRoute component={() => <div className="p-8 text-center text-muted-foreground">Room Types Configuration - Accessible via API</div>} /></Shell>
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
