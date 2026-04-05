import { useAuth } from "@/hooks/use-auth";
import { useDashboardOverview } from "@/hooks/use-dashboard";
import { useDoctorStats, useDoctorAssignedPatients } from "@/hooks/use-doctors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Bed, Stethoscope, Loader2, ArrowRight, UserRoundCheck, DollarSign } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { data: user } = useAuth();

  if (!user) return null;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight">
          Welcome back, {user.role === "DOCTOR" ? "Dr. " : ""}{user.name}
        </h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Here is what's happening at the hospital today.
        </p>
      </div>

      {user.role === "DOCTOR" ? <DoctorDashboard userId={user.id} /> : <ManagerDashboard isAdmin={user.role === "ADMIN"} />}
    </div>
  );
}

function StatCard({ title, value, icon: Icon, colorClass }: { title: string; value: React.ReactNode; icon: any; colorClass: string }) {
  return (
    <Card className="hover:shadow-lg transition-all duration-300 border-border/50">
      <CardContent className="p-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          <h3 className="text-3xl font-display font-bold">{value}</h3>
        </div>
        <div className={`p-4 rounded-2xl ${colorClass}`}>
          <Icon className="w-6 h-6" />
        </div>
      </CardContent>
    </Card>
  );
}

function ManagerDashboard({ isAdmin }: { isAdmin?: boolean }) {
  const { data, isLoading } = useDashboardOverview();

  if (isLoading) return <div className="flex p-12 justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!data) return null;

  return (
    <div className="space-y-8">
      {isAdmin && (
        <Card className="border-primary/20 bg-primary/5 shadow-sm overflow-hidden">
          <CardHeader className="bg-primary/10 py-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Stethoscope className="w-4 h-4" /> Admin Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 flex gap-4">
            <Button size="sm" variant="outline" asChild className="hover-elevate">
              <Link href="/doctors">Manage Staff Accounts</Link>
            </Button>
            <Button size="sm" variant="outline" asChild className="hover-elevate">
              <Link href="/charge-rates">Update Room Charges</Link>
            </Button>
          </CardContent>
        </Card>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Admitted Patients"
          value={data.totalAdmitted}
          icon={Users}
          colorClass="bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400"
        />
        <StatCard
          title="Beds Occupied"
          value={data.totalBedsOccupied}
          icon={Bed}
          colorClass="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400"
        />
        <StatCard
          title="Discharged Today"
          value={data.totalDischargedToday}
          icon={UserRoundCheck}
          colorClass="bg-violet-100 text-violet-600 dark:bg-violet-900/50 dark:text-violet-400"
        />
        <StatCard
          title="Active Doctors"
          value={data.activeDoctors}
          icon={Stethoscope}
          colorClass="bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400"
        />
      </div>
    </div>
  );
}

function DoctorDashboard({ userId }: { userId: number }) {
  const { data: stats, isLoading: statsLoading } = useDoctorStats(userId);
  const { data: patients, isLoading: patientsLoading } = useDoctorAssignedPatients(userId);

  if (statsLoading || patientsLoading) return <div className="flex p-12 justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatCard
          title="Total Visits"
          value={stats?.visitCount || 0}
          icon={Users}
          colorClass="bg-blue-100 text-blue-600"
        />
        <StatCard
          title="Revenue Generated"
          value={`₹${(stats?.revenueGenerated || 0).toLocaleString()}`}
          icon={DollarSign}
          colorClass="bg-emerald-100 text-emerald-600"
        />
      </div>

      <Card className="shadow-md border-border/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-display">My Assigned Patients</CardTitle>
          <Button variant="outline" size="sm" asChild className="hover-elevate">
            <Link href="/patients">View All</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {patients && patients.length > 0 ? (
            <div className="space-y-4">
              {patients.map((patient) => (
                <div key={patient.id} className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-secondary/30 hover:bg-secondary/60 transition-colors">
                  <div>
                    <p className="font-bold text-foreground">{patient.name}</p>
                    <p className="text-sm text-muted-foreground">IPD: {patient.ipdNumber} • {patient.illness}</p>
                  </div>
                  <Button size="sm" asChild className="hover-elevate">
                    <Link href={`/patients/${patient.id}`}>Details <ArrowRight className="w-4 h-4 ml-2" /></Link>
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No assigned patients.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
