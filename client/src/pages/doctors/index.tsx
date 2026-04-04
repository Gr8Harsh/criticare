import { useState } from "react";
import { useDoctors } from "@/hooks/use-doctors";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Plus, Search, Stethoscope, Settings2, Scissors, ChevronDown, ChevronRight, Activity } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SURGERY_CATEGORIES = [
  { key: "SURGEON",           label: "Surgeon Charge" },
  { key: "ASSISTANT_SURGEON", label: "Assistant Surgeon Charge" },
  { key: "ANAESTHETIST",      label: "Anaesthetist Charge" },
  { key: "OT",                label: "OT Charge" },
  { key: "OT_ASSISTANT",      label: "OT Assistant Charge" },
];

const userSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["MANAGER", "DOCTOR"]),
});

const doctorSchema = z.object({
  name: z.string().min(2),
  specialization: z.string().min(2),
  visitCharge: z.coerce.number().min(0),
  userId: z.coerce.number().min(1, "Select a User account"),
  isSurgeon: z.boolean().default(false),
  isAssistantSurgeon: z.boolean().default(false),
  isOtAssistant: z.boolean().default(false),
  isAnaesthetist: z.boolean().default(false),
});

// ─── Room Charges Dialog ─────────────────────────────────────────────────────

function RoomChargesDialog({ doctor }: { doctor: any }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: roomTypes } = useQuery<any[]>({ queryKey: [api.roomTypes.list.path] });
  const { data: roomCharges, isLoading } = useQuery<any[]>({
    queryKey: [`/api/doctors/${doctor.id}/room-charges`],
    enabled: open,
  });

  const upsertCharge = useMutation({
    mutationFn: async ({ roomTypeId, charge }: { roomTypeId: number; charge: number }) => {
      const res = await fetch(`/api/doctors/${doctor.id}/room-charges`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomTypeId, charge }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to save charge");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/doctors/${doctor.id}/room-charges`] });
      toast({ title: "Saved", description: "Room charge updated." });
    },
    onError: () => toast({ title: "Error", description: "Failed to save.", variant: "destructive" }),
  });

  const getCharge = (roomTypeId: number) =>
    roomCharges?.find((rc) => rc.roomTypeId === roomTypeId)?.charge ?? "";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="hover-elevate" data-testid={`button-room-charges-${doctor.id}`}>
          <Settings2 className="w-4 h-4 mr-1" /> Room Charges
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="font-display">Room-wise Visit Charges — Dr. {doctor.name}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground -mt-2 mb-1">
          Set a different visit charge per room type. Leave blank to use the default (₹{doctor.visitCharge}).
        </p>
        {isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : (
          <div className="space-y-3">
            {roomTypes?.map((rt) => (
              <RoomChargeRow
                key={rt.id}
                roomType={rt}
                currentCharge={getCharge(rt.id)}
                onSave={(charge) => upsertCharge.mutate({ roomTypeId: rt.id, charge })}
                isPending={upsertCharge.isPending}
              />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function RoomChargeRow({ roomType, currentCharge, onSave, isPending }: {
  roomType: any; currentCharge: number | string; onSave: (charge: number) => void; isPending: boolean;
}) {
  const [value, setValue] = useState(currentCharge.toString());
  const handleSave = () => { const n = parseInt(value); if (!isNaN(n) && n >= 0) onSave(n); };
  return (
    <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
      <div className="flex-1">
        <div className="font-medium text-sm">{roomType.name}</div>
        <div className="text-xs text-muted-foreground">Room rate: ₹{roomType.dailyCharge}/day</div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-sm">₹</span>
        <Input type="number" min="0" className="w-28 h-8 text-sm" placeholder="default"
          value={value} onChange={(e) => setValue(e.target.value)} data-testid={`input-room-charge-${roomType.id}`} />
        <Button size="sm" variant="secondary" className="h-8 px-3" onClick={handleSave} disabled={isPending}
          data-testid={`button-save-room-charge-${roomType.id}`}>Save</Button>
      </div>
    </div>
  );
}

// ─── Surgery Charges Dialog ──────────────────────────────────────────────────

function SurgeryChargesDialog({ doctor }: { doctor: any }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: surgeryCharges, isLoading } = useQuery<any[]>({
    queryKey: [`/api/doctors/${doctor.id}/surgery-charges`],
    enabled: open,
  });

  const upsertCharge = useMutation({
    mutationFn: async ({ category, charge }: { category: string; charge: number }) => {
      const res = await fetch(`/api/doctors/${doctor.id}/surgery-charges`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, charge }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/doctors/${doctor.id}/surgery-charges`] });
      toast({ title: "Saved", description: "Surgery charge updated." });
    },
    onError: () => toast({ title: "Error", description: "Failed to save.", variant: "destructive" }),
  });

  const getCharge = (category: string) =>
    surgeryCharges?.find((sc) => sc.category === category)?.charge ?? "";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="hover-elevate" data-testid={`button-surgery-charges-${doctor.id}`}>
          <Scissors className="w-4 h-4 mr-1" /> Surgery Charges
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="font-display">Surgery Charges — Dr. {doctor.name}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground -mt-2 mb-2">
          Click a charge category to expand and set the amount for this doctor.
        </p>
        {isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : (
          <div className="space-y-2">
            {SURGERY_CATEGORIES.map(({ key, label }) => {
              const isOpen = expanded === key;
              return (
                <div key={key} className="rounded-lg border border-border/50 overflow-hidden">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between px-4 py-3 bg-secondary/20 hover:bg-secondary/40 transition-colors text-left"
                    onClick={() => setExpanded(isOpen ? null : key)}
                    data-testid={`expand-surgery-${key}`}
                  >
                    <span className="font-medium text-sm">{label}</span>
                    <div className="flex items-center gap-2">
                      {getCharge(key) !== "" && (
                        <span className="text-xs text-primary font-semibold">₹{getCharge(key)}</span>
                      )}
                      {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </button>
                  {isOpen && (
                    <SurgeryChargeRow
                      category={key}
                      currentCharge={getCharge(key)}
                      onSave={(charge) => upsertCharge.mutate({ category: key, charge })}
                      isPending={upsertCharge.isPending}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SurgeryChargeRow({ category, currentCharge, onSave, isPending }: {
  category: string; currentCharge: number | string; onSave: (charge: number) => void; isPending: boolean;
}) {
  const [value, setValue] = useState(currentCharge.toString());
  const handleSave = () => { const n = parseInt(value); if (!isNaN(n) && n >= 0) onSave(n); };
  return (
    <div className="flex items-center gap-3 p-3 bg-background border-t border-border/30">
      <span className="text-muted-foreground text-sm">₹</span>
      <Input
        type="number"
        min="0"
        className="flex-1 h-8 text-sm"
        placeholder="Enter charge amount"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        data-testid={`input-surgery-charge-${category}`}
      />
      <Button size="sm" className="h-8 px-4" onClick={handleSave} disabled={isPending}
        data-testid={`button-save-surgery-charge-${category}`}>
        {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
      </Button>
    </div>
  );
}

// ─── Role Badges ─────────────────────────────────────────────────────────────

function DoctorRoleBadges({ doc }: { doc: any }) {
  const hasRole = doc.isSurgeon || doc.isAssistantSurgeon || doc.isOtAssistant || doc.isAnaesthetist;
  return (
    <div className="flex flex-wrap gap-1">
      {doc.isSurgeon && (
        <Badge className="gap-1 text-xs bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 border-violet-200">
          <Scissors className="w-3 h-3" /> Surgeon
        </Badge>
      )}
      {doc.isAssistantSurgeon && (
        <Badge className="gap-1 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200">
          <Scissors className="w-3 h-3" /> Asst. Surgeon
        </Badge>
      )}
      {doc.isAnaesthetist && (
        <Badge className="gap-1 text-xs bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 border-teal-200">
          <Activity className="w-3 h-3" /> Anaesthetist
        </Badge>
      )}
      {doc.isOtAssistant && (
        <Badge className="gap-1 text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200">
          <Settings2 className="w-3 h-3" /> OT Assistant
        </Badge>
      )}
      {!hasRole && (
        <Badge variant="secondary" className="gap-1 text-xs">
          <Stethoscope className="w-3 h-3" /> Doctor
        </Badge>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DoctorsList() {
  const { data: doctors, isLoading } = useDoctors();
  const { data: currentUser } = useAuth();
  const [search, setSearch] = useState("");
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isAddDoctorOpen, setIsAddDoctorOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: usersList } = useQuery<any[]>({
    queryKey: ["/api/admin/users"],
    enabled: currentUser?.role === "ADMIN",
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: z.infer<typeof userSchema>) => {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.message || "Failed to create user"); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User created successfully" });
      setIsAddUserOpen(false);
      userForm.reset();
    },
    onError: (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
  });

  const createDoctor = useMutation({
    mutationFn: async (data: z.infer<typeof doctorSchema>) => {
      const res = await fetch(api.doctors.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create doctor");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.doctors.list.path] });
      toast({ title: "Doctor added successfully" });
      setIsAddDoctorOpen(false);
      doctorForm.reset();
    },
  });

  const userForm = useForm<z.infer<typeof userSchema>>({
    resolver: zodResolver(userSchema),
    defaultValues: { name: "", email: "", password: "", role: "DOCTOR" },
  });

  const doctorForm = useForm<z.infer<typeof doctorSchema>>({
    resolver: zodResolver(doctorSchema),
    defaultValues: { name: "", specialization: "", visitCharge: 0, userId: 0, isSurgeon: false, isAssistantSurgeon: false, isOtAssistant: false, isAnaesthetist: false },
  });

  const linkedUserIds = new Set(doctors?.map((d) => d.userId) ?? []);

  const filteredDoctors = doctors?.filter((d) => d.name.toLowerCase().includes(search.toLowerCase()));

  if (currentUser?.role !== "MANAGER" && currentUser?.role !== "ADMIN") return <div>Unauthorized</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">
            {currentUser?.role === "ADMIN" ? "Staff Management" : "Doctors"}
          </h1>
          <p className="text-muted-foreground">
            {currentUser?.role === "ADMIN" ? "Manage hospital medical and administrative staff." : "View available doctors and their specializations."}
          </p>
        </div>
        {currentUser?.role === "ADMIN" && (
          <div className="flex gap-2">
            {/* Add User Account */}
            <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="hover-elevate shadow-sm">
                  <Plus className="w-5 h-5 mr-2" /> Add User Account
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create New User Account</DialogTitle></DialogHeader>
                <Form {...userForm}>
                  <form onSubmit={userForm.handleSubmit((d) => createUserMutation.mutate(d))} className="space-y-4">
                    <FormField control={userForm.control} name="name" render={({ field }) => (
                      <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={userForm.control} name="email" render={({ field }) => (
                      <FormItem><FormLabel>Email Address</FormLabel><FormControl><Input type="email" placeholder="john@example.com" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={userForm.control} name="password" render={({ field }) => (
                      <FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={userForm.control} name="role" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="MANAGER">Manager</SelectItem>
                            <SelectItem value="DOCTOR">Doctor</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <Button type="submit" className="w-full" disabled={createUserMutation.isPending}>Create User</Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

            {/* Add Doctor Profile */}
            <Dialog open={isAddDoctorOpen} onOpenChange={setIsAddDoctorOpen}>
              <DialogTrigger asChild>
                <Button className="hover-elevate shadow-lg"><Plus className="w-5 h-5 mr-2" /> Add Doctor Profile</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[480px]">
                <DialogHeader><DialogTitle>New Doctor Profile</DialogTitle></DialogHeader>
                <Form {...doctorForm}>
                  <form onSubmit={doctorForm.handleSubmit((d) => createDoctor.mutate(d))} className="space-y-4">
                    <FormField control={doctorForm.control} name="name" render={({ field }) => (
                      <FormItem><FormLabel>Doctor Name</FormLabel><FormControl><Input placeholder="Dr. John Doe" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={doctorForm.control} name="specialization" render={({ field }) => (
                      <FormItem><FormLabel>Specialization</FormLabel><FormControl><Input placeholder="Cardiology" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={doctorForm.control} name="visitCharge" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Visit Charge (₹)</FormLabel>
                        <FormControl><Input type="number" {...field} /></FormControl>
                        <FormMessage />
                        <p className="text-xs text-muted-foreground">Used when no room-specific charge is set.</p>
                      </FormItem>
                    )} />
                    <FormField control={doctorForm.control} name="userId" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Link to User Account</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value.toString()}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select a user" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {usersList?.filter((u) => u.role === "DOCTOR" && !linkedUserIds.has(u.id)).map((u) => (
                              <SelectItem key={u.id} value={u.id.toString()}>{u.name} ({u.email})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />

                    {/* Role checkboxes */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-foreground">Surgical Roles</p>
                      <div className="grid grid-cols-1 gap-2">
                        {[
                          { name: "isSurgeon" as const, label: "Mark as Surgeon", icon: <Scissors className="w-3.5 h-3.5" />, hint: "Can be assigned as primary surgeon." },
                          { name: "isAssistantSurgeon" as const, label: "Mark as Assistant Surgeon", icon: <Scissors className="w-3.5 h-3.5 opacity-70" />, hint: "Can assist in surgical procedures." },
                          { name: "isAnaesthetist" as const, label: "Mark as Anaesthetist", icon: <Activity className="w-3.5 h-3.5" />, hint: "Can be assigned as anaesthetist in surgeries." },
                          { name: "isOtAssistant" as const, label: "Mark as OT Assistant", icon: <Settings2 className="w-3.5 h-3.5" />, hint: "Can be assigned as OT assistant." },
                        ].map(({ name, label, icon, hint }) => (
                          <FormField key={name} control={doctorForm.control} name={name} render={({ field }) => (
                            <FormItem className="flex items-center gap-3 rounded-lg border border-border/50 p-3 bg-secondary/20">
                              <FormControl>
                                <Checkbox data-testid={`checkbox-${name}`} checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                              <div className="space-y-0.5 leading-none">
                                <FormLabel className="cursor-pointer flex items-center gap-1.5 font-medium">
                                  {icon} {label}
                                </FormLabel>
                                <p className="text-xs text-muted-foreground">{hint}</p>
                              </div>
                            </FormItem>
                          )} />
                        ))}
                      </div>
                    </div>

                    <Button type="submit" className="w-full" disabled={createDoctor.isPending}>Save Profile</Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      <Card className="border-border/50 shadow-md">
        <CardHeader className="py-4 border-b bg-secondary/20">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search doctors..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background border-border/60" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader className="bg-secondary/40">
                <TableRow>
                  <TableHead>Doctor Name</TableHead>
                  <TableHead>Specialization</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead className="text-right">Default Visit Charge</TableHead>
                  <TableHead className="text-right">Charge Config</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDoctors?.map((doc) => (
                  <TableRow key={doc.id} data-testid={`row-doctor-${doc.id}`}>
                    <TableCell className="font-bold">
                      <div className="flex items-center gap-2">
                        <Stethoscope className="w-4 h-4 text-primary shrink-0" /> Dr. {doc.name}
                      </div>
                    </TableCell>
                    <TableCell>{doc.specialization}</TableCell>
                    <TableCell><DoctorRoleBadges doc={doc} /></TableCell>
                    <TableCell className="text-right font-medium">₹{doc.visitCharge}</TableCell>
                    <TableCell className="text-right">
                      {(currentUser?.role === "ADMIN" || currentUser?.role === "MANAGER") && (
                        <div className="flex justify-end gap-2">
                          <RoomChargesDialog doctor={doc} />
                          <SurgeryChargesDialog doctor={doc} />
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
