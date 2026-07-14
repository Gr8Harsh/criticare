import { useMemo, useState } from "react";
import { Link } from "wouter";
import { usePatients, useCreatePatient } from "@/hooks/use-patients";
import { useRoomTypes } from "@/hooks/use-room-types";
import { useDoctors } from "@/hooks/use-doctors";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Search, Calendar, Phone, Pencil } from "lucide-react";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertPatientSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";

const formSchema = insertPatientSchema.extend({
  roomTypeId: z.coerce.number().min(1, "Room type is required"),
  advanceAmount: z.coerce.number().min(0, "Advance amount must be 0 or more"),
  admissionDateInput: z.string().min(1, "Admission date is required"),
  admissionTimeInput: z.string().min(1, "Admission time is required"),
  discountAmount: z.coerce.number().min(0, "Discount must be 0 or more").default(0),
  discountType: z.enum(["SELF", "TRUST"]).optional().nullable(),
  packageAmount: z.coerce.number().min(0, "Package amount must be 0 or more").default(0),
  registrationCharge: z.coerce.number().min(0).default(400),
  doctorId: z.coerce.number().optional(),
  ipdNumber: z.string().optional(),
}).partial({
  illness: true,
  phone: true,
});

function formatDoctorName(name: string) {
  const trimmed = name.trim();
  return /^dr\.?\s+/i.test(trimmed) ? trimmed : `Dr. ${trimmed}`;
}

