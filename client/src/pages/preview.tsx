import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowRight,
  ClipboardList,
  DoorOpen,
  LayoutDashboard,
  MonitorSmartphone,
  Pill,
  Scissors,
  ShieldCheck,
  Stethoscope,
  Users,
} from "lucide-react";
import { Link } from "wouter";
import logoImg from "@assets/Adobe_Express_-_file_1772173054491.png";

const quickStats = [
  { label: "Public Preview Route", value: "/preview" },
  { label: "Primary Local Command", value: "npm run preview:local" },
  { label: "Demo Logins", value: "Admin + Manager + Doctor" },
];

const modules = [
  {
    icon: LayoutDashboard,
    title: "Executive dashboard",
    description:
      "Revenue, occupancy, and doctor activity surfaces are organized for quick operational review.",
  },
  {
    icon: Users,
    title: "Patient management",
    description:
      "Admissions, room assignment, doctor mapping, and discharge flow are all part of the core app.",
  },
  {
    icon: Pill,
    title: "Medicine and billing",
    description:
      "Prescription costing, charge tracking, and bill generation support the inpatient workflow.",
  },
  {
    icon: Stethoscope,
    title: "Procedures",
    description:
      "Procedure catalogs and per-patient entries are available for treatment-side costing.",
  },
  {
    icon: Scissors,
    title: "Surgery workflow",
    description:
      "Surgery names, charge categories, and patient surgery entries are represented across the app.",
  },
  {
    icon: DoorOpen,
    title: "Room configuration",
    description:
      "Room rates, nursing charges, RMO charges, and visit charges can be managed centrally.",
  },
];

const previewSteps = [
  {
    title: "Visual preview only",
    command: "npm run preview:local",
    detail:
      "Starts a Vite client preview with a built-in mock API so demo login works on localhost without requiring the database.",
  },
  {
    title: "Full application",
    command: "npm run dev",
    detail:
      "Runs the Express + Vite stack with a Windows-safe command. This path still needs Postgres environment variables.",
  },
  {
    title: "Demo sign-in",
    command: "admin@test.com / admin123",
    detail:
      "Preview mode includes admin, manager, and doctor demo accounts so you can sign in locally and browse the UI.",
  },
];

export default function PreviewPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.14),_transparent_35%),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--secondary)/0.55))]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-8 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-card/85 p-8 shadow-2xl shadow-primary/10 backdrop-blur xl:p-12">
          <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-[radial-gradient(circle_at_center,_hsl(var(--accent)/0.18),_transparent_60%)] lg:block" />
          <div className="relative grid gap-10 lg:grid-cols-[1.35fr_0.95fr] lg:items-center">
            <div className="space-y-6">
              <Badge className="rounded-full px-4 py-1 text-sm">Localhost Preview Ready</Badge>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 ring-1 ring-primary/15">
                    <img
                      src={logoImg}
                      alt="Criticare logo"
                      className="h-12 w-12 object-contain"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.28em] text-primary/75">
                      Criticare IPD
                    </p>
                    <h1 className="text-4xl font-bold text-foreground sm:text-5xl">
                      Preview the website locally without touching the backend first.
                    </h1>
                  </div>
                </div>

                <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                  This preview page gives you a clean localhost entry point for the
                  hospital management system while the full database-backed
                  experience stays available separately.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg" className="rounded-xl px-6">
                  <Link href="/login">
                    Open login screen
                    <ArrowRight />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="rounded-xl px-6">
                  <a
                    href="https://localhost"
                    onClick={(event) => event.preventDefault()}
                  >
                    Run <code className="text-sm">npm run preview:local</code>
                  </a>
                </Button>
              </div>
            </div>

            <Card className="border-primary/10 bg-background/90 shadow-xl shadow-primary/5">
              <CardContent className="space-y-5 p-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                    <MonitorSmartphone className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-display text-lg font-semibold">Quick preview guide</p>
                    <p className="text-sm text-muted-foreground">
                      Best path for a fast visual check on localhost.
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl bg-secondary/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                    Command
                  </p>
                  <p className="mt-2 font-mono text-sm font-semibold text-foreground sm:text-base">
                    npm run preview:local
                  </p>
                </div>

                <div className="grid gap-3">
                  {quickStats.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between rounded-2xl border border-border/70 bg-card px-4 py-3"
                    >
                      <span className="text-sm text-muted-foreground">{item.label}</span>
                      <span className="text-sm font-semibold text-foreground">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {previewSteps.map((step, index) => (
            <Card key={step.title} className="border-border/60 bg-card/90 shadow-lg shadow-primary/5">
              <CardContent className="space-y-4 p-6">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="rounded-full px-3 py-1">
                    Step {index + 1}
                  </Badge>
                  <ShieldCheck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">{step.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {step.detail}
                  </p>
                </div>
                <div className="rounded-2xl bg-secondary/80 px-4 py-3 font-mono text-sm font-medium text-foreground">
                  {step.command}
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="border-border/60 bg-card/90 shadow-xl shadow-primary/5">
            <CardContent className="p-6 sm:p-8">
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold">What this product covers</h2>
                  <p className="text-sm text-muted-foreground">
                    A quick high-level tour of the major areas already built in the app.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {modules.map((module) => (
                  <div
                    key={module.title}
                    className="rounded-3xl border border-border/70 bg-gradient-to-br from-background to-secondary/50 p-5"
                  >
                    <div className="mb-4 inline-flex rounded-2xl bg-primary/10 p-3 text-primary">
                      <module.icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-semibold">{module.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {module.description}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/90 shadow-xl shadow-primary/5">
            <CardContent className="space-y-6 p-6 sm:p-8">
              <div>
                <h2 className="text-2xl font-semibold">Preview notes</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  The public preview route is intentionally decoupled from auth and
                  database calls, so it is safe to use as your first localhost
                  checkpoint.
                </p>
              </div>

              <div className="space-y-4 rounded-[1.75rem] border border-border/70 bg-secondary/45 p-5">
                <div className="flex items-center justify-between rounded-2xl bg-card px-4 py-3">
                  <span className="text-sm font-medium">Login page</span>
                  <Badge variant="secondary">Available</Badge>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-card px-4 py-3">
                  <span className="text-sm font-medium">Preview route</span>
                  <Badge>Public</Badge>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-card px-4 py-3">
                  <span className="text-sm font-medium">Protected app pages</span>
                  <Badge variant="outline">Require backend</Badge>
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-dashed border-primary/30 bg-primary/5 p-5">
                <p className="text-sm font-semibold text-primary">Next step when you want the full app</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Configure Postgres environment variables, then run <span className="font-mono text-foreground">npm run dev</span> and sign in with the seeded demo users.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button asChild className="rounded-xl">
                  <Link href="/login">Go to login</Link>
                </Button>
                <Button asChild variant="outline" className="rounded-xl">
                  <a
                    href="https://localhost"
                    onClick={(event) => event.preventDefault()}
                  >
                    Preview mode only
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
