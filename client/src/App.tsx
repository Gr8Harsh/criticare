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

import RoomTypesPage from "@/pages/room-types";
import ChargeRatesPage from "@/pages/charge-rates";
import ProceduresPage from "@/pages/procedures/index";
import SurgeriesPage from "@/pages/surgeries/index";

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
      <Route path="/procedures">
        <Shell><ProtectedRoute component={ProceduresPage} /></Shell>
      </Route>
      <Route path="/surgeries">
        <Shell><ProtectedRoute component={SurgeriesPage} /></Shell>
      </Route>
      <Route path="/room-types">
        <Shell><ProtectedRoute component={RoomTypesPage} /></Shell>
      </Route>
      <Route path="/charge-rates">
        <Shell><ProtectedRoute component={ChargeRatesPage} /></Shell>
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