export default function PatientsList() {
  const { data: patients, isLoading } = usePatients();
  const { data: user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [advancePatient, setAdvancePatient] = useState<any | null>(null);
  const [advanceAmount, setAdvanceAmount] = useState("");

  const updateAdvance = useMutation({
    mutationFn: async () => {
      if (!advancePatient) return null;
      const res = await fetch(`/api/patients/${advancePatient.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ advanceAmount: Number(advanceAmount || 0) }),
      });
      if (!res.ok) throw new Error("Failed to update advance amount");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.patients.list.path] });
      if (advancePatient) {
        queryClient.invalidateQueries({ queryKey: [api.patients.get.path, advancePatient.id] });
        queryClient.invalidateQueries({ queryKey: [api.patients.getBill.path, advancePatient.id] });
      }
      toast({ title: "Advance updated", description: "Patient advance amount saved." });
      setAdvancePatient(null);
      setAdvanceAmount("");
    },
    onError: () => toast({ title: "Error", description: "Failed to update advance amount.", variant: "destructive" }),
  });

  const openAdvanceDialog = (patient: any) => {
    setAdvancePatient(patient);
    setAdvanceAmount(String(patient.advanceAmount ?? 0));
  };

  const filteredPatients = patients
    ?.filter(p => 
      p.name.toLowerCase().includes(search.toLowerCase()) || 
      (p.ipdNumber ?? "").toLowerCase().includes(search.toLowerCase())
    )
    .sort((left, right) => new Date(right.admissionDate).getTime() - new Date(left.admissionDate).getTime());

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Patients</h1>
          <p className="text-muted-foreground">Manage IPD admissions and records.</p>
        </div>
        {(user?.role === 'MANAGER' || user?.role === 'ADMIN') && (
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="hover-elevate shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl">
                <Plus className="w-5 h-5 mr-2" /> Add Patient
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-display text-2xl text-primary">New Admission</DialogTitle>
              </DialogHeader>
              <AddPatientForm onSuccess={() => setIsAddOpen(false)} />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card className="border-border/50 shadow-md">
        <CardHeader className="py-4 border-b bg-secondary/20">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name or IPD..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 rounded-xl bg-background border-border/60"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : (
            <Table>
              <TableHeader className="bg-secondary/40">
                <TableRow>
                  <TableHead className="font-semibold text-foreground">IPD No.</TableHead>
                  <TableHead className="font-semibold text-foreground">Patient Name</TableHead>
                  <TableHead className="font-semibold text-foreground">Room No.</TableHead>
                  <TableHead className="font-semibold text-foreground">Illness</TableHead>
                  <TableHead className="font-semibold text-foreground">Admission Date</TableHead>
                  <TableHead className="text-right font-semibold text-foreground">Advance</TableHead>
                  <TableHead className="font-semibold text-foreground">Status</TableHead>
                  <TableHead className="text-right font-semibold text-foreground">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPatients?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No patients found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPatients?.map((patient) => (
                    <TableRow key={patient.id} className="hover:bg-secondary/20 transition-colors">
                      <TableCell className="font-medium text-primary">{patient.ipdNumber}</TableCell>
                      <TableCell className="font-bold">{patient.name}</TableCell>
                      <TableCell className="font-medium">{patient.bedNumber || "N/A"}</TableCell>
                      <TableCell>{patient.illness || "Not specified"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(patient.admissionDate), "MMM dd, yyyy")}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="gap-2"
                          onClick={() => openAdvanceDialog(patient)}
                        >
                          ₹{(patient.advanceAmount ?? 0).toLocaleString()}
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Badge variant={patient.discharged ? "secondary" : "default"} className={!patient.discharged ? "bg-emerald-500 hover:bg-emerald-600" : ""}>
                          {patient.discharged ? "Discharged" : "Admitted"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" asChild className="rounded-lg hover-elevate font-semibold border-primary/20 hover:border-primary text-primary">
                          <Link href={`/patients/${patient.id}`}>View Details</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Dialog open={!!advancePatient} onOpenChange={(open) => { if (!open) setAdvancePatient(null); }}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle className="font-display">Edit Advance Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Patient</p>
              <p className="font-semibold">{advancePatient?.name}</p>
            </div>
            <div className="space-y-1.5">
              <FormLabel>Advance Amount</FormLabel>
              <Input
                type="number"
                min={0}
                value={advanceAmount}
                onChange={(event) => setAdvanceAmount(event.target.value)}
                data-testid="input-edit-advance-amount"
              />
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => updateAdvance.mutate()} disabled={updateAdvance.isPending}>
                {updateAdvance.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
              <Button type="button" variant="outline" className="flex-1" onClick={() => setAdvancePatient(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AddPatientForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const createPatient = useCreatePatient();
  const { data: roomTypes } = useRoomTypes();
  const { data: roomNumbers = [] } = useQuery<Array<{ id: number; roomTypeId: number; number: string }>>({
    queryKey: [api.roomNumbers.list.path],
  });
  const { data: patients = [] } = usePatients();
  const { data: doctors } = useDoctors();
  const today = format(new Date(), "yyyy-MM-dd");
  const currentTime = format(new Date(), "HH:mm");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ipdNumber: "", name: "", gender: "Male", dateOfBirth: "", phone: "", relativePhone: "", illness: "", roomTypeId: 0, bedNumber: "", advanceAmount: 0, discharged: false, doctorId: undefined
      , admissionDateInput: today, admissionTimeInput: currentTime, discountAmount: 0, discountType: null, packageAmount: 0, registrationCharge: 400
    },
  });

  const selectedRoomTypeId = Number(form.watch("roomTypeId") ?? 0);

  const availableRooms = useMemo(() => {
    if (!selectedRoomTypeId) return [];

    const occupiedRoomNumbers = new Set(
      patients
        .filter((patient) => !patient.discharged && patient.roomTypeId === selectedRoomTypeId)
        .map((patient) => patient.bedNumber?.trim().toLowerCase())
        .filter(Boolean),
    );

    return roomNumbers
      .filter((room) => room.roomTypeId === selectedRoomTypeId)
      .filter((room) => !occupiedRoomNumbers.has(room.number.trim().toLowerCase()))
      .sort((left, right) => left.number.localeCompare(right.number, undefined, { numeric: true, sensitivity: "base" }));
  }, [patients, roomNumbers, selectedRoomTypeId]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    const { admissionDateInput, admissionTimeInput, ...patientValues } = values as any;
    createPatient.mutate({
      ...patientValues,
      admissionDate: new Date(`${admissionDateInput}T${admissionTimeInput || "00:00"}`),
      discountType: patientValues.discountAmount > 0 ? patientValues.discountType : null,
      packageAmount: Number(patientValues.packageAmount || 0),
      registrationCharge: 400,
    } as any, {
      onSuccess: () => {
        toast({ title: "Success", description: "Patient admitted successfully." });
        onSuccess();
      },
      onError: (err) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
        <FormField control={form.control} name="ipdNumber" render={({ field }) => (
          <FormItem>
            <FormLabel>IPD Number <span className="text-muted-foreground font-normal">(Optional — leave blank to mark as N/A)</span></FormLabel>
            <FormControl><Input placeholder="e.g. IPD-2024-001" data-testid="input-ipd-number" {...field} value={field.value ?? ""} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="name" render={({ field }) => (
            <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="gender" render={({ field }) => (
            <FormItem>
              <FormLabel>Gender</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="admissionDateInput" render={({ field }) => (
            <FormItem><FormLabel>Admission Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="admissionTimeInput" render={({ field }) => (
            <FormItem>
              <FormLabel>Admission Time</FormLabel>
              <div className="flex gap-2">
                <FormControl><Input type="time" {...field} /></FormControl>
                <Button type="button" variant="outline" className="shrink-0" onClick={() => form.setValue("admissionTimeInput", format(new Date(), "HH:mm"))}>
                  Current
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="dateOfBirth" render={({ field }) => (
            <FormItem><FormLabel>Date of Birth</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="illness" render={({ field }) => (
            <FormItem><FormLabel>Illness / Diagnosis (Optional)</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="phone" render={({ field }) => (
            <FormItem><FormLabel>Phone Number (Optional)</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="relativePhone" render={({ field }) => (
            <FormItem><FormLabel>Relative's Phone (Optional)</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="roomTypeId" render={({ field }) => (
            <FormItem>
              <FormLabel>Room Type</FormLabel>
              <Select onValueChange={(value) => {
                field.onChange(value);
                form.setValue("bedNumber", "");
              }} defaultValue={field.value?.toString()}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select room type" /></SelectTrigger></FormControl>
                <SelectContent>
                  {roomTypes?.map(rt => (
                    <SelectItem key={rt.id} value={rt.id.toString()}>{rt.name} (₹{rt.dailyCharge}/day)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="bedNumber" render={({ field }) => (
            <FormItem>
              <FormLabel>Room Number</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder={selectedRoomTypeId ? "Select available room" : "Select room type first"} /></SelectTrigger></FormControl>
                <SelectContent>
                  {availableRooms.length > 0 ? (
                    availableRooms.map((room) => (
                      <SelectItem key={room.id} value={room.number}>{room.number}</SelectItem>
                    ))
                  ) : (
                    <SelectItem value="__none" disabled>
                      {selectedRoomTypeId ? "No unoccupied rooms available" : "Select room type first"}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="doctorId" render={({ field }) => (
          <FormItem>
            <FormLabel>Assign Doctor</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value?.toString()}>
              <FormControl><SelectTrigger><SelectValue placeholder="Select doctor" /></SelectTrigger></FormControl>
              <SelectContent>
                {doctors?.map(doc => (
                  <SelectItem key={doc.id} value={doc.id.toString()}>{formatDoctorName(doc.name)} ({doc.specialization})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="advanceAmount" render={({ field }) => (
          <FormItem>
            <FormLabel>Advance Amount</FormLabel>
            <FormControl><Input type="number" min={0} placeholder="0" {...field} value={field.value ?? 0} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="packageAmount" render={({ field }) => (
            <FormItem>
              <FormLabel>Package Amount (Optional)</FormLabel>
              <FormControl><Input type="number" min={0} placeholder="0" {...field} value={field.value ?? 0} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="registrationCharge" render={({ field }) => (
            <FormItem>
              <FormLabel>Registration Charge</FormLabel>
              <FormControl><Input type="number" min={0} disabled {...field} value={field.value ?? 400} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="discountAmount" render={({ field }) => (
            <FormItem>
              <FormLabel>Discount Amount</FormLabel>
              <FormControl><Input type="number" min={0} placeholder="0" {...field} value={field.value ?? 0} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="discountType" render={({ field }) => (
            <FormItem>
              <FormLabel>Discount From</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? ""}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select if discount given" /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="SELF">Self</SelectItem>
                  <SelectItem value="TRUST">Trust</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <Button type="submit" className="w-full mt-4" disabled={createPatient.isPending}>
          {createPatient.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Admit Patient
        </Button>
      </form>
    </Form>
  );
}
