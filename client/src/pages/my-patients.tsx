import { useAuth } from "@/hooks/use-auth";
import { useDoctorAssignedPatients } from "@/hooks/use-doctors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowRight, Users, Search } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { useState } from "react";

export default function MyPatientsPage() {
  const { data: user } = useAuth();
  const [search, setSearch] = useState("");

  const { data: patients, isLoading } = useDoctorAssignedPatients(user?.id ?? 0);

  if (!user || user.role !== "DOCTOR") {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Access restricted to doctors.</p>
      </div>
    );
  }

  const filtered = (patients ?? []).filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.ipdNumber.toLowerCase().includes(search.toLowerCase()) ||
      (p.illness ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight">My Patients</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          All patients currently assigned to you.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            data-testid="input-search-patients"
            placeholder="Search by name, IPD no. or illness..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {patients && (
          <Badge variant="secondary" className="text-sm px-3 py-1">
            <Users className="w-3 h-3 mr-1" />
            {filtered.length} patient{filtered.length !== 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center p-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="py-16 text-center">
            <Users className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
            <p className="text-muted-foreground text-lg font-medium">
              {search ? "No patients match your search." : "No patients assigned to you yet."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((patient) => (
            <Card
              key={patient.id}
              data-testid={`card-patient-${patient.id}`}
              className="border-border/50 hover:shadow-lg hover:border-primary/30 transition-all duration-200"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-base font-bold truncate" data-testid={`text-patient-name-${patient.id}`}>
                      {patient.name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-0.5" data-testid={`text-ipd-${patient.id}`}>
                      IPD: {patient.ipdNumber}
                    </p>
                  </div>
                  <Badge
                    variant={patient.discharged ? "secondary" : "default"}
                    className="shrink-0"
                    data-testid={`status-patient-${patient.id}`}
                  >
                    {patient.discharged ? "Discharged" : "Admitted"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                  {patient.illness && (
                    <>
                      <span className="text-muted-foreground">Illness</span>
                      <span className="font-medium text-right truncate" data-testid={`text-illness-${patient.id}`}>
                        {patient.illness}
                      </span>
                    </>
                  )}
                  {patient.admissionDate && (
                    <>
                      <span className="text-muted-foreground">Admitted</span>
                      <span className="font-medium text-right" data-testid={`text-admission-${patient.id}`}>
                        {format(new Date(patient.admissionDate), "dd MMM yyyy")}
                      </span>
                    </>
                  )}
                  {patient.gender && (
                    <>
                      <span className="text-muted-foreground">Gender</span>
                      <span className="font-medium text-right capitalize">{patient.gender.toLowerCase()}</span>
                    </>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full hover-elevate mt-1"
                  asChild
                  data-testid={`button-view-patient-${patient.id}`}
                >
                  <Link href={`/patients/${patient.id}`}>
                    View Details <ArrowRight className="w-3.5 h-3.5 ml-2" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
