import { useParams, Link } from "wouter";
import { usePatient, usePatientBill, useDischargePatient, useAssignDoctor } from "@/hooks/use-patients";
import { useCreateVisit, useCreatePrescription, useCreateCharge } from "@/hooks/use-billing";
import { useDoctors } from "@/hooks/use-doctors";
import { useMedicines } from "@/hooks/use-medicines";
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
import { ArrowLeft, Printer, FileText, Activity, CreditCard, Loader2, Pill, UserPlus } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";

export default function PatientDetails() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const { data: user } = useAuth();
  const { data: patient, isLoading: pLoading } = usePatient(id);
  const { data: bill, isLoading: bLoading } = usePatientBill(id);
  const dischargeMutation = useDischargePatient();
  const { toast } = useToast();

  if (pLoading || bLoading) return <div className="flex p-20 justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;
  if (!patient || !bill) return <div>Patient not found</div>;

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
                {user?.role === 'MANAGER' && !patient.discharged && (
                  <Button onClick={handleDischarge} disabled={dischargeMutation.isPending} variant="outline" className="border-destructive text-destructive hover:bg-destructive hover:text-white transition-colors">
                    {dischargeMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Discharge Patient
                  </Button>
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
              <div><p className="text-muted-foreground mb-1">Diagnosis</p><p className="font-semibold">{patient.illness}</p></div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats Card */}
        <Card className="border-border/50 shadow-md">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-display">Bill Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-border/50">
              <span className="text-muted-foreground">Days Admitted</span>
              <span className="font-bold">{bill.daysAdmitted} Days</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-border/50">
              <span className="text-muted-foreground">Total Services</span>
              <span className="font-bold">${(bill.doctorCharges + bill.nursingCharges + bill.otherCharges).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-border/50">
              <span className="text-muted-foreground">Medicines</span>
              <span className="font-bold">${bill.medicineCharges.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-lg font-display text-primary">Grand Total</span>
              <span className="text-2xl font-bold text-primary">${bill.grandTotal.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="visits" className="no-print">
        <TabsList className="bg-secondary/50 p-1 rounded-xl">
          <TabsTrigger value="visits" className="rounded-lg px-6"><Activity className="w-4 h-4 mr-2" /> Visits</TabsTrigger>
          <TabsTrigger value="medicines" className="rounded-lg px-6"><Pill className="w-4 h-4 mr-2" /> Medicines</TabsTrigger>
          <TabsTrigger value="charges" className="rounded-lg px-6"><CreditCard className="w-4 h-4 mr-2" /> Extra Charges</TabsTrigger>
          <TabsTrigger value="bill" className="rounded-lg px-6"><FileText className="w-4 h-4 mr-2" /> Detailed Bill</TabsTrigger>
        </TabsList>
        
        <div className="mt-6">
          <TabsContent value="visits"><VisitsTab patient={patient} visits={bill.visits} isManager={user?.role === 'MANAGER'} /></TabsContent>
          <TabsContent value="medicines"><MedicinesTab patient={patient} prescriptions={bill.prescriptions} isManager={user?.role === 'MANAGER'} /></TabsContent>
          <TabsContent value="charges"><ChargesTab patient={patient} charges={bill.charges} isManager={user?.role === 'MANAGER'} /></TabsContent>
          <TabsContent value="bill"><BillView patient={patient} bill={bill} /></TabsContent>
        </div>
      </Tabs>

      {/* Hidden Print Container */}
      <div className="print-bill-container hidden">
        <BillView patient={patient} bill={bill} printMode={true} />
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// TABS COMPONENTS
// ----------------------------------------------------------------------------

function VisitsTab({ patient, visits, isManager }: { patient: any, visits: any[], isManager: boolean }) {
  const [open, setOpen] = useState(false);
  const { data: doctors } = useDoctors();
  const createVisit = useCreateVisit();
  const assignDoctor = useAssignDoctor();

  const visitForm = useForm({ defaultValues: { doctorId: "", charge: "" }});
  
  const onSubmit = (data: any) => {
    createVisit.mutate({ patientId: patient.id, doctorId: parseInt(data.doctorId), charge: parseInt(data.charge) }, {
      onSuccess: () => setOpen(false)
    });
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
            {isManager && doctors && (
              <Select onValueChange={(val) => handleAssignDoctor(parseInt(val))}>
                <SelectTrigger className="w-[180px] h-9"><UserPlus className="w-4 h-4 mr-2" /><SelectValue placeholder="Assign Doctor" /></SelectTrigger>
                <SelectContent>{doctors.map(d => <SelectItem key={d.id} value={d.id.toString()}>{d.name} ({d.specialization})</SelectItem>)}</SelectContent>
              </Select>
            )}
            <Dialog open={open} onOpenChange={setOpen}>
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
                        <Select onValueChange={(val) => {
                          field.onChange(val);
                          const doc = doctors?.find(d => d.id.toString() === val);
                          if(doc) visitForm.setValue("charge", doc.visitCharge.toString());
                        }}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select Doctor" /></SelectTrigger></FormControl>
                          <SelectContent>{doctors?.map(d => <SelectItem key={d.id} value={d.id.toString()}>Dr. {d.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                    <FormField control={visitForm.control} name="charge" render={({ field }) => (
                      <FormItem><FormLabel>Charge ($)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                    )} />
                    <Button type="submit" className="w-full" disabled={createVisit.isPending}>Save Visit</Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Doctor</TableHead><TableHead className="text-right">Charge</TableHead></TableRow></TableHeader>
          <TableBody>
            {visits.map((v: any) => (
              <TableRow key={v.id}>
                <TableCell>{format(new Date(v.date), "MMM dd, yyyy HH:mm")}</TableCell>
                <TableCell>Dr. {doctors?.find(d => d.id === v.doctorId)?.name || 'Unknown'}</TableCell>
                <TableCell className="text-right font-medium">${v.charge}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function MedicinesTab({ patient, prescriptions, isManager }: { patient: any, prescriptions: any[], isManager: boolean }) {
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
        {!patient.discharged && isManager && (
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
                        <SelectContent>{medicines?.map(m => <SelectItem key={m.id} value={m.id.toString()}>{m.name} (${m.unitCost})</SelectItem>)}</SelectContent>
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
                <TableCell className="text-right font-medium">${p.totalCost}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ChargesTab({ patient, charges, isManager }: { patient: any, charges: any[], isManager: boolean }) {
  const [open, setOpen] = useState(false);
  const createCharge = useCreateCharge();

  const form = useForm({ defaultValues: { type: "OTHER", amount: "" }});

  const onSubmit = (data: any) => {
    createCharge.mutate({ patientId: patient.id, type: data.type, amount: parseInt(data.amount) }, {
      onSuccess: () => setOpen(false)
    });
  };

  return (
    <Card className="border-border/50 shadow-md">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-display">Additional Charges</CardTitle>
        {!patient.discharged && isManager && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="hover-elevate"><Plus className="w-4 h-4 mr-2" /> Add Charge</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Extra Charge</DialogTitle></DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField control={form.control} name="type" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Charge Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="NURSING">Nursing</SelectItem>
                          <SelectItem value="OTHER">Other Service</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="amount" render={({ field }) => (
                    <FormItem><FormLabel>Amount ($)</FormLabel><FormControl><Input type="number" min="0" {...field} /></FormControl></FormItem>
                  )} />
                  <Button type="submit" className="w-full" disabled={createCharge.isPending}>Save</Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
          <TableBody>
            {charges.map((c: any) => (
              <TableRow key={c.id}>
                <TableCell>{format(new Date(c.date), "MMM dd, yyyy")}</TableCell>
                <TableCell>{c.type}</TableCell>
                <TableCell className="text-right font-medium">${c.amount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function BillView({ patient, bill, printMode = false }: { patient: any, bill: any, printMode?: boolean }) {
  return (
    <Card className={`border-border/50 shadow-md ${printMode ? 'border-none shadow-none' : ''}`}>
      <CardHeader className="text-center border-b pb-6 mb-4">
        <h2 className="text-3xl font-display font-bold text-primary">MediCare Hospital</h2>
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
                <TableCell>Room Charges ({bill.daysAdmitted} days)</TableCell>
                <TableCell className="text-right">${bill.roomCharge}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Doctor Visits ({bill.visits.length})</TableCell>
                <TableCell className="text-right">${bill.doctorCharges}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Medicines & Pharmacy</TableCell>
                <TableCell className="text-right">${bill.medicineCharges}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Nursing Charges</TableCell>
                <TableCell className="text-right">${bill.nursingCharges}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Other Services</TableCell>
                <TableCell className="text-right">${bill.otherCharges}</TableCell>
              </TableRow>
              <TableRow className="border-t-2 border-border font-bold text-lg">
                <TableCell className="pt-4">Grand Total</TableCell>
                <TableCell className="text-right pt-4 text-primary">${bill.grandTotal.toLocaleString()}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        
        {printMode && (
          <div className="mt-16 pt-8 border-t border-border text-center text-sm text-muted-foreground">
            <p>Thank you for choosing MediCare Hospital. This is a computer generated bill.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
