import { useParams, Link } from "wouter";
import { usePatient, usePatientBill, useDischargePatient, useAssignDoctor, useAssignedDoctors, useUpdatePatient } from "@/hooks/use-patients";
import { useCreateVisit, useCreatePrescription, useCreateCharge } from "@/hooks/use-billing";
import { useDoctors } from "@/hooks/use-doctors";
import { useMedicines } from "@/hooks/use-medicines";
import { useRoomTypes } from "@/hooks/use-room-types";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Printer, FileText, Activity, CreditCard, Loader2, Pill, UserPlus, Plus, X, Pencil, Stethoscope, Scissors, ArrowRightLeft, BedDouble, UserCheck } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { insertChargeSchema } from "@shared/schema";
import { api } from "@shared/routes";

export default function PatientDetails() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const { data: user } = useAuth();
  const { data: patient, isLoading: pLoading } = usePatient(id);
  const { data: bill, isLoading: bLoading } = usePatientBill(id);
  const { data: assignedDoctors } = useAssignedDoctors(id);
  const dischargeMutation = useDischargePatient();
  const { toast } = useToast();
  const [editOpen, setEditOpen] = useState(false);

  if (pLoading || bLoading) return <div className="flex p-20 justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;
  if (!patient || !bill) return (
    <div className="flex flex-col items-center justify-center p-20 gap-4">
      <p className="text-xl font-semibold text-foreground">Patient not found</p>
      <p className="text-muted-foreground">This patient record does not exist or you don't have access.</p>
      <Button asChild variant="outline"><Link href="/patients">Back to Patients</Link></Button>
    </div>
  );

  const handleDischarge = () => {
    if (confirm("Are you sure you want to discharge this patient? This action finalizes the bill.")) {
      dischargeMutation.mutate(id, {
        onSuccess: () => toast({ title: "Success", description: "Patient discharged." })
      });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 no-print">
        <Button variant="ghost" size="icon" asChild className="hover-elevate rounded-xl bg-card border-border/50">
          <Link href="/patients"><ArrowLeft className="w-5 h-5" /></Link>
        </Button>
        <h1 className="text-2xl font-display font-bold tracking-tight">Patient Record</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Info Card */}
        <Card className="md:col-span-2 border-border/50 shadow-md bg-gradient-to-br from-card to-secondary/20 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
          <CardContent className="p-8 relative z-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-3xl font-display font-bold text-foreground">{patient.name}</h2>
                  <Badge variant={patient.discharged ? "secondary" : "default"} className={!patient.discharged ? "bg-emerald-500" : ""}>
                    {patient.discharged ? "Discharged" : "Admitted"}
                  </Badge>
                </div>
                <p className="text-primary font-bold bg-primary/10 inline-block px-3 py-1 rounded-lg text-sm">
                  IPD: {patient.ipdNumber}
                </p>
              </div>
              <div className="flex gap-2 no-print">
                {(user?.role === 'MANAGER' || user?.role === 'ADMIN') && !patient.discharged && (
                  <>
                    <Button onClick={() => setEditOpen(true)} variant="outline" data-testid="button-edit-patient">
                      <Pencil className="w-4 h-4 mr-2" /> Edit Details
                    </Button>
                    <Button onClick={handleDischarge} disabled={dischargeMutation.isPending} variant="outline" className="border-destructive text-destructive hover:bg-destructive hover:text-white transition-colors">
                      {dischargeMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Discharge Patient
                    </Button>
                  </>
                )}
                <Button onClick={handlePrint} className="bg-foreground text-background hover:bg-foreground/90 hover-elevate">
                  <Printer className="w-4 h-4 mr-2" /> Print Bill
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
              <div><p className="text-muted-foreground mb-1">Age/Gender</p><p className="font-semibold">{new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear()}y / {patient.gender}</p></div>
              <div><p className="text-muted-foreground mb-1">Admission Date</p><p className="font-semibold">{format(new Date(patient.admissionDate), "MMM dd, yyyy")}</p></div>
              <div><p className="text-muted-foreground mb-1">Bed Assigned</p><p className="font-semibold">{patient.bedNumber}</p></div>
              <div><p className="text-muted-foreground mb-1">Diagnosis</p><p className="font-semibold">{patient.illness || "Not specified"}</p></div>
              <div><p className="text-muted-foreground mb-1">Assigned Doctor</p><p className="font-semibold">{assignedDoctors && assignedDoctors.length > 0 ? `Dr. ${assignedDoctors[0].doctorName}` : "Not assigned"}</p></div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats Card */}
        <Card className="border-border/50 shadow-md">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-display">Bill Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-border/50">
              <span className="text-muted-foreground text-sm">Days Admitted</span>
              <span className="font-bold">{bill.daysAdmitted} Days</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Room Charge</span>
              <span className="font-medium">₹{(bill.roomCharge ?? 0).toLocaleString()}</span>
            </div>
            {(bill.roomNursingCharges ?? 0) > 0 && <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Nursing Charge</span>
              <span className="font-medium">₹{bill.roomNursingCharges.toLocaleString()}</span>
            </div>}
            {(bill.rmoCharges ?? 0) > 0 && <div className="flex justify-between items-center text-sm pb-2 border-b border-border/50">
              <span className="text-muted-foreground">RMO Charge</span>
              <span className="font-medium">₹{bill.rmoCharges.toLocaleString()}</span>
            </div>}
            <div className="flex justify-between items-center text-sm pb-2 border-b border-border/50">
              <span className="text-muted-foreground">Services &amp; Others</span>
              <span className="font-medium">₹{(bill.doctorCharges + bill.nursingCharges + bill.otherCharges + (bill.procedureCharges ?? 0) + (bill.surgeryCharges ?? 0)).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-sm pb-2 border-b border-border/50">
              <span className="text-muted-foreground">Medicines</span>
              <span className="font-medium">₹{bill.medicineCharges.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center pt-1">
              <span className="text-lg font-display text-primary">Grand Total</span>
              <span className="text-2xl font-bold text-primary">₹{bill.grandTotal.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="visits" className="no-print">
        <TabsList className="bg-secondary/50 p-1 rounded-xl flex-wrap h-auto gap-1">
          <TabsTrigger value="visits" className="rounded-lg px-5"><Activity className="w-4 h-4 mr-2" /> Visits</TabsTrigger>
          <TabsTrigger value="medicines" className="rounded-lg px-5"><Pill className="w-4 h-4 mr-2" /> Medicines</TabsTrigger>
          <TabsTrigger value="procedures" className="rounded-lg px-5"><Stethoscope className="w-4 h-4 mr-2" /> Procedures</TabsTrigger>
          <TabsTrigger value="surgery" className="rounded-lg px-5"><Scissors className="w-4 h-4 mr-2" /> Surgery</TabsTrigger>
          <TabsTrigger value="room-charges" className="rounded-lg px-5"><BedDouble className="w-4 h-4 mr-2" /> Room Charges</TabsTrigger>
          <TabsTrigger value="room-switch" className="rounded-lg px-5"><ArrowRightLeft className="w-4 h-4 mr-2" /> Room Switch</TabsTrigger>
          <TabsTrigger value="charges" className="rounded-lg px-5"><CreditCard className="w-4 h-4 mr-2" /> Extra Charges</TabsTrigger>
          <TabsTrigger value="bill" className="rounded-lg px-5"><FileText className="w-4 h-4 mr-2" /> Detailed Bill</TabsTrigger>
        </TabsList>
        
        <div className="mt-6">
          <TabsContent value="visits"><VisitsTab patient={patient} visits={bill.visits} isManager={user?.role === 'MANAGER'} visitCharges={bill.visitCharges} /></TabsContent>
          <TabsContent value="medicines"><MedicinesTab patient={patient} prescriptions={bill.prescriptions} isManager={user?.role === 'MANAGER'} /></TabsContent>
          <TabsContent value="procedures"><ProceduresTab patient={patient} procedures={bill.procedures ?? []} isManager={user?.role === 'MANAGER'} /></TabsContent>
          <TabsContent value="surgery"><SurgeryTab patient={patient} surgeries={bill.surgeries ?? []} isManager={user?.role === 'MANAGER'} /></TabsContent>
          <TabsContent value="room-charges"><RoomChargesTab patient={patient} roomChargesList={bill.roomChargesList ?? []} roomSwitches={bill.roomSwitches ?? []} canManage={user?.role === 'MANAGER' || user?.role === 'ADMIN'} /></TabsContent>
          <TabsContent value="room-switch"><RoomSwitchTab patient={patient} roomSwitches={bill.roomSwitches ?? []} isManager={user?.role === 'MANAGER'} /></TabsContent>
          <TabsContent value="charges"><ChargesTab patient={patient} charges={bill.charges} isManager={user?.role === 'MANAGER'} /></TabsContent>
          <TabsContent value="bill"><BillView patient={patient} bill={bill} /></TabsContent>
        </div>
      </Tabs>

      {/* Hidden Print Container */}
      <div className="print-bill-container hidden">
        <BillView patient={patient} bill={bill} printMode={true} />
      </div>

      <EditPatientDialog patient={patient} open={editOpen} onOpenChange={setEditOpen} />
    </div>
  );
}

// ----------------------------------------------------------------------------
// TABS COMPONENTS
// ----------------------------------------------------------------------------

function VisitsTab({ patient, visits, isManager, visitCharges }: { patient: any, visits: any[], isManager: boolean, visitCharges?: number }) {
  const { data: user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const canManage = isManager || isAdmin;
  const [open, setOpen] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null);
  const { data: doctors } = useDoctors();
  const { data: roomTypes } = useRoomTypes();
  const createVisit = useCreateVisit();
  const assignDoctor = useAssignDoctor();

  const { data: doctorRoomCharges } = useQuery<any[]>({
    queryKey: [`/api/doctors/${selectedDoctorId}/room-charges`],
    enabled: selectedDoctorId !== null,
  });

  const visitForm = useForm({ defaultValues: { doctorId: "", charge: "" }});
  
  const onSubmit = (data: any) => {
    createVisit.mutate({ patientId: patient.id, doctorId: parseInt(data.doctorId), charge: parseInt(data.charge) }, {
      onSuccess: () => { setOpen(false); setSelectedDoctorId(null); }
    });
  };

  useEffect(() => {
    if (selectedDoctorId && doctorRoomCharges !== undefined) {
      const doc = doctors?.find(d => d.id === selectedDoctorId);
      if (!doc) return;
      const roomSpecificCharge = doctorRoomCharges.find(rc => rc.roomTypeId === patient.roomTypeId)?.charge;
      visitForm.setValue("charge", (roomSpecificCharge ?? doc.visitCharge).toString());
    }
  }, [doctorRoomCharges, selectedDoctorId]);

  const handleDoctorChange = (val: string) => {
    const docId = parseInt(val);
    setSelectedDoctorId(docId);
    const doc = doctors?.find(d => d.id === docId);
    if (!doc) return;
    visitForm.setValue("charge", doc.visitCharge.toString());
  };

  const handleAssignDoctor = (doctorId: number) => {
    assignDoctor.mutate({ patientId: patient.id, doctorId });
  };

  return (
    <Card className="border-border/50 shadow-md">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-display">Doctor Visits</CardTitle>
        {!patient.discharged && (
          <div className="flex gap-2">
            {canManage && doctors && (
              <Select onValueChange={(val) => handleAssignDoctor(parseInt(val))}>
                <SelectTrigger className="w-[180px] h-9"><UserPlus className="w-4 h-4 mr-2" /><SelectValue placeholder="Assign Doctor" /></SelectTrigger>
                <SelectContent>{doctors.map(d => <SelectItem key={d.id} value={d.id.toString()}>{d.name} ({d.specialization})</SelectItem>)}</SelectContent>
              </Select>
            )}
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setSelectedDoctorId(null); }}>
              <DialogTrigger asChild>
                <Button size="sm" className="hover-elevate"><Plus className="w-4 h-4 mr-2" /> Add Visit</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Record Doctor Visit</DialogTitle></DialogHeader>
                <Form {...visitForm}>
                  <form onSubmit={visitForm.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField control={visitForm.control} name="doctorId" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Doctor</FormLabel>
                        <Select onValueChange={(val) => { field.onChange(val); handleDoctorChange(val); }}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select Doctor" /></SelectTrigger></FormControl>
                          <SelectContent>{doctors?.map(d => <SelectItem key={d.id} value={d.id.toString()}>Dr. {d.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                    <FormField control={visitForm.control} name="charge" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Charge (₹)</FormLabel>
                        <FormControl><Input type="number" {...field} /></FormControl>
                        {selectedDoctorId && doctorRoomCharges?.find(rc => rc.roomTypeId === patient.roomTypeId) && (
                          <p className="text-xs text-muted-foreground">Auto-filled from room-type charge for this patient's room.</p>
                        )}
                      </FormItem>
                    )} />
                    <Button type="submit" className="w-full" disabled={createVisit.isPending}>Save Visit</Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {(() => {
          const roomType = roomTypes?.find((r: any) => r.id === patient.roomTypeId);
          const dailyVisitCharge = roomType?.visitCharge ?? 0;
          if (dailyVisitCharge > 0 || (visitCharges ?? 0) > 0) {
            return (
              <div className="flex items-center justify-between rounded-lg border border-border/50 bg-primary/5 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <UserCheck className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Daily Visit Charge</p>
                    <p className="text-xs text-muted-foreground">
                      ₹{dailyVisitCharge.toLocaleString()}/day · {roomType?.name ?? "Current room"} · auto-calculated
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-primary">₹{(visitCharges ?? 0).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">total</p>
                </div>
              </div>
            );
          }
          return null;
        })()}
        <Table>
          <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Doctor</TableHead><TableHead className="text-right">Charge</TableHead></TableRow></TableHeader>
          <TableBody>
            {visits.length === 0 ? (
              <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">No visits recorded yet.</TableCell></TableRow>
            ) : visits.map((v: any) => (
              <TableRow key={v.id}>
                <TableCell>{format(new Date(v.date), "MMM dd, yyyy HH:mm")}</TableCell>
                <TableCell>Dr. {doctors?.find(d => d.id === v.doctorId)?.name || 'Unknown'}</TableCell>
                <TableCell className="text-right font-medium">₹{v.charge}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function MedicinesTab({ patient, prescriptions, isManager }: { patient: any, prescriptions: any[], isManager: boolean }) {
  const { data: user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const canManage = isManager || isAdmin;
  const [open, setOpen] = useState(false);
  const { data: medicines } = useMedicines();
  const createPrescription = useCreatePrescription();

  const form = useForm({ defaultValues: { medicineId: "", quantity: "1" }});

  const onSubmit = (data: any) => {
    const med = medicines?.find(m => m.id.toString() === data.medicineId);
    if (!med) return;
    const totalCost = med.unitCost * parseInt(data.quantity);
    createPrescription.mutate({ patientId: patient.id, medicineId: parseInt(data.medicineId), quantity: parseInt(data.quantity), totalCost }, {
      onSuccess: () => setOpen(false)
    });
  };

  return (
    <Card className="border-border/50 shadow-md">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-display">Prescribed Medicines</CardTitle>
        {!patient.discharged && canManage && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="hover-elevate"><Plus className="w-4 h-4 mr-2" /> Add Medicine</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Prescription</DialogTitle></DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField control={form.control} name="medicineId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Medicine</FormLabel>
                      <Select onValueChange={field.onChange}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select Medicine" /></SelectTrigger></FormControl>
                        <SelectContent>{medicines?.map(m => <SelectItem key={m.id} value={m.id.toString()}>{m.name} (₹{m.unitCost})</SelectItem>)}</SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="quantity" render={({ field }) => (
                    <FormItem><FormLabel>Quantity</FormLabel><FormControl><Input type="number" min="1" {...field} /></FormControl></FormItem>
                  )} />
                  <Button type="submit" className="w-full" disabled={createPrescription.isPending}>Save</Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Medicine</TableHead><TableHead>Quantity</TableHead><TableHead className="text-right">Total Cost</TableHead></TableRow></TableHeader>
          <TableBody>
            {prescriptions.map((p: any) => (
              <TableRow key={p.id}>
                <TableCell>{format(new Date(p.date), "MMM dd, yyyy")}</TableCell>
                <TableCell>{medicines?.find(m => m.id === p.medicineId)?.name || 'Unknown'}</TableCell>
                <TableCell>{p.quantity}</TableCell>
                <TableCell className="text-right font-medium">₹{p.totalCost}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ChargesTab({ patient, charges, isManager }: { patient: any, charges: any[], isManager: boolean }) {
  const { data: user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const canManage = isManager || isAdmin;
  const [open, setOpen] = useState(false);
  const createCharge = useCreateCharge();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const chargeFormSchema = z.object({ 
    description: z.string().min(1, "Description is required"),
    amount: z.coerce.number().min(1, "Amount must be greater than 0"),
  });
  const form = useForm<z.infer<typeof chargeFormSchema>>({
    resolver: zodResolver(chargeFormSchema),
    defaultValues: { description: "", amount: 0 }
  });

  const onSubmit = (data: z.infer<typeof chargeFormSchema>) => {
    createCharge.mutate({ patientId: patient.id, type: "OTHER", description: data.description, amount: data.amount }, {
      onSuccess: () => {
        toast({ title: "Success", description: "Charge added successfully." });
        form.reset({ description: "", amount: 0 });
        setOpen(false);
      },
      onError: (error: any) => {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
    });
  };

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to remove this charge?")) {
      const res = await fetch(`/api/charges/${id}`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) {
        toast({ title: "Success", description: "Charge removed." });
        queryClient.invalidateQueries({ queryKey: [api.patients.getBill.path, patient.id] });
      } else {
        toast({ title: "Error", description: "Failed to remove charge.", variant: "destructive" });
      }
    }
  };

  return (
    <Card className="border-border/50 shadow-md">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-display">Additional Charges</CardTitle>
        {!patient.discharged && canManage && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="hover-elevate bg-primary hover:bg-primary/90"><Plus className="w-4 h-4 mr-2" /> Add Charge</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px]">
              <DialogHeader>
                <DialogTitle className="font-display">Add Extra Charge</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Nursing, Physiotherapy, etc." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="amount" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="0.01" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90" disabled={createCharge.isPending}>
                      {createCharge.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Save
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
                      Cancel
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {charges.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No additional charges</div>
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="w-[50px]"></TableHead></TableRow></TableHeader>
            <TableBody>
              {charges.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell>{format(new Date(c.date), "MMM dd, yyyy")}</TableCell>
                  <TableCell>{c.description || c.type}</TableCell>
                  <TableCell className="text-right font-medium">₹{c.amount}</TableCell>
                  <TableCell className="text-right">
                    {!patient.discharged && canManage && (
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)} className="text-destructive hover:bg-destructive/10" data-testid={`button-delete-charge-${c.id}`}>
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function ProceduresTab({ patient, procedures, isManager }: { patient: any, procedures: any[], isManager: boolean }) {
  const { data: user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const canManage = isManager || isAdmin;
  const [open, setOpen] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: doctors } = useDoctors();
  const { data: catalog } = useQuery<any[]>({ queryKey: ["/api/procedure-catalog"] });

  const schema = z.object({
    name: z.string().min(1, "Procedure name is required"),
    description: z.string().optional(),
    cost: z.coerce.number().min(0, "Cost must be 0 or more"),
  });
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", description: "", cost: 0 },
  });

  const resetDialog = () => {
    form.reset({ name: "", description: "", cost: 0 });
    setSelectedDoctorId("");
  };

  const createProcedure = useMutation({
    mutationFn: async (data: z.infer<typeof schema>) => {
      const res = await fetch("/api/procedures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          patientId: patient.id,
          doctorId: selectedDoctorId ? parseInt(selectedDoctorId) : undefined,
        }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to add procedure");
      return res.json();
    },
    onSuccess: async () => {
      toast({ title: "Success", description: "Procedure added successfully." });
      await queryClient.refetchQueries({ queryKey: [api.patients.getBill.path, patient.id] });
      resetDialog();
      setOpen(false);
    },
    onError: () => toast({ title: "Error", description: "Failed to add procedure.", variant: "destructive" }),
  });

  const handleDelete = async (id: number) => {
    if (confirm("Remove this procedure?")) {
      const res = await fetch(`/api/procedures/${id}`, { method: "DELETE", credentials: "include" });
      if (res.ok) {
        toast({ title: "Success", description: "Procedure removed." });
        await queryClient.refetchQueries({ queryKey: [api.patients.getBill.path, patient.id] });
      } else {
        toast({ title: "Error", description: "Failed to remove procedure.", variant: "destructive" });
      }
    }
  };

  const handleCatalogSelect = (catalogId: string) => {
    const item = catalog?.find(c => c.id.toString() === catalogId);
    if (item) {
      form.setValue("name", item.name);
      form.setValue("description", item.description ?? "");
      form.setValue("cost", item.cost);
    }
  };

  return (
    <Card className="border-border/50 shadow-md">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-display">Procedures</CardTitle>
        {!patient.discharged && canManage && (
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetDialog(); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="hover-elevate bg-primary hover:bg-primary/90" data-testid="button-add-procedure">
                <Plus className="w-4 h-4 mr-2" /> Add Procedure
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[460px]">
              <DialogHeader>
                <DialogTitle className="font-display">Add Procedure</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-1">
                {/* Step 1: Select Doctor */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Performing Doctor</label>
                  <Select value={selectedDoctorId} onValueChange={setSelectedDoctorId}>
                    <SelectTrigger data-testid="select-doctor-procedure">
                      <SelectValue placeholder="Select a doctor…" />
                    </SelectTrigger>
                    <SelectContent>
                      {doctors?.map(d => (
                        <SelectItem key={d.id} value={d.id.toString()}>
                          Dr. {d.name} — {d.specialization}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Step 2: Pick from catalog — shows after doctor selected */}
                {selectedDoctorId && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Select from Catalog <span className="text-muted-foreground font-normal">(charges)</span></label>
                    <Select onValueChange={handleCatalogSelect}>
                      <SelectTrigger data-testid="select-catalog-procedure">
                        <SelectValue placeholder="Pick a procedure to auto-fill…" />
                      </SelectTrigger>
                      <SelectContent>
                        {catalog && catalog.length > 0 ? catalog.map(c => (
                          <SelectItem key={c.id} value={c.id.toString()}>
                            {c.name} — ₹{c.cost.toLocaleString()}
                          </SelectItem>
                        )) : (
                          <SelectItem value="__empty" disabled>No procedures in catalog</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Selecting an item pre-fills the fields below.</p>
                  </div>
                )}

                <div className={`transition-opacity ${selectedDoctorId ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit((d) => createProcedure.mutate(d))} className="space-y-3">
                      <FormField control={form.control} name="name" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Procedure Name</FormLabel>
                          <FormControl>
                            <Input data-testid="input-procedure-name" placeholder="e.g. Appendectomy, MRI Scan, X-Ray" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="description" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                          <FormControl>
                            <Input data-testid="input-procedure-description" placeholder="Additional details…" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="cost" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Charge (₹)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                              <Input
                                type="number"
                                min="0"
                                className="pl-7"
                                placeholder="0"
                                data-testid="input-procedure-cost"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <div className="flex gap-2 pt-1">
                        <Button
                          type="submit"
                          className="flex-1 bg-primary hover:bg-primary/90"
                          disabled={createProcedure.isPending || !selectedDoctorId}
                          data-testid="button-save-procedure"
                        >
                          {createProcedure.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                          Save
                        </Button>
                        <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancel</Button>
                      </div>
                    </form>
                  </Form>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {procedures.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No procedures recorded</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Doctor</TableHead>
                <TableHead>Procedure</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {procedures.map((p: any) => (
                <TableRow key={p.id} data-testid={`row-procedure-${p.id}`}>
                  <TableCell>{format(new Date(p.date), "MMM dd, yyyy")}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.doctorId ? `Dr. ${doctors?.find(d => d.id === p.doctorId)?.name ?? "Unknown"}` : "—"}
                  </TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-muted-foreground">{p.description || "—"}</TableCell>
                  <TableCell className="text-right font-medium">₹{p.cost.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    {!patient.discharged && canManage && (
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)} className="text-destructive hover:bg-destructive/10" data-testid={`button-delete-procedure-${p.id}`}>
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function EditPatientDialog({ patient, open, onOpenChange }: { patient: any, open: boolean, onOpenChange: (v: boolean) => void }) {
  const { data: roomTypes } = useRoomTypes();
  const updatePatient = useUpdatePatient(patient.id);
  const { toast } = useToast();

  const schema = z.object({
    name: z.string().min(1, "Name is required"),
    gender: z.string().min(1, "Gender is required"),
    dateOfBirth: z.string().min(1, "Date of birth is required"),
    phone: z.string().optional(),
    relativePhone: z.string().optional(),
    illness: z.string().optional(),
    bedNumber: z.string().min(1, "Bed number is required"),
    roomTypeId: z.coerce.number().min(1, "Room type is required"),
  });

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: patient.name,
      gender: patient.gender,
      dateOfBirth: patient.dateOfBirth,
      phone: patient.phone ?? "",
      relativePhone: patient.relativePhone ?? "",
      illness: patient.illness ?? "",
      bedNumber: patient.bedNumber,
      roomTypeId: patient.roomTypeId,
    },
  });

  const onSubmit = (data: z.infer<typeof schema>) => {
    updatePatient.mutate(data, {
      onSuccess: () => {
        toast({ title: "Success", description: "Patient details updated." });
        onOpenChange(false);
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to update patient.", variant: "destructive" });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Edit Patient Details</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Full Name</FormLabel>
                  <FormControl><Input data-testid="input-patient-name" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="gender" render={({ field }) => (
                <FormItem>
                  <FormLabel>Gender</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger data-testid="select-gender"><SelectValue placeholder="Select gender" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="dateOfBirth" render={({ field }) => (
                <FormItem>
                  <FormLabel>Date of Birth</FormLabel>
                  <FormControl><Input type="date" data-testid="input-dob" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl><Input data-testid="input-phone" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="relativePhone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Relative Phone</FormLabel>
                  <FormControl><Input data-testid="input-relative-phone" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="illness" render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Diagnosis / Illness</FormLabel>
                  <FormControl><Input data-testid="input-illness" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="bedNumber" render={({ field }) => (
                <FormItem>
                  <FormLabel>Bed Number</FormLabel>
                  <FormControl><Input data-testid="input-bed-number" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="roomTypeId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Room Type</FormLabel>
                  <Select onValueChange={(v) => field.onChange(Number(v))} defaultValue={field.value?.toString()}>
                    <FormControl><SelectTrigger data-testid="select-room-type"><SelectValue placeholder="Select room type" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {roomTypes?.map(rt => (
                        <SelectItem key={rt.id} value={rt.id.toString()}>{rt.name} (₹{rt.dailyCharge}/day)</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" className="flex-1" disabled={updatePatient.isPending} data-testid="button-save-patient">
                {updatePatient.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
              <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

const SURGERY_CATEGORIES = [
  { key: "surgeryCharge",          label: "Surgery Charge",          category: "SURGERY" },
  { key: "surgeonCharge",          label: "Surgeon Charge",          category: "SURGEON" },
  { key: "assistantSurgeonCharge", label: "Assistant Surgeon Charge", category: "ASSISTANT_SURGEON" },
  { key: "anaesthetistCharge",     label: "Anaesthetist Charge",     category: "ANAESTHETIST" },
  { key: "otCharge",               label: "OT Charge",               category: "OT" },
  { key: "otAssistantCharge",      label: "OT Assistant Charge",     category: "OT_ASSISTANT" },
] as const;

// Mapping from surgery category key to doctor filter role and surgery-charge category key
const DOCTOR_CATEGORY_CONFIG: Record<string, { roleFilter: "isSurgeon" | "isAssistantSurgeon" | "isOtAssistant" | null; chargeCategory: string }> = {
  surgeonCharge:          { roleFilter: "isSurgeon",           chargeCategory: "SURGEON" },
  assistantSurgeonCharge: { roleFilter: "isAssistantSurgeon",  chargeCategory: "ASSISTANT_SURGEON" },
  anaesthetistCharge:     { roleFilter: null,                  chargeCategory: "ANAESTHETIST" },
  otCharge:               { roleFilter: null,                  chargeCategory: "OT" },
  otAssistantCharge:      { roleFilter: "isOtAssistant",       chargeCategory: "OT_ASSISTANT" },
};

function SurgeryTab({ patient, surgeries, isManager }: { patient: any, surgeries: any[], isManager: boolean }) {
  const { data: user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const canManage = isManager || isAdmin;
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: allDoctors } = useQuery<any[]>({ queryKey: [api.doctors.list.path] });
  const { data: catalog } = useQuery<any[]>({ queryKey: ["/api/surgery-catalog"] });

  const { data: surgeryNamesList } = useQuery<any[]>({ queryKey: ["/api/surgery-names"] });
  const [selectedSurgeryName, setSelectedSurgeryName] = useState<string>("");
  const defaultCharges = { surgeryCharge: "", surgeonCharge: "", assistantSurgeonCharge: "", anaesthetistCharge: "", otCharge: "", otAssistantCharge: "" };
  const [charges, setCharges] = useState<Record<string, string>>({ ...defaultCharges });
  const [selectedDoctors, setSelectedDoctors] = useState<Record<string, string>>({});

  const resetDialog = () => { setCharges({ ...defaultCharges }); setSelectedDoctors({}); setSelectedSurgeryName(""); };

  const handleCatalogSelect = (categoryKey: string, catalogId: string, cat: string) => {
    const item = catalog?.find((c: any) => c.id.toString() === catalogId && c.category === cat);
    if (item) setCharges(prev => ({ ...prev, [categoryKey]: item.cost.toString() }));
  };

  const handleDoctorSelect = async (categoryKey: string, doctorId: string) => {
    setSelectedDoctors(prev => ({ ...prev, [categoryKey]: doctorId }));
    const config = DOCTOR_CATEGORY_CONFIG[categoryKey];
    if (!config || !doctorId) return;
    try {
      const res = await fetch(`/api/doctors/${doctorId}/surgery-charges`, { credentials: "include" });
      if (res.ok) {
        const surgCharges: any[] = await res.json();
        const match = surgCharges.find((sc) => sc.category === config.chargeCategory);
        if (match) setCharges(prev => ({ ...prev, [categoryKey]: match.charge.toString() }));
      }
    } catch {}
  };

  const addSurgery = useMutation({
    mutationFn: async () => {
      const chargeBody = Object.fromEntries(
        Object.entries(charges).map(([k, v]) => [k, parseInt(v) || 0])
      );
      const body = {
        ...chargeBody,
        ...(selectedSurgeryName ? { surgeryName: selectedSurgeryName } : {}),
      };
      const res = await fetch(`/api/patients/${patient.id}/surgeries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to add surgery");
      return res.json();
    },
    onSuccess: async () => {
      toast({ title: "Success", description: "Surgery charges recorded." });
      await queryClient.refetchQueries({ queryKey: [api.patients.getBill.path, patient.id] });
      resetDialog();
      setOpen(false);
    },
    onError: () => toast({ title: "Error", description: "Failed to save surgery.", variant: "destructive" }),
  });

  const handleDelete = async (id: number) => {
    if (confirm("Remove this surgery record?")) {
      const res = await fetch(`/api/patient-surgeries/${id}`, { method: "DELETE", credentials: "include" });
      if (res.ok) {
        toast({ title: "Deleted", description: "Surgery record removed." });
        await queryClient.refetchQueries({ queryKey: [api.patients.getBill.path, patient.id] });
      } else {
        toast({ title: "Error", description: "Failed to remove surgery.", variant: "destructive" });
      }
    }
  };

  const totalForSurgery = (s: any) =>
    (s.surgeryCharge ?? 0) + (s.surgeonCharge ?? 0) + (s.assistantSurgeonCharge ?? 0) +
    (s.anaesthetistCharge ?? 0) + (s.otCharge ?? 0) + (s.otAssistantCharge ?? 0);

  const getFilteredDoctors = (roleFilter: string | null) => {
    if (!allDoctors) return [];
    if (!roleFilter) return allDoctors;
    return allDoctors.filter((d) => d[roleFilter]);
  };

  return (
    <Card className="border-border/50 shadow-md">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-display">Surgery Records</CardTitle>
        {!patient.discharged && canManage && (
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetDialog(); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="hover-elevate bg-primary hover:bg-primary/90" data-testid="button-add-surgery">
                <Plus className="w-4 h-4 mr-2" /> Add Surgery
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[560px]">
              <DialogHeader>
                <DialogTitle className="font-display">Record Surgery Charges</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 pt-1 max-h-[70vh] overflow-y-auto pr-1">

                {/* Surgery Name selector */}
                <div className="border border-primary/30 rounded-lg p-3 space-y-1.5 bg-primary/5">
                  <p className="text-sm font-semibold text-foreground">Surgery Name</p>
                  <Select value={selectedSurgeryName} onValueChange={setSelectedSurgeryName}>
                    <SelectTrigger data-testid="select-surgery-name">
                      <SelectValue placeholder={surgeryNamesList && surgeryNamesList.length > 0 ? "Select surgery name…" : "No surgery names — add via Surgeries menu"} />
                    </SelectTrigger>
                    <SelectContent>
                      {surgeryNamesList && surgeryNamesList.length > 0 ? (
                        surgeryNamesList.map((sn: any) => (
                          <SelectItem key={sn.id} value={sn.name}>{sn.name}</SelectItem>
                        ))
                      ) : (
                        <SelectItem value="__none" disabled>No surgery names added yet</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {selectedSurgeryName && (
                    <p className="text-xs text-primary font-medium">Selected: {selectedSurgeryName}</p>
                  )}
                </div>

                {/* Surgery Charge — catalog-based, no doctor */}
                {(() => {
                  const { key, label, category } = SURGERY_CATEGORIES[0];
                  const options = catalog?.filter((c: any) => c.category === category) ?? [];
                  return (
                    <div className="border border-border/50 rounded-lg p-3 space-y-2 bg-secondary/20">
                      <p className="text-sm font-semibold text-foreground">{label}</p>
                      <div className="flex gap-2 items-center">
                        <Select onValueChange={(val) => handleCatalogSelect(key, val, category)}>
                          <SelectTrigger className="flex-1" data-testid={`select-${key}`}>
                            <SelectValue placeholder={options.length > 0 ? "Select from catalog…" : "No catalog items"} />
                          </SelectTrigger>
                          <SelectContent>
                            {options.length > 0 ? options.map((c: any) => (
                              <SelectItem key={c.id} value={c.id.toString()}>
                                {c.name} — ₹{c.cost.toLocaleString()}
                              </SelectItem>
                            )) : (
                              <SelectItem value="__none" disabled>No entries — add via Surgery Catalog</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <div className="relative w-32 shrink-0">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                          <Input
                            type="number" min="0" className="pl-7" placeholder="0"
                            value={charges[key]}
                            onChange={(e) => setCharges(prev => ({ ...prev, [key]: e.target.value }))}
                            data-testid={`input-${key}`}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Doctor-linked charges */}
                {SURGERY_CATEGORIES.slice(1).map(({ key, label }) => {
                  const config = DOCTOR_CATEGORY_CONFIG[key];
                  const doctors = getFilteredDoctors(config?.roleFilter ?? null);
                  return (
                    <div key={key} className="border border-border/50 rounded-lg p-3 space-y-2 bg-secondary/20">
                      <p className="text-sm font-semibold text-foreground">{label}</p>
                      <div className="flex gap-2 items-center">
                        <Select
                          value={selectedDoctors[key] ?? ""}
                          onValueChange={(val) => handleDoctorSelect(key, val)}
                        >
                          <SelectTrigger className="flex-1" data-testid={`select-doctor-${key}`}>
                            <SelectValue placeholder={doctors.length > 0 ? "Select doctor…" : "No doctors available"} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none">— None —</SelectItem>
                            {doctors.map((d: any) => (
                              <SelectItem key={d.id} value={d.id.toString()}>
                                Dr. {d.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="relative w-32 shrink-0">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                          <Input
                            type="number" min="0" className="pl-7" placeholder="0"
                            value={charges[key]}
                            onChange={(e) => setCharges(prev => ({ ...prev, [key]: e.target.value }))}
                            data-testid={`input-${key}`}
                          />
                        </div>
                      </div>
                      {selectedDoctors[key] && selectedDoctors[key] !== "__none" && charges[key] && (
                        <p className="text-xs text-primary">
                          Auto-filled from Dr. {doctors.find((d: any) => d.id.toString() === selectedDoctors[key])?.name}'s configured rate
                        </p>
                      )}
                    </div>
                  );
                })}

                <div className="flex gap-2 pt-2">
                  <Button
                    className="flex-1 bg-primary hover:bg-primary/90"
                    disabled={addSurgery.isPending}
                    onClick={() => addSurgery.mutate()}
                    data-testid="button-save-surgery"
                  >
                    {addSurgery.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Save Surgery
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancel</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {surgeries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No surgery records</div>
        ) : (
          <div className="space-y-3">
            {surgeries.map((s: any) => (
              <div key={s.id} className="border border-border/50 rounded-lg p-4 bg-secondary/10" data-testid={`row-surgery-${s.id}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Scissors className="w-4 h-4 text-primary shrink-0" />
                    <span className="font-semibold text-foreground">
                      {s.surgeryName ?? "Surgery"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {!patient.discharged && canManage && (
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)} className="text-destructive hover:bg-destructive/10 h-7 w-7" data-testid={`button-delete-surgery-${s.id}`}>
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-muted-foreground">{format(new Date(s.date), "MMM dd, yyyy")}</span>
                  <span className="font-bold text-primary">Total: ₹{totalForSurgery(s).toLocaleString()}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                  {SURGERY_CATEGORIES.map(({ key, label }) => s[key] > 0 && (
                    <div key={key} className="flex justify-between bg-background rounded px-2 py-1">
                      <span className="text-muted-foreground">{label}:</span>
                      <span className="font-medium">₹{s[key].toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function computeDailyRoomCharges(patient: any, roomSwitches: any[], roomTypes: any[]) {
  if (!roomTypes) return [];
  const toMidnight = (d: Date) => { const m = new Date(d); m.setHours(0, 0, 0, 0); return m; };
  const admissionDay = toMidnight(new Date(patient.admissionDate));
  const endDay = patient.discharged && patient.expectedDischargeDate
    ? toMidnight(new Date(patient.expectedDischargeDate))
    : toMidnight(new Date());

  const sorted = [...roomSwitches].sort((a, b) => new Date(a.switchDate).getTime() - new Date(b.switchDate).getTime());
  const initialRoomTypeId = sorted.length > 0 ? sorted[0].fromRoomTypeId : patient.roomTypeId;
  const result: any[] = [];
  let current = new Date(admissionDay);

  while (current <= endDay) {
    const dayTime = current.getTime();
    const switchOnDay = sorted.find(sw => toMidnight(new Date(sw.switchDate)).getTime() === dayTime);

    if (switchOnDay && switchOnDay.isHalfDay) {
      const oldRt = roomTypes.find((r: any) => r.id === switchOnDay.fromRoomTypeId);
      const newRt = roomTypes.find((r: any) => r.id === switchOnDay.toRoomTypeId);
      result.push({
        date: format(current, "yyyy-MM-dd"),
        roomTypeName: `${oldRt?.name ?? "?"} → ${newRt?.name ?? "?"} (half-day switch)`,
        roomCharge: Math.round(((oldRt?.dailyCharge ?? 0) + (newRt?.dailyCharge ?? 0)) / 2),
        nursingCharge: Math.round(((oldRt?.nursingCharge ?? 0) + (newRt?.nursingCharge ?? 0)) / 2),
        rmoCharge: Math.round(((oldRt?.rmoCharge ?? 0) + (newRt?.rmoCharge ?? 0)) / 2),
        visitCharge: Math.round(((oldRt?.visitCharge ?? 0) + (newRt?.visitCharge ?? 0)) / 2),
        isComputed: true,
      });
    } else {
      let roomTypeId = initialRoomTypeId;
      for (const sw of sorted) {
        if (toMidnight(new Date(sw.switchDate)) <= current) roomTypeId = sw.toRoomTypeId;
      }
      const rt = roomTypes.find((r: any) => r.id === roomTypeId);
      result.push({
        date: format(current, "yyyy-MM-dd"),
        roomTypeName: rt?.name ?? "Unknown",
        roomCharge: rt?.dailyCharge ?? 0,
        nursingCharge: rt?.nursingCharge ?? 0,
        rmoCharge: rt?.rmoCharge ?? 0,
        visitCharge: rt?.visitCharge ?? 0,
        isComputed: true,
      });
    }

    const next = new Date(current);
    next.setDate(next.getDate() + 1);
    current = next;
  }
  return result;
}

function RoomChargesTab({ patient, roomChargesList, roomSwitches, canManage }: { patient: any, roomChargesList: any[], roomSwitches: any[], canManage: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: roomTypes } = useRoomTypes();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const form = useForm({
    defaultValues: { date: format(new Date(), "yyyy-MM-dd"), roomTypeId: "", roomCharge: 0, nursingCharge: 0, rmoCharge: 0, visitCharge: 0, notes: "" },
  });

  const selectedRoomTypeId = form.watch("roomTypeId");

  useEffect(() => {
    if (selectedRoomTypeId && roomTypes) {
      const rt = roomTypes.find((r: any) => String(r.id) === String(selectedRoomTypeId));
      if (rt) {
        form.setValue("roomCharge", rt.dailyCharge ?? 0);
        form.setValue("nursingCharge", rt.nursingCharge ?? 0);
        form.setValue("rmoCharge", rt.rmoCharge ?? 0);
        form.setValue("visitCharge", rt.visitCharge ?? 0);
      }
    }
  }, [selectedRoomTypeId, roomTypes]);

  const openAdd = () => {
    setEditing(null);
    form.reset({ date: format(new Date(), "yyyy-MM-dd"), roomTypeId: String(patient.roomTypeId ?? ""), roomCharge: 0, nursingCharge: 0, rmoCharge: 0, visitCharge: 0, notes: "" });
    setOpen(true);
  };

  const openEdit = (rc: any) => {
    setEditing(rc);
    form.reset({
      date: format(new Date(rc.date), "yyyy-MM-dd"),
      roomTypeId: rc.roomTypeId ? String(rc.roomTypeId) : "",
      roomCharge: rc.roomCharge,
      nursingCharge: rc.nursingCharge,
      rmoCharge: rc.rmoCharge,
      visitCharge: rc.visitCharge ?? 0,
      notes: rc.notes ?? "",
    });
    setOpen(true);
  };

  // Opens dialog pre-filled from an auto-calculated row but saves as a NEW explicit entry
  const openAutoEdit = (rc: any) => {
    setEditing(null);
    form.reset({
      date: rc.date,
      roomTypeId: rc.roomTypeId ? String(rc.roomTypeId) : String(patient.roomTypeId ?? ""),
      roomCharge: rc.roomCharge,
      nursingCharge: rc.nursingCharge,
      rmoCharge: rc.rmoCharge,
      visitCharge: rc.visitCharge ?? 0,
      notes: "",
    });
    setOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (values: any) => {
      const url = editing
        ? `/api/patients/${patient.id}/room-charges/${editing.id}`
        : `/api/patients/${patient.id}/room-charges`;
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          date: values.date,
          roomTypeId: values.roomTypeId ? Number(values.roomTypeId) : null,
          roomCharge: Number(values.roomCharge),
          nursingCharge: Number(values.nursingCharge),
          rmoCharge: Number(values.rmoCharge),
          visitCharge: Number(values.visitCharge ?? 0),
          notes: values.notes || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/patients', patient.id, 'bill'] });
      queryClient.invalidateQueries({ queryKey: [api.patients.getBill.path, patient.id] });
      toast({ title: editing ? "Updated" : "Added", description: "Room charge saved." });
      setOpen(false);
    },
    onError: () => toast({ title: "Error", description: "Failed to save room charge.", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/patients/${patient.id}/room-charges/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/patients', patient.id, 'bill'] });
      queryClient.invalidateQueries({ queryKey: [api.patients.getBill.path, patient.id] });
      toast({ title: "Deleted", description: "Room charge removed." });
    },
    onError: () => toast({ title: "Error", description: "Failed to delete.", variant: "destructive" }),
  });

  const hasExplicit = roomChargesList.length > 0;
  const displayRows: any[] = hasExplicit
    ? roomChargesList
    : computeDailyRoomCharges(patient, roomSwitches, roomTypes ?? []);

  const totalRoom = displayRows.reduce((s: number, r: any) => s + (r.roomCharge ?? 0), 0);
  const totalNursing = displayRows.reduce((s: number, r: any) => s + (r.nursingCharge ?? 0), 0);
  const totalRmo = displayRows.reduce((s: number, r: any) => s + (r.rmoCharge ?? 0), 0);
  const totalVisit = displayRows.reduce((s: number, r: any) => s + (r.visitCharge ?? 0), 0);

  return (
    <Card className="border-border/50 shadow-md">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="font-display text-lg flex items-center gap-2">
          <BedDouble className="w-5 h-5 text-primary" /> Room Charges
          {!hasExplicit && (
            <Badge variant="outline" className="text-xs font-normal text-muted-foreground ml-1">Auto-calculated</Badge>
          )}
        </CardTitle>
        {canManage && !patient.discharged && (
          <Button size="sm" className="hover-elevate bg-primary hover:bg-primary/90" onClick={openAdd} data-testid="button-add-room-charge">
            <Plus className="w-4 h-4 mr-2" /> Add Charge
          </Button>
        )}
      </CardHeader>
      {!hasExplicit && (
        <div className="px-4 pb-3">
          <p className="text-xs text-muted-foreground bg-secondary/50 rounded-lg px-3 py-2">
            These charges are auto-calculated from the patient's room type. Use <strong>Add Charge</strong> to enter day-specific amounts which will override this auto-calculation.
          </p>
        </div>
      )}
      <CardContent className="p-0">
        {displayRows.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <BedDouble className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>No room charges to display yet.</p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader className="bg-secondary/40">
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Room Type</TableHead>
                  <TableHead className="text-right">Room (₹)</TableHead>
                  <TableHead className="text-right">Nursing (₹)</TableHead>
                  <TableHead className="text-right">RMO (₹)</TableHead>
                  <TableHead className="text-right">Visit (₹)</TableHead>
                  <TableHead className="text-right">Total (₹)</TableHead>
                  {canManage && !patient.discharged && <TableHead className="w-[80px]" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayRows.map((rc: any, idx: number) => {
                  const rtName = hasExplicit
                    ? (roomTypes?.find((r: any) => r.id === rc.roomTypeId)?.name ?? "—")
                    : rc.roomTypeName;
                  const rowTotal = (rc.roomCharge ?? 0) + (rc.nursingCharge ?? 0) + (rc.rmoCharge ?? 0) + (rc.visitCharge ?? 0);
                  const isAutoRow = !hasExplicit;
                  return (
                    <TableRow key={hasExplicit ? rc.id : idx} data-testid={hasExplicit ? `row-room-charge-${rc.id}` : `row-room-charge-auto-${idx}`}>
                      <TableCell className="font-medium">{format(new Date(rc.date), "dd MMM yyyy")}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{rtName}</TableCell>
                      <TableCell className="text-right">₹{(rc.roomCharge ?? 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right">₹{(rc.nursingCharge ?? 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right">₹{(rc.rmoCharge ?? 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right">₹{(rc.visitCharge ?? 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right font-semibold text-primary">₹{rowTotal.toLocaleString()}</TableCell>
                      {canManage && !patient.discharged && (
                        <TableCell>
                          <div className="flex items-center gap-1 justify-end">
                            <Button
                              variant="ghost" size="icon" className="h-7 w-7"
                              onClick={() => isAutoRow ? openAutoEdit(rc) : openEdit(rc)}
                              data-testid={`button-edit-room-charge-${isAutoRow ? `auto-${idx}` : rc.id}`}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            {!isAutoRow && (
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => deleteMutation.mutate(rc.id)} data-testid={`button-delete-room-charge-${rc.id}`}>
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="flex justify-end gap-6 px-4 py-3 bg-secondary/20 border-t border-border/50 text-sm font-semibold">
              <span>Room: ₹{totalRoom.toLocaleString()}</span>
              <span>Nursing: ₹{totalNursing.toLocaleString()}</span>
              <span>RMO: ₹{totalRmo.toLocaleString()}</span>
              <span>Visit: ₹{totalVisit.toLocaleString()}</span>
              <span className="text-primary text-base">Total: ₹{(totalRoom + totalNursing + totalRmo + totalVisit).toLocaleString()}</span>
            </div>
          </>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={(v) => { if (!v) setOpen(false); }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Room Charge" : "Add Room Charge"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Date <span className="text-destructive">*</span></label>
              <Input type="date" data-testid="input-room-charge-date" {...form.register("date", { required: true })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Room Type</label>
              <Select value={form.watch("roomTypeId")} onValueChange={(v) => form.setValue("roomTypeId", v)}>
                <SelectTrigger data-testid="select-room-charge-type">
                  <SelectValue placeholder="Select room type (auto-fills charges)" />
                </SelectTrigger>
                <SelectContent>
                  {roomTypes?.map((rt: any) => (
                    <SelectItem key={rt.id} value={String(rt.id)}>{rt.name} — ₹{rt.dailyCharge}/day</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Room (₹)</label>
                <Input type="number" min={0} data-testid="input-room-charge-room" {...form.register("roomCharge")} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Nursing (₹)</label>
                <Input type="number" min={0} data-testid="input-room-charge-nursing" {...form.register("nursingCharge")} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">RMO (₹)</label>
                <Input type="number" min={0} data-testid="input-room-charge-rmo" {...form.register("rmoCharge")} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Visit (₹)</label>
                <Input type="number" min={0} data-testid="input-room-charge-visit" {...form.register("visitCharge")} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Notes</label>
              <Input placeholder="Optional note" data-testid="input-room-charge-notes" {...form.register("notes")} />
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="submit" disabled={saveMutation.isPending} className="flex-1" data-testid="button-save-room-charge">
                {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editing ? "Update" : "Add Charge"}
              </Button>
              <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancel</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function RoomSwitchTab({ patient, roomSwitches, isManager }: { patient: any, roomSwitches: any[], isManager: boolean }) {
  const { data: user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const canManage = isManager || isAdmin;
  const { data: roomTypes } = useRoomTypes();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const switchForm = useForm({
    defaultValues: { toRoomTypeId: "", isHalfDay: "true", notes: "" }
  });

  const switchMutation = useMutation({
    mutationFn: (data: any) =>
      fetch(`/api/patients/${patient.id}/room-switch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toRoomTypeId: parseInt(data.toRoomTypeId),
          isHalfDay: data.isHalfDay === "true",
          notes: data.notes || null,
        }),
        credentials: "include",
      }).then(async (r) => {
        if (!r.ok) { const e = await r.json(); throw new Error(e.message); }
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.patients.getBill.path, patient.id] });
      queryClient.invalidateQueries({ queryKey: [api.patients.get.path, patient.id] });
      queryClient.invalidateQueries({ queryKey: [api.patients.list.path] });
      setOpen(false);
      switchForm.reset();
      toast({ title: "Room switched", description: "Patient has been moved to the new room." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: any) => switchMutation.mutate(data);

  const currentRoom = roomTypes?.find((r: any) => r.id === patient.roomTypeId);

  return (
    <Card className="border-border/50 shadow-md">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="font-display">Room Switches</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Current room: <span className="font-semibold text-foreground">{currentRoom?.name ?? "Unknown"}</span>
            {currentRoom && <span className="text-muted-foreground"> — ₹{currentRoom.dailyCharge}/day</span>}
          </p>
        </div>
        {!patient.discharged && canManage && (
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) switchForm.reset(); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="hover-elevate" data-testid="button-add-room-switch">
                <ArrowRightLeft className="w-4 h-4 mr-2" /> Switch Room
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Switch Patient Room</DialogTitle></DialogHeader>
              <Form {...switchForm}>
                <form onSubmit={switchForm.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField control={switchForm.control} name="toRoomTypeId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Room</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger data-testid="select-new-room"><SelectValue placeholder="Select new room" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {roomTypes?.filter((r: any) => r.id !== patient.roomTypeId).map((r: any) => (
                            <SelectItem key={r.id} value={r.id.toString()} data-testid={`option-room-${r.id}`}>
                              {r.name} — ₹{r.dailyCharge}/day
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={switchForm.control} name="isHalfDay" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Switch Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger data-testid="select-switch-type"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="true">Half Day — charges split between both rooms today</SelectItem>
                          <SelectItem value="false">Full Day — new room charge starts from today</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">
                        {field.value === "true"
                          ? "Today: ½ day charge in current room + ½ day charge in new room."
                          : "Today and onwards fully charged to the new room."}
                      </p>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={switchForm.control} name="notes" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (optional)</FormLabel>
                      <FormControl><Input placeholder="Reason for switch..." {...field} data-testid="input-switch-notes" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <Button type="submit" className="w-full" disabled={switchMutation.isPending} data-testid="button-confirm-room-switch">
                    {switchMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Confirm Room Switch
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {roomSwitches.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">No room switches recorded for this patient.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>From Room</TableHead>
                <TableHead>To Room</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roomSwitches.map((sw: any) => {
                const fromRoom = roomTypes?.find((r: any) => r.id === sw.fromRoomTypeId);
                const toRoom = roomTypes?.find((r: any) => r.id === sw.toRoomTypeId);
                return (
                  <TableRow key={sw.id} data-testid={`row-room-switch-${sw.id}`}>
                    <TableCell>{format(new Date(sw.switchDate), "MMM dd, yyyy")}</TableCell>
                    <TableCell>
                      <span className="font-medium">{fromRoom?.name ?? `Room #${sw.fromRoomTypeId}`}</span>
                      <span className="text-muted-foreground text-xs ml-1">₹{fromRoom?.dailyCharge}/day</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{toRoom?.name ?? `Room #${sw.toRoomTypeId}`}</span>
                      <span className="text-muted-foreground text-xs ml-1">₹{toRoom?.dailyCharge}/day</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={sw.isHalfDay ? "secondary" : "outline"}>
                        {sw.isHalfDay ? "Half Day" : "Full Day"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{sw.notes || "—"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function BillView({ patient, bill, printMode = false }: { patient: any, bill: any, printMode?: boolean }) {
  return (
    <Card className={`border-border/50 shadow-md ${printMode ? 'border-none shadow-none' : ''}`}>
      <CardHeader className="text-center border-b pb-6 mb-4">
        <h2 className="text-3xl font-display font-bold text-primary">Criticare Hospital</h2>
        <p className="text-muted-foreground">Official IPD Final Bill</p>
      </CardHeader>
      <CardContent className="space-y-8 p-8 pt-0">
        <div className="grid grid-cols-2 gap-8 text-sm">
          <div>
            <p><span className="font-semibold w-24 inline-block">Patient Name:</span> {patient.name}</p>
            <p><span className="font-semibold w-24 inline-block">IPD Number:</span> {patient.ipdNumber}</p>
            <p><span className="font-semibold w-24 inline-block">Illness:</span> {patient.illness}</p>
          </div>
          <div className="text-right">
            <p><span className="font-semibold">Admission:</span> {format(new Date(patient.admissionDate), "MMM dd, yyyy")}</p>
            <p><span className="font-semibold">Status:</span> {patient.discharged ? "Discharged" : "Currently Admitted"}</p>
            <p><span className="font-semibold">Days Admitted:</span> {bill.daysAdmitted}</p>
          </div>
        </div>

        <div className="border-t border-border/50 pt-6">
          <h3 className="font-display font-semibold text-lg mb-4">Charges Summary</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>
                  Room Charges ({bill.daysAdmitted} day{bill.daysAdmitted !== 1 ? "s" : ""})
                  {bill.roomSwitches?.length > 0 && (
                    <span className="text-xs text-muted-foreground ml-2">— {bill.roomSwitches.length} room switch{bill.roomSwitches.length !== 1 ? "es" : ""}</span>
                  )}
                </TableCell>
                <TableCell className="text-right">₹{bill.roomCharge.toLocaleString()}</TableCell>
              </TableRow>
              {(bill.roomNursingCharges ?? 0) > 0 && (
                <TableRow>
                  <TableCell>Nursing Charges ({bill.daysAdmitted} day{bill.daysAdmitted !== 1 ? "s" : ""})</TableCell>
                  <TableCell className="text-right">₹{bill.roomNursingCharges.toLocaleString()}</TableCell>
                </TableRow>
              )}
              {(bill.rmoCharges ?? 0) > 0 && (
                <TableRow>
                  <TableCell>RMO Charges ({bill.daysAdmitted} day{bill.daysAdmitted !== 1 ? "s" : ""})</TableCell>
                  <TableCell className="text-right">₹{bill.rmoCharges.toLocaleString()}</TableCell>
                </TableRow>
              )}
              <TableRow>
                <TableCell>Doctor Visits ({bill.visits.length})</TableCell>
                <TableCell className="text-right">₹{bill.doctorCharges}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Medicines & Pharmacy</TableCell>
                <TableCell className="text-right">₹{bill.medicineCharges}</TableCell>
              </TableRow>
              {bill.nursingCharges > 0 && (
                <TableRow>
                  <TableCell>Nursing Charges</TableCell>
                  <TableCell className="text-right">₹{bill.nursingCharges}</TableCell>
                </TableRow>
              )}
              {bill.surgeryCharges > 0 && (
                <TableRow>
                  <TableCell>Surgery Charges</TableCell>
                  <TableCell className="text-right">₹{bill.surgeryCharges.toLocaleString()}</TableCell>
                </TableRow>
              )}
              {bill.procedures?.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell>Procedure: {p.name}{p.description ? ` — ${p.description}` : ""}</TableCell>
                  <TableCell className="text-right">₹{p.cost.toLocaleString()}</TableCell>
                </TableRow>
              ))}
              {bill.charges?.filter((c: any) => c.type === "OTHER").map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell>{c.description || "Other Charge"}</TableCell>
                  <TableCell className="text-right">₹{c.amount}</TableCell>
                </TableRow>
              ))}
              <TableRow className="border-t-2 border-border font-bold text-lg">
                <TableCell className="pt-4">Grand Total</TableCell>
                <TableCell className="text-right pt-4 text-primary">₹{bill.grandTotal.toLocaleString()}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        
        {printMode && (
          <div className="mt-16 pt-8 border-t border-border text-center text-sm text-muted-foreground">
            <p>Thank you for choosing Criticare Hospital. This is a computer generated bill.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
