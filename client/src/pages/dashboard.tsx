import { useState } from "react";
import { format } from "date-fns";
import { Link } from "wouter";
import { ArrowRight, Bed, ChevronDown, DollarSign, Loader2, Stethoscope, UserRoundCheck, Users } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useDashboardOverview } from "@/hooks/use-dashboard";
import { useDoctors, useDoctorAssignedPatients, useDoctorStats } from "@/hooks/use-doctors";
import { usePatients } from "@/hooks/use-patients";
import { useRoomTypes } from "@/hooks/use-room-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ManagerStat = "admitted" | "beds" | "discharged" | "doctors";

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

      {user.role === "DOCTOR" ? (
        <DoctorDashboard userId={user.id} />
      ) : (
        <ManagerDashboard isAdmin={user.role === "ADMIN"} />
      )}
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
  const { data: patients = [] } = usePatients();
  const { data: doctors = [] } = useDoctors();
  const { data: roomTypes = [] } = useRoomTypes();
  const [expandedStat, setExpandedStat] = useState<ManagerStat | null>(null);

  if (isLoading) return <div className="flex p-12 justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!data) return null;

  const todayKey = format(new Date(), "yyyy-MM-dd");
  const admittedPatients = patients.filter((patient) => !patient.discharged);
  const dischargedTodayPatients = patients.filter((patient) =>
    patient.discharged &&
    patient.expectedDischargeDate &&
    format(new Date(patient.expectedDischargeDate), "yyyy-MM-dd") === todayKey
  );
  const occupiedBeds = admittedPatients
    .map((patient) => ({
      patient,
      roomType: roomTypes.find((room) => room.id === patient.roomTypeId)?.name ?? "Room",
      bedNumber: patient.bedNumber || "N/A",
    }))
    .sort((left, right) => left.bedNumber.localeCompare(right.bedNumber, undefined, { numeric: true, sensitivity: "base" }));

  const toggleExpandedStat = (stat: ManagerStat) => {
    setExpandedStat((current) => current === stat ? null : stat);
  };

  const renderPatientDropdown = (list: any[], emptyText: string) => (
    <Card className="border-border/50 shadow-sm">
      <CardContent className="p-0">
        {list.length === 0 ? (
          <p className="p-5 text-center text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          <div className="divide-y divide-border/60">
            {list.map((patient) => (
              <Link
                key={patient.id}
                href={`/patients/${patient.id}`}
                className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-secondary/40"
              >
                <div>
                  <p className="font-semibold">{patient.name}</p>
                  <p className="text-sm text-muted-foreground">IPD: {patient.ipdNumber || "N/A"} - {patient.illness || "No diagnosis"}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderBedsDropdown = () => (
    <Card className="border-border/50 shadow-sm">
      <CardContent className="p-0">
        {occupiedBeds.length === 0 ? (
          <p className="p-5 text-center text-sm text-muted-foreground">No beds occupied.</p>
        ) : (
          <div className="divide-y divide-border/60">
            {occupiedBeds.map(({ patient, roomType, bedNumber }) => (
              <Link
                key={patient.id}
                href={`/patients/${patient.id}`}
                className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-secondary/40"
              >
                <div>
                  <p className="font-semibold">{roomType} - {bedNumber}</p>
                  <p className="text-sm text-muted-foreground">{patient.name} - IPD: {patient.ipdNumber || "N/A"}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderDoctorsDropdown = () => (
    <Card className="border-border/50 shadow-sm">
      <CardContent className="p-0">
        {doctors.length === 0 ? (
          <p className="p-5 text-center text-sm text-muted-foreground">No active doctors.</p>
        ) : (
          <div className="divide-y divide-border/60">
            {doctors.map((doctor) => (
              <Link
                key={doctor.id}
                href="/doctors"
                className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-secondary/40"
              >
                <div>
                  <p className="font-semibold">{doctor.name}</p>
                  <p className="text-sm text-muted-foreground">{doctor.specialization} - Visit charge Rs. {doctor.visitCharge}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

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
              <Link href="/charge-rates">Update Room Configuration</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <button type="button" className="text-left" onClick={() => toggleExpandedStat("admitted")}>
          <StatCard
            title="Admitted Patients"
            value={<span className="inline-flex items-center gap-2">{data.totalAdmitted}<ChevronDown className={`h-5 w-5 transition-transform ${expandedStat === "admitted" ? "rotate-180" : ""}`} /></span>}
            icon={Users}
            colorClass="bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400"
          />
        </button>
        <button type="button" className="text-left" onClick={() => toggleExpandedStat("beds")}>
          <StatCard
            title="Beds Occupied"
            value={<span className="inline-flex items-center gap-2">{data.totalBedsOccupied}<ChevronDown className={`h-5 w-5 transition-transform ${expandedStat === "beds" ? "rotate-180" : ""}`} /></span>}
            icon={Bed}
            colorClass="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400"
          />
        </button>
        <button type="button" className="text-left" onClick={() => toggleExpandedStat("discharged")}>
          <StatCard
            title="Discharged Today"
            value={<span className="inline-flex items-center gap-2">{data.totalDischargedToday}<ChevronDown className={`h-5 w-5 transition-transform ${expandedStat === "discharged" ? "rotate-180" : ""}`} /></span>}
            icon={UserRoundCheck}
            colorClass="bg-violet-100 text-violet-600 dark:bg-violet-900/50 dark:text-violet-400"
          />
        </button>
        <button type="button" className="text-left" onClick={() => toggleExpandedStat("doctors")}>
          <StatCard
            title="Active Doctors"
            value={<span className="inline-flex items-center gap-2">{data.activeDoctors}<ChevronDown className={`h-5 w-5 transition-transform ${expandedStat === "doctors" ? "rotate-180" : ""}`} /></span>}
            icon={Stethoscope}
            colorClass="bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400"
          />
        </button>
      </div>

      {expandedStat === "admitted" && renderPatientDropdown(admittedPatients, "No admitted patients.")}
      {expandedStat === "beds" && renderBedsDropdown()}
      {expandedStat === "discharged" && renderPatientDropdown(dischargedTodayPatients, "No patients discharged today.")}
      {expandedStat === "doctors" && renderDoctorsDropdown()}
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
          value={`Rs. ${(stats?.revenueGenerated || 0).toLocaleString()}`}
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
                    <p className="text-sm text-muted-foreground">IPD: {patient.ipdNumber} - {patient.illness}</p>
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
