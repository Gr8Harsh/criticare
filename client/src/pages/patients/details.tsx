import { useParams, Link } from "wouter";
import { usePatient, usePatientBill, useDischargePatient, useAssignDoctor, useAssignedDoctors, useUpdatePatient, usePatients } from "@/hooks/use-patients";
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
import { ArrowLeft, FileText, Activity, CreditCard, Loader2, Pill, Plus, X, Pencil, Stethoscope, Scissors, ArrowRightLeft, BedDouble, UserCheck, Printer } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect, useMemo } from "react";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { insertChargeSchema } from "@shared/schema";
import { api } from "@shared/routes";

type BillDisplayMode = "progressive" | "date-wise" | "summarised";
const EMPTY_ROOM_CONFIGURATION_MARKER = "__EMPTY_ROOM_CONFIGURATION__";

function formatDoctorName(name: string) {
  const trimmed = name.trim();
  return /^dr\.?\s+/i.test(trimmed) ? trimmed : `Dr. ${trimmed}`;
}

function printPageSection(target: "receipt" | "bill") {
  const printClass = target === "receipt" ? "printing-receipt" : "printing-bill";
  document.body.classList.add(printClass);
  window.print();
  setTimeout(() => document.body.classList.remove(printClass), 500);
}

export default function PatientDetails() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const { data: user } = useAuth();
  const { data: patient, isLoading: pLoading } = usePatient(id);
  const { data: bill, isLoading: bLoading } = usePatientBill(id) as any;
  const { data: assignedDoctors } = useAssignedDoctors(id);
  const { data: doctors } = useDoctors();
  const { data: roomTypes } = useRoomTypes();
  const { data: roomNumbers = [] } = useQuery<any[]>({ queryKey: [api.roomNumbers.list.path] });
  const { data: patients = [] } = usePatients();
  const dischargeMutation = useDischargePatient();
  const assignDoctor = useAssignDoctor();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updatePatient = useUpdatePatient(id);
  const [editOpen, setEditOpen] = useState(false);
  const [advanceOpen, setAdvanceOpen] = useState(false);
  const [advanceEditValue, setAdvanceEditValue] = useState("");
  const [quickSwitchOpen, setQuickSwitchOpen] = useState(false);
  const [dischargeOpen, setDischargeOpen] = useState(false);
  const [billViewMode, setBillViewMode] = useState<BillDisplayMode>("summarised");
  const advanceAmount = bill?.advanceAmount ?? patient?.advanceAmount ?? 0;
  const finalAmount = bill?.finalAmount ?? ((bill?.grandTotal ?? 0) - advanceAmount);
  const nowForDischarge = new Date();
  const dischargeForm = useForm({
    defaultValues: {
      dischargeDate: format(nowForDischarge, "yyyy-MM-dd"),
      dischargeTime: format(nowForDischarge, "HH:mm"),
      halfDayDischarge: false,
    },
  });

  const switchForm = useForm({
    defaultValues: { toRoomTypeId: "", bedNumber: "", switchDate: format(new Date(), "yyyy-MM-dd"), isHalfDay: "true", visitDistribution: "old_new", notes: "" },
  });
  const watchIsHalfDay = switchForm.watch("isHalfDay");
  const watchQuickSwitchRoomTypeId = switchForm.watch("toRoomTypeId");
  const availableQuickSwitchRooms = useMemo(() => {
    if (!watchQuickSwitchRoomTypeId) return [];
    const selectedRoomTypeId = Number(watchQuickSwitchRoomTypeId);
    const occupiedRoomNumbers = patients
      .filter((entry: any) => !entry.discharged && entry.id !== patient?.id && entry.roomTypeId === selectedRoomTypeId)
      .map((entry: any) => entry.bedNumber?.trim().toLowerCase())
      .filter(Boolean);

    return roomNumbers
      .filter((room: any) => room.roomTypeId === selectedRoomTypeId)
      .filter((room: any) => !occupiedRoomNumbers.includes(room.number.trim().toLowerCase()))
      .sort((left: any, right: any) => left.number.localeCompare(right.number, undefined, { numeric: true, sensitivity: "base" }));
  }, [patient?.id, patients, roomNumbers, watchQuickSwitchRoomTypeId]);

  const switchMutation = useMutation({
    mutationFn: (data: any) =>
      fetch(`/api/patients/${id}/room-switch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toRoomTypeId: parseInt(data.toRoomTypeId),
          bedNumber: data.bedNumber,
          switchDate: data.switchDate,
          isHalfDay: data.isHalfDay === "true",
          visitDistribution: data.isHalfDay === "true" ? data.visitDistribution : "old_new",
          notes: data.notes || null,
        }),
        credentials: "include",
      }).then(async (r) => {
        if (!r.ok) { const e = await r.json(); throw new Error(e.message); }
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.patients.getBill.path, id] });
      queryClient.invalidateQueries({ queryKey: [api.patients.get.path, id] });
      queryClient.invalidateQueries({ queryKey: [api.patients.list.path] });
      setQuickSwitchOpen(false);
      switchForm.reset({ toRoomTypeId: "", bedNumber: "", switchDate: format(new Date(), "yyyy-MM-dd"), isHalfDay: "true", visitDistribution: "old_new", notes: "" });
      toast({ title: "Room switched", description: "Patient has been moved to the new room." });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  if (pLoading || bLoading) return <div className="flex p-20 justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;
  if (!patient || !bill) return (
    <div className="flex flex-col items-center justify-center p-20 gap-4">
      <p className="text-xl font-semibold text-foreground">Patient not found</p>
      <p className="text-muted-foreground">This patient record does not exist or you don't have access.</p>
      <Button asChild variant="outline"><Link href="/patients">Back to Patients</Link></Button>
    </div>
  );

  const dischargeDateValue = dischargeForm.watch("dischargeDate");
  const dischargeTimeValue = dischargeForm.watch("dischargeTime");
  const dischargeDateTime = new Date(`${dischargeDateValue || format(new Date(), "yyyy-MM-dd")}T${dischargeTimeValue || "00:00"}`);
  const hoursSinceAdmission = (dischargeDateTime.getTime() - new Date(patient.admissionDate).getTime()) / (1000 * 60 * 60);
  const canHalfDayDischarge = hoursSinceAdmission >= 0 && hoursSinceAdmission <= 12;

  const handleDischarge = () => {
    const current = new Date();
    dischargeForm.reset({
      dischargeDate: format(current, "yyyy-MM-dd"),
      dischargeTime: format(current, "HH:mm"),
      halfDayDischarge: false,
    });
    setDischargeOpen(true);
  };

  const submitDischarge = (values: any) => {
    dischargeMutation.mutate({
      id,
      dischargeDate: values.dischargeDate,
      dischargeTime: values.dischargeTime,
      halfDayDischarge: canHalfDayDischarge ? Boolean(values.halfDayDischarge) : false,
    }, {
      onSuccess: () => {
        toast({ title: "Success", description: "Patient discharged." });
        setDischargeOpen(false);
      },
      onError: () => toast({ title: "Error", description: "Failed to discharge patient.", variant: "destructive" }),
    });
  };

  const openAdvanceEdit = () => {
    setAdvanceEditValue(String(advanceAmount ?? 0));
    setAdvanceOpen(true);
  };

  const saveAdvanceAmount = () => {
    updatePatient.mutate({ advanceAmount: Number(advanceEditValue || 0) } as any, {
      onSuccess: () => {
        toast({ title: "Advance updated", description: "Patient advance amount saved." });
        setAdvanceOpen(false);
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to update advance amount.", variant: "destructive" });
      },
    });
  };

  const handleAssignDoctorFromCard = (doctorId: string) => {
    assignDoctor.mutate(
      { patientId: patient.id, doctorId: parseInt(doctorId, 10) },
      {
        onSuccess: () => toast({ title: "Doctor assigned", description: "Assigned doctor updated." }),
        onError: () => toast({ title: "Error", description: "Failed to assign doctor.", variant: "destructive" }),
      },
    );
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
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
              <div><p className="text-muted-foreground mb-1">Age/Gender</p><p className="font-semibold">{new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear()}y / {patient.gender}</p></div>
              <div><p className="text-muted-foreground mb-1">Admission Date</p><p className="font-semibold">{format(new Date(patient.admissionDate), "MMM dd, yyyy")}</p></div>
              <div><p className="text-muted-foreground mb-1">Bed Assigned</p><p className="font-semibold">{patient.bedNumber || "—"}</p></div>
              <div><p className="text-muted-foreground mb-1">Diagnosis</p><p className="font-semibold">{patient.illness || "Not specified"}</p></div>
              <div>
                <p className="text-muted-foreground mb-1">Advance Amount</p>
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{formatMoney(advanceAmount)}</p>
                  {(user?.role === 'MANAGER' || user?.role === 'ADMIN') && !patient.discharged && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 no-print"
                      onClick={openAdvanceEdit}
                      data-testid="button-edit-advance-profile"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Assigned Doctor</p>
                {(user?.role === 'MANAGER' || user?.role === 'ADMIN') && !patient.discharged && doctors ? (
                  <Select
                    value={assignedDoctors?.[0]?.doctorId ? String(assignedDoctors[0].doctorId) : ""}
                    onValueChange={handleAssignDoctorFromCard}
                    disabled={assignDoctor.isPending}
                  >
                    <SelectTrigger className="h-8 w-full max-w-[210px] border-0 bg-transparent px-0 font-semibold shadow-none focus:ring-0 no-print" data-testid="select-assigned-doctor-profile">
                      <SelectValue placeholder="Assign doctor" />
                    </SelectTrigger>
                    <SelectContent>
                      {doctors.map((doctor: any) => (
                        <SelectItem key={doctor.id} value={String(doctor.id)}>
                          {doctor.name} ({doctor.specialization})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="font-semibold">{assignedDoctors && assignedDoctors.length > 0 ? formatDoctorName(assignedDoctors[0].doctorName) : "Not assigned"}</p>
                )}
              </div>
              <div className="col-span-2 md:col-span-1">
                <p className="text-muted-foreground mb-1">Current Room</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold">
                    {roomTypes?.find((r: any) => r.id === patient.roomTypeId)?.name ?? "—"}
                    {roomTypes?.find((r: any) => r.id === patient.roomTypeId) && (
                      <span className="text-muted-foreground font-normal text-xs ml-1">
                        ₹{roomTypes.find((r: any) => r.id === patient.roomTypeId)?.dailyCharge}/day
                      </span>
                    )}
                  </p>
                  {!patient.discharged && (user?.role === 'MANAGER' || user?.role === 'ADMIN') && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-xs px-2 py-0 no-print"
                      onClick={() => setQuickSwitchOpen(true)}
                      data-testid="button-quick-room-switch"
                    >
                      <ArrowRightLeft className="w-3 h-3 mr-1" /> Switch
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Switch Room Dialog */}
        <Dialog open={quickSwitchOpen} onOpenChange={(v) => { setQuickSwitchOpen(v); if (!v) switchForm.reset(); }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Switch Patient Room</DialogTitle></DialogHeader>
            <Form {...switchForm}>
              <form onSubmit={switchForm.handleSubmit((d) => switchMutation.mutate(d))} className="space-y-4">
                <FormField control={switchForm.control} name="switchDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Switch Date</FormLabel>
                    <FormControl><Input type="date" {...field} data-testid="input-quick-switch-date" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={switchForm.control} name="toRoomTypeId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Room</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        switchForm.setValue("bedNumber", "");
                      }}
                      value={field.value}
                    >
                      <FormControl><SelectTrigger><SelectValue placeholder="Select new room" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {roomTypes?.filter((r: any) => r.id !== patient.roomTypeId).map((r: any) => (
                          <SelectItem key={r.id} value={r.id.toString()}>{r.name} — ₹{r.dailyCharge}/day</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={switchForm.control} name="bedNumber" render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Room Number</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!watchQuickSwitchRoomTypeId}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={watchQuickSwitchRoomTypeId ? "Select room number" : "Select room type first"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableQuickSwitchRooms.length > 0 ? (
                          availableQuickSwitchRooms.map((room: any) => (
                            <SelectItem key={room.id} value={room.number}>{room.number}</SelectItem>
                          ))
                        ) : (
                          <SelectItem value="__none" disabled>No available room numbers</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={switchForm.control} name="isHalfDay" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Switch Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
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
                {watchIsHalfDay === "true" && (
                  <FormField control={switchForm.control} name="visitDistribution" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Doctor Visit Today</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="old_new">Old room once + New room once</SelectItem>
                          <SelectItem value="old_twice">Old room twice</SelectItem>
                          <SelectItem value="new_twice">New room twice</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">How did the doctor visit on the switch day?</p>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}
                <FormField control={switchForm.control} name="notes" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (optional)</FormLabel>
                    <FormControl><Input placeholder="Reason for switch..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" className="w-full" disabled={switchMutation.isPending}>
                  {switchMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Confirm Room Switch
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Dialog open={advanceOpen} onOpenChange={setAdvanceOpen}>
          <DialogContent className="sm:max-w-[380px]">
            <DialogHeader><DialogTitle>Edit Advance Amount</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Patient</p>
                <p className="font-semibold">{patient.name}</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Advance Amount</label>
                <Input
                  type="number"
                  min={0}
                  value={advanceEditValue}
                  onChange={(event) => setAdvanceEditValue(event.target.value)}
                  data-testid="input-profile-advance-amount"
                />
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={saveAdvanceAmount} disabled={updatePatient.isPending}>
                  {updatePatient.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save
                </Button>
                <Button type="button" variant="outline" className="flex-1" onClick={() => setAdvanceOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Tabs defaultValue="visits" className="no-print md:col-span-3 md:row-start-2">
          <TabsList className="bg-secondary/50 p-1 rounded-xl flex-wrap h-auto gap-1">
            <TabsTrigger value="visits" className="rounded-lg px-5"><Activity className="w-4 h-4 mr-2" /> Visits</TabsTrigger>
            <TabsTrigger value="medicines" className="rounded-lg px-5"><Pill className="w-4 h-4 mr-2" /> Medicines</TabsTrigger>
            <TabsTrigger value="procedures" className="rounded-lg px-5"><Stethoscope className="w-4 h-4 mr-2" /> Procedures</TabsTrigger>
            <TabsTrigger value="surgery" className="rounded-lg px-5"><Scissors className="w-4 h-4 mr-2" /> Surgeries</TabsTrigger>
            <TabsTrigger value="room-charges" className="rounded-lg px-5"><BedDouble className="w-4 h-4 mr-2" /> Room Configuration</TabsTrigger>
            <TabsTrigger value="room-switch" className="rounded-lg px-5"><ArrowRightLeft className="w-4 h-4 mr-2" /> Room Switch</TabsTrigger>
            <TabsTrigger value="charges" className="rounded-lg px-5"><CreditCard className="w-4 h-4 mr-2" /> Other Charges</TabsTrigger>
            <TabsTrigger value="bill" className="rounded-lg px-5"><FileText className="w-4 h-4 mr-2" /> Detailed Bill</TabsTrigger>
          </TabsList>
          
          <div className="mt-6">
            <TabsContent value="visits"><VisitsTab patient={patient} visits={bill.visits} isManager={user?.role === 'MANAGER'} visitCharges={bill.visitCharges} roomChargesList={bill.roomChargesList ?? []} roomSwitches={bill.roomSwitches ?? []} /></TabsContent>
            <TabsContent value="medicines"><MedicinesTab patient={patient} prescriptions={bill.prescriptions} isManager={user?.role === 'MANAGER' || user?.role === 'ADMIN'} /></TabsContent>
            <TabsContent value="procedures"><ProceduresTab patient={patient} procedures={bill.procedures ?? []} isManager={user?.role === 'MANAGER'} /></TabsContent>
            <TabsContent value="surgery"><SurgeryTab patient={patient} surgeries={bill.surgeries ?? []} isManager={user?.role === 'MANAGER'} /></TabsContent>
            <TabsContent value="room-charges"><RoomChargesTab patient={patient} roomChargesList={bill.roomChargesList ?? []} roomSwitches={bill.roomSwitches ?? []} canManage={user?.role === 'MANAGER' || user?.role === 'ADMIN'} /></TabsContent>
            <TabsContent value="room-switch"><RoomSwitchTab patient={patient} roomSwitches={bill.roomSwitches ?? []} isManager={user?.role === 'MANAGER'} /></TabsContent>
            <TabsContent value="charges"><ChargesTab patient={patient} charges={bill.charges} isManager={user?.role === 'MANAGER'} /></TabsContent>
            <TabsContent value="bill">
              <BillView
                patient={patient}
                bill={bill}
                mode={billViewMode}
                onModeChange={setBillViewMode}
                onPrint={() => printPageSection("bill")}
              />
            </TabsContent>
          </div>
        </Tabs>

        {/* Quick Stats Card */}
        <Card className="h-fit border-border/50 shadow-md md:col-start-3 md:row-start-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-display">Bill Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-border/50">
              <span className="text-muted-foreground text-sm">Days Admitted</span>
              <span className="font-bold">{bill.daysAdmitted} Days</span>
            </div>
            <div className="hidden">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Room Charge</span>
              <span className="font-medium">₹{(bill.roomCharge ?? 0).toLocaleString()}</span>
            </div>
            {(bill.roomNursingCharges ?? 0) > 0 && <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Nursing Charge</span>
              <span className="font-medium">₹{bill.roomNursingCharges.toLocaleString()}</span>
            </div>}
            {(bill.rmoCharges ?? 0) > 0 && <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">RMO Charge</span>
              <span className="font-medium">₹{bill.rmoCharges.toLocaleString()}</span>
            </div>}
            {(bill.visitCharges ?? 0) > 0 && <div className="flex justify-between items-center text-sm pb-2 border-b border-border/50">
              <span className="text-muted-foreground">Doctor Visit Charges</span>
              <span className="font-medium">₹{(bill.visitCharges ?? 0).toLocaleString()}</span>
            </div>}
            {((bill.visitCharges ?? 0) === 0) && <div className="pb-2 border-b border-border/50" />}
            <div className="flex justify-between items-center text-sm pb-2 border-b border-border/50">
              <span className="text-muted-foreground">Services &amp; Others</span>
              <span className="font-medium">₹{(bill.doctorCharges + bill.nursingCharges + bill.otherCharges + (bill.procedureCharges ?? 0) + (bill.surgeryCharges ?? 0)).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-sm pb-2 border-b border-border/50">
              <span className="text-muted-foreground">Medicines</span>
              <span className="font-medium">₹{bill.medicineCharges.toLocaleString()}</span>
            </div>
            </div>
            <div className="flex justify-between items-center pt-1">
              <span className="text-lg font-display text-primary">Grand Total</span>
              <span className="text-2xl font-bold text-primary">₹{bill.grandTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Advance Paid</span>
              <span className="font-semibold text-emerald-700">-{formatMoney(advanceAmount)}</span>
            </div>
            <div className="flex justify-between items-center rounded-xl bg-primary/10 px-3 py-2">
              <span className="font-display font-semibold text-primary">Final Payable</span>
              <span className="text-2xl font-bold text-primary">{formatMoney(finalAmount)}</span>
            </div>
            <Button type="button" variant="outline" className="w-full gap-2 no-print" onClick={() => printPageSection("receipt")}>
              <Printer className="w-4 h-4" />
              Print Receipt
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog open={dischargeOpen} onOpenChange={setDischargeOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Discharge Patient</DialogTitle>
          </DialogHeader>
          <form onSubmit={dischargeForm.handleSubmit(submitDischarge)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Discharge Date</label>
                <Input type="date" {...dischargeForm.register("dischargeDate", { required: true })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Discharge Time</label>
                <div className="flex gap-2">
                  <Input type="time" {...dischargeForm.register("dischargeTime", { required: true })} />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const current = new Date();
                      dischargeForm.setValue("dischargeDate", format(current, "yyyy-MM-dd"));
                      dischargeForm.setValue("dischargeTime", format(current, "HH:mm"));
                    }}
                  >
                    Now
                  </Button>
                </div>
              </div>
            </div>
            {canHalfDayDischarge && (
              <label className="flex items-center gap-3 rounded-xl border border-border/60 bg-secondary/30 px-3 py-3 text-sm">
                <input type="checkbox" className="h-4 w-4" {...dischargeForm.register("halfDayDischarge")} />
                <span>
                  <span className="font-semibold">Half day discharge</span>
                  <span className="block text-xs text-muted-foreground">Patient is being discharged within 12 hours, so only half room charges will apply.</span>
                </span>
              </label>
            )}
            {!canHalfDayDischarge && (
              <p className="text-xs text-muted-foreground">
                Half day discharge is available only when discharge is within 12 hours of admission.
              </p>
            )}
            <div className="flex gap-2 pt-1">
              <Button type="submit" disabled={dischargeMutation.isPending} className="flex-1">
                {dischargeMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Confirm Discharge
              </Button>
              <Button type="button" variant="outline" className="flex-1" onClick={() => setDischargeOpen(false)}>Cancel</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <EditPatientDialog patient={patient} open={editOpen} onOpenChange={setEditOpen} />
      <ReceiptView patient={patient} bill={bill} />
      <div className="print-bill-container">
        <BillView
          patient={patient}
          bill={bill}
          mode={billViewMode}
          onModeChange={setBillViewMode}
          printMode
        />
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// TABS COMPONENTS
// ----------------------------------------------------------------------------

function VisitsTab({ patient, visits, isManager, visitCharges, roomChargesList, roomSwitches }: { patient: any, visits: any[], isManager: boolean, visitCharges?: number, roomChargesList: any[], roomSwitches: any[] }) {
  const { data: user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const canManage = isManager || isAdmin;
  const [open, setOpen] = useState(false);
  const [chargeType, setChargeType] = useState<"OTHER" | "PROSTHESIS" | "PATHOLOGY" | "RADIOLOGY">("OTHER");
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null);
  const { data: doctors } = useDoctors();
  const { data: roomTypes } = useRoomTypes();
  const { data: assignedDoctors } = useAssignedDoctors(patient.id);
  const createVisit = useCreateVisit();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [editingDailyVisit, setEditingDailyVisit] = useState<{ row: any; entryId: number; entryVisitCharge: number; entryData: any } | null>(null);
  const [isDailyEditOpen, setIsDailyEditOpen] = useState(false);
  const [dailyEditCharge, setDailyEditCharge] = useState("");

  const invalidateBill = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/patients', patient.id, 'bill'] });
    queryClient.invalidateQueries({ queryKey: [api.patients.getBill.path, patient.id] });
  };

  const materializeVisitsMutation = useMutation({
    mutationFn: async () => {
      const rows = computeDailyRoomCharges(patient, roomSwitches, roomTypes ?? []);
      const created: any[] = [];
      for (const row of rows) {
        const res = await fetch(`/api/patients/${patient.id}/room-charges`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            date: row.date,
            roomTypeId: row.roomTypeId,
            roomCharge: row.roomCharge,
            nursingCharge: row.nursingCharge,
            rmoCharge: row.rmoCharge,
            visitCharge: row.visitCharge,
            notes: null,
          }),
        });
        if (!res.ok) throw new Error("Failed to save visit entry");
        created.push(await res.json());
      }
      return created;
    },
    onSuccess: () => invalidateBill(),
    onError: () => toast({ title: "Error", description: "Failed to save visit entries.", variant: "destructive" }),
  });

  const updateVisitChargeMutation = useMutation({
    mutationFn: async ({ entryId, newVisitCharge, entryData }: { entryId: number; newVisitCharge: number; entryData: any }) => {
      const res = await fetch(`/api/patients/${patient.id}/room-charges/${entryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          date: format(new Date(entryData.date), 'yyyy-MM-dd'),
          roomTypeId: entryData.roomTypeId,
          roomCharge: entryData.roomCharge,
          nursingCharge: entryData.nursingCharge,
          rmoCharge: entryData.rmoCharge,
          visitCharge: newVisitCharge,
          notes: entryData.notes ?? null,
        }),
      });
      if (!res.ok) throw new Error("Failed to update");
    },
    onSuccess: () => {
      invalidateBill();
      toast({ title: "Updated", description: "Visit charge updated." });
      setIsDailyEditOpen(false);
      setEditingDailyVisit(null);
    },
    onError: () => toast({ title: "Error", description: "Failed to update visit charge.", variant: "destructive" }),
  });

  const getOrMaterializeEntry = async (row: any): Promise<any | null> => {
    const visibleRoomChargesList = roomChargesList.filter((rc: any) => rc.notes !== EMPTY_ROOM_CONFIGURATION_MARKER);
    if (visibleRoomChargesList.length > 0 && row._chargeEntryId) {
      const existingEntry = visibleRoomChargesList.find((rc: any) => rc.id === row._chargeEntryId) ?? null;
      if (existingEntry) return existingEntry;
    }
    const created = await materializeVisitsMutation.mutateAsync();
    return created.find((e: any) =>
      format(new Date(e.date), 'yyyy-MM-dd') === row.date && e.roomTypeId === row._roomTypeId
    ) ?? null;
  };

  const handleDailyVisitDelete = async (row: any) => {
    if (!canManage) return;
    const entry = await getOrMaterializeEntry(row);
    if (!entry) { toast({ title: "Error", description: "Could not find entry to update.", variant: "destructive" }); return; }
    const newVisitCharge = Math.max(0, (entry.visitCharge ?? 0) - row._slotDefaultCharge);
    updateVisitChargeMutation.mutate({ entryId: entry.id, newVisitCharge, entryData: entry });
  };

  const handleDailyVisitEdit = async (row: any) => {
    if (!canManage) return;
    const entry = await getOrMaterializeEntry(row);
    if (!entry) { toast({ title: "Error", description: "Could not find entry to edit.", variant: "destructive" }); return; }
    setEditingDailyVisit({ row, entryId: entry.id, entryVisitCharge: entry.visitCharge ?? 0, entryData: entry });
    setDailyEditCharge(String(row._slotDefaultCharge));
    setIsDailyEditOpen(true);
  };

  const handleDailyEditSave = () => {
    if (!editingDailyVisit) return;
    const newSlotCharge = Math.max(0, parseInt(dailyEditCharge) || 0);
    const { row, entryId, entryVisitCharge, entryData } = editingDailyVisit;
    const newVisitCharge = Math.max(0, entryVisitCharge - row._slotDefaultCharge + newSlotCharge);
    updateVisitChargeMutation.mutate({ entryId, newVisitCharge, entryData });
  };

  const isBusy = materializeVisitsMutation.isPending || updateVisitChargeMutation.isPending;

  const { data: doctorRoomCharges } = useQuery<any[]>({
    queryKey: [`/api/doctors/${selectedDoctorId}/room-charges`],
    enabled: selectedDoctorId !== null,
  });

  const visitForm = useForm({ defaultValues: { date: format(new Date(), "yyyy-MM-dd"), doctorId: "", charge: "" }});
  
  const onSubmit = (data: any) => {
    createVisit.mutate({ patientId: patient.id, doctorId: parseInt(data.doctorId), charge: parseInt(data.charge), date: data.date }, {
      onSuccess: () => {
        setOpen(false);
        setSelectedDoctorId(null);
        visitForm.reset({ date: format(new Date(), "yyyy-MM-dd"), doctorId: "", charge: "" });
      }
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

  return (
    <Card className="border-border/50 shadow-md">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-display">Doctor Visits</CardTitle>
        {!patient.discharged && (
          <div className="flex gap-2">
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setSelectedDoctorId(null); }}>
              <DialogTrigger asChild>
                <Button size="sm" className="hover-elevate"><Plus className="w-4 h-4 mr-2" /> Add Visit</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Record Doctor Visit</DialogTitle></DialogHeader>
                <Form {...visitForm}>
                  <form onSubmit={visitForm.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField control={visitForm.control} name="date" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Visit Date</FormLabel>
                        <FormControl><Input type="date" {...field} data-testid="input-visit-date" /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={visitForm.control} name="doctorId" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Doctor</FormLabel>
                        <Select onValueChange={(val) => { field.onChange(val); handleDoctorChange(val); }}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select Doctor" /></SelectTrigger></FormControl>
                          <SelectContent>{doctors?.map(d => <SelectItem key={d.id} value={d.id.toString()}>{formatDoctorName(d.name)}</SelectItem>)}</SelectContent>
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
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Doctor</TableHead>
              <TableHead>Room</TableHead>
              <TableHead className="text-right">Charge (₹)</TableHead>
              {canManage && <TableHead className="w-16"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {(() => {
              const assignedDoctorName = assignedDoctors && assignedDoctors.length > 0 ? assignedDoctors[0].doctorName : null;
              const visibleRoomChargesList = roomChargesList.filter((rc: any) => rc.notes !== EMPTY_ROOM_CONFIGURATION_MARKER);
              const hasExplicit = visibleRoomChargesList.length > 0 && roomSwitches.length === 0;

              // Build 2 visit entries per day from computed or explicit room charges
              const dailyVisitRows: any[] = [];
              if (roomTypes) {
                let dayEntries: any[] = [];

                if (hasExplicit) {
                  // Group entries by date to detect switch days (2 entries) vs normal days (1 entry)
                  const byDate = new Map<string, any[]>();
                  for (const rc of visibleRoomChargesList.filter((rc: any) => (rc.visitCharge ?? 0) > 0)) {
                    const dk = format(new Date(rc.date), 'yyyy-MM-dd');
                    if (!byDate.has(dk)) byDate.set(dk, []);
                    byDate.get(dk)!.push(rc);
                  }
                  for (const [dateKey, entries] of Array.from(byDate.entries())) {
                    const visitEntries: any[] = [];
                    if (entries.length === 1) {
                      const rc = entries[0];
                      const rt = roomTypes.find((r: any) => r.id === rc.roomTypeId);
                      const half = Math.round((rc.visitCharge ?? 0) / 2);
                      visitEntries.push({ roomTypeName: rt?.name ?? "—", charge: half, _slotDefaultCharge: half, _chargeEntryId: rc.id, _roomTypeId: rc.roomTypeId, _slotIndex: 0 });
                      visitEntries.push({ roomTypeName: rt?.name ?? "—", charge: (rc.visitCharge ?? 0) - half, _slotDefaultCharge: (rc.visitCharge ?? 0) - half, _chargeEntryId: rc.id, _roomTypeId: rc.roomTypeId, _slotIndex: 1 });
                    } else {
                      entries.forEach((rc: any, idx: number) => {
                        const rt = roomTypes.find((r: any) => r.id === rc.roomTypeId);
                        visitEntries.push({ roomTypeName: rt?.name ?? "—", charge: rc.visitCharge ?? 0, _slotDefaultCharge: rc.visitCharge ?? 0, _chargeEntryId: rc.id, _roomTypeId: rc.roomTypeId, _slotIndex: idx });
                      });
                    }
                    if (entries.length === 1) {
                      const rc = entries[0];
                      const rt = roomTypes.find((r: any) => r.id === rc.roomTypeId);
                      const totalVisitCharge = rc.visitCharge ?? 0;
                      const baseVisitCharge = rt?.visitCharge ?? 0;
                      if (!(baseVisitCharge > 0 && totalVisitCharge === baseVisitCharge * 2)) {
                        visitEntries.splice(0, visitEntries.length);
                        if (totalVisitCharge > 0) {
                          visitEntries.push({ roomTypeName: rt?.name ?? "?", charge: totalVisitCharge, _slotDefaultCharge: totalVisitCharge, _chargeEntryId: rc.id, _roomTypeId: rc.roomTypeId, _slotIndex: 0 });
                        }
                      }
                    }
                    dayEntries.push({ date: dateKey, _date: new Date(entries[0].date), visitEntries, doctorName: assignedDoctorName });
                  }
                  dayEntries.sort((a: any, b: any) => a._date.getTime() - b._date.getTime());
                } else {
                  dayEntries = computeDailyRoomCharges(patient, roomSwitches, roomTypes)
                    .filter((r: any) => (r.visitCharge ?? 0) > 0)
                    .map((r: any) => ({
                      ...r,
                      _date: new Date(r.date),
                      doctorName: assignedDoctorName,
                      visitEntries: (r.visitEntries as any[]).map((ve: any, idx: number) => ({
                        ...ve,
                        _slotDefaultCharge: ve.charge,
                        _roomTypeId: r.roomTypeId,
                        _chargeEntryId: null,
                        _slotIndex: idx,
                      })),
                    }));
                }

                dayEntries.forEach((day: any, dayIdx: number) => {
                  (day.visitEntries as any[]).forEach((entry, entryIdx) => {
                    dailyVisitRows.push({
                      _key: `daily-${dayIdx}-${entryIdx}`,
                      _isDaily: true,
                      _date: day._date,
                      date: day.date,
                      doctorName: day.doctorName,
                      roomTypeName: entry.roomTypeName,
                      charge: entry.charge,
                      _slotDefaultCharge: entry._slotDefaultCharge ?? entry.charge,
                      _chargeEntryId: entry._chargeEntryId ?? null,
                      _roomTypeId: entry._roomTypeId ?? null,
                      _slotIndex: entry._slotIndex ?? entryIdx,
                    });
                  });
                });
              }

              const currentRoomType = roomTypes?.find((r: any) => r.id === patient.roomTypeId);
              const manualRows = visits.map((v: any) => ({
                _key: `visit-${v.id}`,
                _isDaily: false,
                _date: new Date(v.date),
                date: v.date,
                doctorId: v.doctorId,
                roomTypeName: currentRoomType?.name ?? "—",
                charge: v.charge,
              }));

              const allRows = [...dailyVisitRows, ...manualRows].sort((a, b) => a._date.getTime() - b._date.getTime());

              if (allRows.length === 0) {
                return <TableRow><TableCell colSpan={canManage ? 5 : 4} className="text-center text-muted-foreground py-6">No visits recorded yet.</TableCell></TableRow>;
              }

              return allRows.map((row) =>
                row._isDaily ? (
                  <TableRow key={row._key} className={row.charge === 0 ? "opacity-50" : ""}>
                    <TableCell className="font-medium">{format(row._date, "dd MMM yyyy")}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-2">
                        {row.doctorName ? formatDoctorName(row.doctorName) : <span className="text-muted-foreground">—</span>}
                        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">Daily Visit</span>
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{row.roomTypeName}</TableCell>
                    <TableCell className="text-right font-medium">
                      {row.charge === 0 ? <span className="text-muted-foreground line-through">Removed</span> : `₹${row.charge.toLocaleString()}`}
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <span className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={isBusy} onClick={() => handleDailyVisitEdit(row)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" disabled={isBusy || row.charge === 0} onClick={() => handleDailyVisitDelete(row)}>
                            {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                          </Button>
                        </span>
                      </TableCell>
                    )}
                  </TableRow>
                ) : (
                  <TableRow key={row._key}>
                    <TableCell className="font-medium">{format(row._date, "dd MMM yyyy, HH:mm")}</TableCell>
                    <TableCell>{doctors?.find((d: any) => d.id === row.doctorId)?.name ? formatDoctorName(doctors.find((d: any) => d.id === row.doctorId)!.name) : 'Unknown'}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{row.roomTypeName}</TableCell>
                    <TableCell className="text-right font-medium">₹{row.charge.toLocaleString()}</TableCell>
                    {canManage && <TableCell />}
                  </TableRow>
                )
              );
            })()}
          </TableBody>
        </Table>
      </CardContent>

      {/* Edit daily visit charge dialog */}
      <Dialog open={isDailyEditOpen} onOpenChange={(v) => { setIsDailyEditOpen(v); if (!v) setEditingDailyVisit(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Visit Charge</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {editingDailyVisit && (
              <p className="text-sm text-muted-foreground">
                {format(editingDailyVisit.row._date, "dd MMM yyyy")} · {editingDailyVisit.row.roomTypeName} · Visit {(editingDailyVisit.row._slotIndex ?? 0) + 1}
              </p>
            )}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Charge (₹)</label>
              <Input
                type="number"
                min="0"
                value={dailyEditCharge}
                onChange={(e) => setDailyEditCharge(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleDailyEditSave()}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setIsDailyEditOpen(false); setEditingDailyVisit(null); }}>Cancel</Button>
              <Button onClick={handleDailyEditSave} disabled={updateVisitChargeMutation.isPending}>
                {updateVisitChargeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
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
  const [chargeType, setChargeType] = useState<"OTHER" | "PROSTHESIS" | "PATHOLOGY" | "RADIOLOGY">("OTHER");
  const [selectedCatalogId, setSelectedCatalogId] = useState<string>("custom");
  const createCharge = useCreateCharge();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: otherChargeCatalog = [] } = useQuery<any[]>({ queryKey: ["/api/other-charge-catalog"] });

  const chargeFormSchema = z.object({ 
    description: z.string().min(1, "Description is required"),
    amount: z.coerce.number().min(1, "Amount must be greater than 0"),
  });
  const form = useForm<z.infer<typeof chargeFormSchema>>({
    resolver: zodResolver(chargeFormSchema),
    defaultValues: { description: "", amount: 0 }
  });

  const onSubmit = (data: z.infer<typeof chargeFormSchema>) => {
    createCharge.mutate({ patientId: patient.id, type: chargeType, description: data.description, amount: data.amount }, {
      onSuccess: () => {
        toast({ title: "Success", description: "Charge added successfully." });
        form.reset({ description: "", amount: 0 });
        setOpen(false);
        setChargeType("OTHER");
        setSelectedCatalogId("custom");
      },
      onError: (error: any) => {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
    });
  };

  const groupedCharges = {
    OTHER: charges.filter((charge: any) => !["PROSTHESIS", "PATHOLOGY", "RADIOLOGY"].includes(charge.type)),
    PROSTHESIS: charges.filter((charge: any) => charge.type === "PROSTHESIS"),
    PATHOLOGY: charges.filter((charge: any) => charge.type === "PATHOLOGY"),
    RADIOLOGY: charges.filter((charge: any) => charge.type === "RADIOLOGY"),
  };

  const chargeTypeLabels: Record<string, string> = {
    OTHER: "General",
    NURSING: "General",
    PROSTHESIS: "Prosthesis (Implant / Stent)",
    PATHOLOGY: "Pathology",
    RADIOLOGY: "Radiology",
  };

  const filteredCatalog = otherChargeCatalog.filter((item: any) => item.category === chargeType);

  const handleCatalogPick = (value: string) => {
    setSelectedCatalogId(value);
    if (value === "custom") {
      form.setValue("description", "", { shouldValidate: false, shouldDirty: true });
      if (chargeType !== "PROSTHESIS") {
        form.setValue("amount", 0, { shouldValidate: false, shouldDirty: true });
      }
      return;
    }
    const selectedItem = filteredCatalog.find((item: any) => item.id.toString() === value);
    if (!selectedItem) return;
    form.setValue("description", selectedItem.name, { shouldValidate: true, shouldDirty: true });
    if (chargeType !== "PROSTHESIS") {
      form.setValue("amount", selectedItem.defaultAmount ?? 0, { shouldValidate: true, shouldDirty: true });
    }
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
        <CardTitle className="font-display">Other Charges</CardTitle>
        {!patient.discharged && canManage && (
          <Dialog open={open} onOpenChange={(nextOpen) => {
            setOpen(nextOpen);
            if (!nextOpen) {
              setSelectedCatalogId("custom");
              setChargeType("OTHER");
              form.reset({ description: "", amount: 0 });
            }
          }}>
            <DialogTrigger asChild>
              <Button size="sm" className="hover-elevate bg-primary hover:bg-primary/90"><Plus className="w-4 h-4 mr-2" /> Add Charge</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px]">
              <DialogHeader>
                <DialogTitle className="font-display">Add Other Charge</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <FormLabel>Charge Category</FormLabel>
                    <Tabs value={chargeType} onValueChange={(value) => {
                      setChargeType(value as typeof chargeType);
                      setSelectedCatalogId("custom");
                      form.reset({ description: "", amount: 0 });
                    }}>
                      <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:grid-cols-4">
                        <TabsTrigger value="OTHER">General</TabsTrigger>
                        <TabsTrigger value="PROSTHESIS">Prosthesis</TabsTrigger>
                        <TabsTrigger value="PATHOLOGY">Pathology</TabsTrigger>
                        <TabsTrigger value="RADIOLOGY">Radiology</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                  <div className="space-y-2">
                    <FormLabel>{chargeType === "PROSTHESIS" ? "Prosthesis Name" : "Saved Options"}</FormLabel>
                    <Select value={selectedCatalogId} onValueChange={handleCatalogPick}>
                      <SelectTrigger>
                        <SelectValue placeholder={chargeType === "PROSTHESIS" ? "Pick a saved prosthesis name or keep custom" : "Pick a saved charge or keep custom"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="custom">Custom entry</SelectItem>
                        {filteredCatalog.map((item: any) => (
                          <SelectItem key={item.id} value={item.id.toString()}>
                            {chargeType === "PROSTHESIS" ? item.name : (
                              <>
                            {item.name} - ₹{(item.defaultAmount ?? 0).toLocaleString()}
                              </>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {chargeType === "PROSTHESIS"
                        ? "Choose a prosthesis name, then enter the charge amount below."
                        : "Choose a saved option or type your own description below."}
                    </p>
                  </div>
                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Consumables, Implant, Lab panel, CT scan" {...field} />
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
        <Tabs defaultValue="OTHER" className="space-y-4">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:grid-cols-4">
            <TabsTrigger value="OTHER">General</TabsTrigger>
            <TabsTrigger value="PROSTHESIS">Prosthesis</TabsTrigger>
            <TabsTrigger value="PATHOLOGY">Pathology</TabsTrigger>
            <TabsTrigger value="RADIOLOGY">Radiology</TabsTrigger>
          </TabsList>
          {(["OTHER", "PROSTHESIS", "PATHOLOGY", "RADIOLOGY"] as const).map((typeKey) => {
            const list = groupedCharges[typeKey];
            return (
              <TabsContent key={typeKey} value={typeKey}>
                {list.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No {chargeTypeLabels[typeKey].toLowerCase()} charges</div>
                ) : (
          <Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="w-[50px]"></TableHead></TableRow></TableHeader>
            <TableBody>
                      {list.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell>{format(new Date(c.date), "MMM dd, yyyy")}</TableCell>
                  <TableCell>{c.description || chargeTypeLabels[c.type] || c.type}</TableCell>
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
              </TabsContent>
            );
          })}
        </Tabs>
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
                          {formatDoctorName(d.name)} — {d.specialization}
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
                    {p.doctorId ? formatDoctorName(doctors?.find(d => d.id === p.doctorId)?.name ?? "Unknown") : "—"}
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
  const { data: roomNumbers = [] } = useQuery<Array<{ id: number; roomTypeId: number; number: string }>>({
    queryKey: [api.roomNumbers.list.path],
  });
  const { data: patients = [] } = usePatients();
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
    advanceAmount: z.coerce.number().min(0, "Advance amount must be 0 or more"),
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
      advanceAmount: patient.advanceAmount ?? 0,
    },
  });

  const selectedRoomTypeId = Number(form.watch("roomTypeId") ?? 0);

  const availableRooms = useMemo(() => {
    if (!selectedRoomTypeId) return [];

    const occupiedRoomNumbers = new Set(
      patients
        .filter((entry) => !entry.discharged && entry.roomTypeId === selectedRoomTypeId && entry.id !== patient.id)
        .map((entry) => entry.bedNumber?.trim().toLowerCase())
        .filter(Boolean),
    );

    const matchingRooms = roomNumbers
      .filter((room) => room.roomTypeId === selectedRoomTypeId)
      .filter((room) => !occupiedRoomNumbers.has(room.number.trim().toLowerCase()) || room.number === patient.bedNumber)
      .sort((left, right) => left.number.localeCompare(right.number, undefined, { numeric: true, sensitivity: "base" }));

    const hasCurrentRoom = matchingRooms.some((room) => room.number === patient.bedNumber);
    if (!hasCurrentRoom && patient.bedNumber && selectedRoomTypeId === patient.roomTypeId) {
      return [{ id: -1, roomTypeId: patient.roomTypeId, number: patient.bedNumber }, ...matchingRooms];
    }

    return matchingRooms;
  }, [patient.bedNumber, patient.id, patients, roomNumbers, selectedRoomTypeId]);

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
              <FormField control={form.control} name="advanceAmount" render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Advance Amount</FormLabel>
                  <FormControl><Input type="number" min={0} data-testid="input-advance-amount" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="bedNumber" render={({ field }) => (
                <FormItem>
                  <FormLabel>Room Number</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger data-testid="input-bed-number"><SelectValue placeholder={selectedRoomTypeId ? "Select available room" : "Select room type first"} /></SelectTrigger></FormControl>
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
              <FormField control={form.control} name="roomTypeId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Room Type</FormLabel>
                  <Select onValueChange={(v) => {
                    field.onChange(Number(v));
                    form.setValue("bedNumber", "");
                  }} defaultValue={field.value?.toString()}>
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
  { key: "surgeryCharge",          label: "Features",                category: "SURGERY" },
  { key: "surgeonCharge",          label: "Surgeon Charge",          category: "SURGEON" },
  { key: "assistantSurgeonCharge", label: "Assistant Surgeon Charge", category: "ASSISTANT_SURGEON" },
  { key: "anaesthetistCharge",     label: "Anaesthetist Charge",     category: "ANAESTHETIST" },
  { key: "otCharge",               label: "OT Charge",               category: "OT" },
  { key: "otAssistantCharge",      label: "OT Assistant Charge",     category: "OT_ASSISTANT" },
] as const;

const SURGERY_TICK_OPTIONS = [
  { key: "armLaminarCharge", label: "Arm Laminar", catalogName: "arm laminar" },
  { key: "airFlowSterilisationCharge", label: "Air Flow Sterilisation", catalogName: "air flow sterilisation" },
  { key: "gaksCharge", label: "GAKS", catalogName: "gaks" },
] as const;

// Mapping from surgery category key to doctor filter role and surgery-charge category key.
// noDoctor: true means this line shows only a charge input (no doctor dropdown).
const DOCTOR_CATEGORY_CONFIG: Record<string, { roleFilter: "isSurgeon" | "isAssistantSurgeon" | "isOtAssistant" | "isAnaesthetist" | null; chargeCategory: string; noDoctor?: boolean }> = {
  surgeonCharge:          { roleFilter: "isSurgeon",           chargeCategory: "SURGEON" },
  assistantSurgeonCharge: { roleFilter: "isSurgeon",           chargeCategory: "ASSISTANT_SURGEON" },
  anaesthetistCharge:     { roleFilter: "isAnaesthetist",      chargeCategory: "ANAESTHETIST" },
  otCharge:               { roleFilter: null,                  chargeCategory: "OT",   noDoctor: true },
  otAssistantCharge:      { roleFilter: null,                  chargeCategory: "OT_ASSISTANT", noDoctor: true },
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

  const [surgeryDate, setSurgeryDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const defaultCharges = { surgeryCharge: "", surgeonCharge: "", assistantSurgeonCharge: "", anaesthetistCharge: "", otCharge: "", otAssistantCharge: "", armLaminarCharge: "", airFlowSterilisationCharge: "", gaksCharge: "" };
  const [charges, setCharges] = useState<Record<string, string>>({ ...defaultCharges });
  const [selectedDoctors, setSelectedDoctors] = useState<Record<string, string>>({});
  const [selectedFeatureIds, setSelectedFeatureIds] = useState<string[]>([]);

  const resetDialog = () => { setCharges({ ...defaultCharges }); setSelectedDoctors({}); setSurgeryDate(format(new Date(), "yyyy-MM-dd")); setSelectedFeatureIds([]); };

  const handleCatalogSelect = (categoryKey: string, catalogId: string, cat: string) => {
    const item = catalog?.find((c: any) => c.id.toString() === catalogId && c.category === cat);
    if (item) setCharges(prev => ({ ...prev, [categoryKey]: item.cost.toString() }));
  };

  const featureOptions = catalog ?? [];

  const toggleFeature = (featureId: string) => {
    const nextIds = selectedFeatureIds.includes(featureId)
      ? selectedFeatureIds.filter((id) => id !== featureId)
      : [...selectedFeatureIds, featureId];

    setSelectedFeatureIds(nextIds);

    const total = nextIds.reduce((sum, id) => {
      const item = featureOptions.find((feature: any) => feature.id.toString() === id);
      return sum + (item?.cost ?? 0);
    }, 0);

    setCharges((prev) => ({ ...prev, surgeryCharge: total ? total.toString() : "" }));
  };

  const toggleSurgeryTick = (key: string, catalogName: string) => {
    const enabled = (parseInt(charges[key] || "0") || 0) > 0;
    const item = featureOptions.find((feature: any) => feature.name?.trim().toLowerCase() === catalogName);
    setCharges((prev) => ({ ...prev, [key]: enabled ? "" : String(item?.cost ?? 0) }));
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
        date: surgeryDate,
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
    (s.anaesthetistCharge ?? 0) + (s.otCharge ?? 0) + (s.otAssistantCharge ?? 0) +
    (s.armLaminarCharge ?? 0) + (s.airFlowSterilisationCharge ?? 0) + (s.gaksCharge ?? 0);

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

                {/* Date */}
                <div className="border border-border/50 rounded-lg p-3 space-y-1.5 bg-secondary/20">
                  <p className="text-sm font-semibold text-foreground">Surgery Date</p>
                  <Input
                    type="date"
                    value={surgeryDate}
                    onChange={(e) => setSurgeryDate(e.target.value)}
                    data-testid="input-surgery-date"
                    className="w-full"
                  />
                </div>


                {/* Features */}
                {(() => {
                  const { key, label } = SURGERY_CATEGORIES[0];
                  return (
                    <div className="border border-border/50 rounded-lg p-3 space-y-2 bg-secondary/20">
                      <p className="text-sm font-semibold text-foreground">{label}</p>
                      {featureOptions.length > 0 ? (
                        <div className="space-y-2">
                          <div className="grid gap-2">
                            {featureOptions.map((feature: any) => {
                              const selected = selectedFeatureIds.includes(feature.id.toString());
                              return (
                                <button
                                  key={feature.id}
                                  type="button"
                                  className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors ${selected ? "border-primary bg-primary/10 text-primary" : "border-border/60 bg-background hover:bg-secondary/40"}`}
                                  onClick={() => toggleFeature(feature.id.toString())}
                                  data-testid={`toggle-feature-${feature.id}`}
                                >
                                  <span className="font-medium">{feature.name}</span>
                                  <span className="text-sm">₹{feature.cost.toLocaleString()}</span>
                                </button>
                              );
                            })}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Selected feature charges are summed automatically.
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No features added yet in Surgery Catalog.</p>
                      )}
                      <div className="flex gap-2 items-center">
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

                <div className="border border-border/50 rounded-lg p-3 space-y-2 bg-secondary/20">
                  <p className="text-sm font-semibold text-foreground">Additional Surgery Options</p>
                  <div className="grid gap-2">
                    {SURGERY_TICK_OPTIONS.map((option) => {
                      const amount = parseInt(charges[option.key] || "0") || 0;
                      const catalogItem = featureOptions.find((feature: any) => feature.name?.trim().toLowerCase() === option.catalogName);
                      return (
                        <button
                          key={option.key}
                          type="button"
                          className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors ${amount > 0 ? "border-primary bg-primary/10 text-primary" : "border-border/60 bg-background hover:bg-secondary/40"}`}
                          onClick={() => toggleSurgeryTick(option.key, option.catalogName)}
                        >
                          <span className="font-medium">{option.label}</span>
                          <span className="text-sm">{formatMoney(catalogItem?.cost ?? 0)}</span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">Configure these prices in the Surgery Catalog using the same names.</p>
                </div>

                {/* Doctor-linked charges */}
                {SURGERY_CATEGORIES.slice(1).map(({ key, label }) => {
                  const config = DOCTOR_CATEGORY_CONFIG[key];
                  const doctors = getFilteredDoctors(config?.roleFilter ?? null);
                  return (
                    <div key={key} className="border border-border/50 rounded-lg p-3 space-y-2 bg-secondary/20">
                      <p className="text-sm font-semibold text-foreground">{label}</p>
                      <div className="flex gap-2 items-center">
                        {!config?.noDoctor && (
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
                                  {formatDoctorName(d.name)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        <div className={`relative ${config?.noDoctor ? "w-full" : "w-32 shrink-0"}`}>
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                          <Input
                            type="number" min="0" className="pl-7" placeholder="0"
                            value={charges[key]}
                            onChange={(e) => setCharges(prev => ({ ...prev, [key]: e.target.value }))}
                            data-testid={`input-${key}`}
                          />
                        </div>
                      </div>
                      {!config?.noDoctor && selectedDoctors[key] && selectedDoctors[key] !== "__none" && charges[key] && (
                        <p className="text-xs text-primary">
                          Auto-filled from {formatDoctorName(doctors.find((d: any) => d.id.toString() === selectedDoctors[key])?.name ?? "")}'s configured rate
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

function computeDailyRoomCharges(patient: any, roomSwitches: any[], roomTypes: any[], daysAdmitted?: number) {
  if (!roomTypes) return [];
  // Use UTC midnight to avoid browser timezone shifting the day count
  const toUTCMidnight = (d: Date) => { const m = new Date(d); m.setUTCHours(0, 0, 0, 0); return m; };
  const admissionDay = toUTCMidnight(new Date(patient.admissionDate));
  const endDay = patient.discharged && patient.expectedDischargeDate
    ? toUTCMidnight(new Date(patient.expectedDischargeDate))
    : toUTCMidnight(new Date());

  const sorted = [...roomSwitches].sort((a, b) => new Date(a.switchDate).getTime() - new Date(b.switchDate).getTime());
  const initialRoomTypeId = sorted.length > 0 ? sorted[0].fromRoomTypeId : patient.roomTypeId;
  const result: any[] = [];
  let current = new Date(admissionDay);
  let calendarDays = 0;
  const maxDays = daysAdmitted ?? Infinity;

  while (current <= endDay && calendarDays < maxDays) {
    const dayTime = current.getTime();
    const switchOnDay = sorted.find(sw => toUTCMidnight(new Date(sw.switchDate)).getTime() === dayTime);

    if (switchOnDay && switchOnDay.isHalfDay) {
      const oldRt = roomTypes.find((r: any) => r.id === switchOnDay.fromRoomTypeId);
      const newRt = roomTypes.find((r: any) => r.id === switchOnDay.toRoomTypeId);
      const dist = switchOnDay.visitDistribution ?? "old_new";
      let visitEntries: { roomTypeName: string; charge: number }[];
      if (dist === "old_twice") {
        visitEntries = [
          { roomTypeName: oldRt?.name ?? "?", charge: oldRt?.visitCharge ?? 0 },
          { roomTypeName: oldRt?.name ?? "?", charge: oldRt?.visitCharge ?? 0 },
        ];
      } else if (dist === "new_twice") {
        visitEntries = [
          { roomTypeName: newRt?.name ?? "?", charge: newRt?.visitCharge ?? 0 },
          { roomTypeName: newRt?.name ?? "?", charge: newRt?.visitCharge ?? 0 },
        ];
      } else {
        visitEntries = [
          { roomTypeName: oldRt?.name ?? "?", charge: oldRt?.visitCharge ?? 0 },
          { roomTypeName: newRt?.name ?? "?", charge: newRt?.visitCharge ?? 0 },
        ];
      }
      // Push two separate rows — one per room for half-day split
      result.push({
        date: format(current, "yyyy-MM-dd"),
        roomTypeName: oldRt?.name ?? "?",
        roomTypeId: switchOnDay.fromRoomTypeId,
        roomCharge: Math.round((oldRt?.dailyCharge ?? 0) / 2),
        nursingCharge: Math.round((oldRt?.nursingCharge ?? 0) / 2),
        rmoCharge: Math.round((oldRt?.rmoCharge ?? 0) / 2),
        incentiviseCharge: Math.round((oldRt?.incentiviseCharge ?? 0) / 2),
        monitorCharge: Math.round((oldRt?.monitorCharge ?? 0) / 2),
        visitCharge: visitEntries[0].charge,
        visitEntries: [visitEntries[0]],
        isHalfDay: true,
        isComputed: true,
      });
      result.push({
        date: format(current, "yyyy-MM-dd"),
        roomTypeName: newRt?.name ?? "?",
        roomTypeId: switchOnDay.toRoomTypeId,
        roomCharge: Math.round((newRt?.dailyCharge ?? 0) / 2),
        nursingCharge: Math.round((newRt?.nursingCharge ?? 0) / 2),
        rmoCharge: Math.round((newRt?.rmoCharge ?? 0) / 2),
        incentiviseCharge: Math.round((newRt?.incentiviseCharge ?? 0) / 2),
        monitorCharge: Math.round((newRt?.monitorCharge ?? 0) / 2),
        visitCharge: visitEntries[1].charge,
        visitEntries: [visitEntries[1]],
        isHalfDay: true,
        isComputed: true,
      });
    } else {
      let roomTypeId = initialRoomTypeId;
      const isSwitchDay = sorted.some(sw => toUTCMidnight(new Date(sw.switchDate)).getTime() === dayTime && !sw.isHalfDay);
      for (const sw of sorted) {
        if (toUTCMidnight(new Date(sw.switchDate)) <= current) roomTypeId = sw.toRoomTypeId;
      }
      const rt = roomTypes.find((r: any) => r.id === roomTypeId);
      result.push({
        date: format(current, "yyyy-MM-dd"),
        roomTypeName: rt?.name ?? "Unknown",
        roomTypeId,
        roomCharge: rt?.dailyCharge ?? 0,
        nursingCharge: rt?.nursingCharge ?? 0,
        rmoCharge: rt?.rmoCharge ?? 0,
        incentiviseCharge: rt?.incentiviseCharge ?? 0,
        monitorCharge: rt?.monitorCharge ?? 0,
        visitCharge: (rt?.visitCharge ?? 0) * 2,
        visitEntries: [
          { roomTypeName: rt?.name ?? "Unknown", charge: rt?.visitCharge ?? 0 },
          { roomTypeName: rt?.name ?? "Unknown", charge: rt?.visitCharge ?? 0 },
        ],
        isHalfDay: false,
        isFullDaySwitch: isSwitchDay,
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
    defaultValues: {
      date: format(new Date(), "yyyy-MM-dd"),
      roomTypeId: "",
      roomCharge: 0,
      nursingCharge: 0,
      rmoCharge: 0,
      incentiviseCharge: 0,
      monitorCharge: 0,
      visitCharge: 0,
      notes: "",
    },
  });

  const selectedRoomTypeId = form.watch("roomTypeId");

  useEffect(() => {
    if (selectedRoomTypeId && roomTypes) {
      const rt = roomTypes.find((r: any) => String(r.id) === String(selectedRoomTypeId));
      if (rt) {
        form.setValue("roomCharge", rt.dailyCharge ?? 0);
        form.setValue("nursingCharge", rt.nursingCharge ?? 0);
        form.setValue("rmoCharge", rt.rmoCharge ?? 0);
        form.setValue("incentiviseCharge", rt.incentiviseCharge ?? 0);
        form.setValue("monitorCharge", rt.monitorCharge ?? 0);
        form.setValue("visitCharge", rt.visitCharge ?? 0);
      }
    }
  }, [selectedRoomTypeId, roomTypes]);

  const openAdd = () => {
    setEditing(null);
    form.reset({
      date: format(new Date(), "yyyy-MM-dd"),
      roomTypeId: String(patient.roomTypeId ?? ""),
      roomCharge: 0,
      nursingCharge: 0,
      rmoCharge: 0,
      incentiviseCharge: 0,
      monitorCharge: 0,
      visitCharge: 0,
      notes: "",
    });
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
      incentiviseCharge: rc.incentiviseCharge ?? 0,
      monitorCharge: rc.monitorCharge ?? 0,
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
      incentiviseCharge: rc.incentiviseCharge ?? 0,
      monitorCharge: rc.monitorCharge ?? 0,
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
          incentiviseCharge: Number(values.incentiviseCharge ?? 0),
          monitorCharge: Number(values.monitorCharge ?? 0),
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

  const showMinimumRoomChargeError = () => {
    toast({
      title: "Room charge required",
      description: "There should be at least one room charge.",
      variant: "destructive",
    });
  };

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

  const visibleRoomChargesList = roomChargesList.filter((row: any) => row.notes !== EMPTY_ROOM_CONFIGURATION_MARKER);
  const hasExplicit = visibleRoomChargesList.length > 0 && roomSwitches.length === 0;
  const displayRows: any[] = hasExplicit
    ? visibleRoomChargesList
    : computeDailyRoomCharges(patient, roomSwitches, roomTypes ?? []);

  const deleteAutoRowMutation = useMutation({
    mutationFn: async (rowIndex: number) => {
      const rowsToKeep = displayRows.filter((_row, idx) => idx !== rowIndex);
      if (rowsToKeep.length === 0) {
        throw new Error("MINIMUM_ROOM_CHARGE_REQUIRED");
      }

      for (const row of rowsToKeep) {
        const res = await fetch(`/api/patients/${patient.id}/room-charges`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            date: row.date,
            roomTypeId: row.roomTypeId ? Number(row.roomTypeId) : null,
            roomCharge: Number(row.roomCharge ?? 0),
            nursingCharge: Number(row.nursingCharge ?? 0),
            rmoCharge: Number(row.rmoCharge ?? 0),
            incentiviseCharge: Number(row.incentiviseCharge ?? 0),
            monitorCharge: Number(row.monitorCharge ?? 0),
            visitCharge: Number(row.visitCharge ?? 0),
            notes: row.notes || null,
          }),
        });
        if (!res.ok) throw new Error("Failed to save remaining room charges");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/patients', patient.id, 'bill'] });
      queryClient.invalidateQueries({ queryKey: [api.patients.getBill.path, patient.id] });
      toast({ title: "Deleted", description: "Room charge removed." });
    },
    onError: () => toast({ title: "Error", description: "Failed to delete.", variant: "destructive" }),
  });

  const requestDeleteRoomCharge = (row: any, rowIndex: number, isAutoRow: boolean) => {
    if (displayRows.length <= 1) {
      showMinimumRoomChargeError();
      return;
    }

    if (isAutoRow) {
      deleteAutoRowMutation.mutate(rowIndex);
      return;
    }

    deleteMutation.mutate(row.id);
  };

  const totalRoom = displayRows.reduce((s: number, r: any) => s + (r.roomCharge ?? 0), 0);
  const totalNursing = displayRows.reduce((s: number, r: any) => s + (r.nursingCharge ?? 0), 0);
  const totalRmo = displayRows.reduce((s: number, r: any) => s + (r.rmoCharge ?? 0), 0);
  const totalIncentivise = displayRows.reduce((s: number, r: any) => s + (r.incentiviseCharge ?? 0), 0);
  const totalMonitor = displayRows.reduce((s: number, r: any) => s + (r.monitorCharge ?? 0), 0);
  const totalVisit = displayRows.reduce((s: number, r: any) => s + (r.visitCharge ?? 0), 0);

  return (
    <Card className="border-border/50 shadow-md">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="font-display text-lg flex items-center gap-2">
          <BedDouble className="w-5 h-5 text-primary" /> Room Configuration
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
                  <TableHead className="text-right">Incentivise</TableHead>
                  <TableHead className="text-right">Monitor</TableHead>
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
                  const rowTotal = (rc.roomCharge ?? 0) + (rc.nursingCharge ?? 0) + (rc.rmoCharge ?? 0) + (rc.incentiviseCharge ?? 0) + (rc.monitorCharge ?? 0) + (rc.visitCharge ?? 0);
                  const isAutoRow = !hasExplicit;
                  return (
                    <TableRow key={hasExplicit ? rc.id : idx} data-testid={hasExplicit ? `row-room-charge-${rc.id}` : `row-room-charge-auto-${idx}`}>
                      <TableCell className="font-medium">{format(new Date(rc.date), "dd MMM yyyy")}</TableCell>
                      <TableCell className="text-sm">
                        <span className="flex items-center gap-2">
                          <span className="text-muted-foreground">{rtName}</span>
                          {!hasExplicit && rc.isHalfDay && (
                            <span className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 px-1.5 py-0.5 rounded-full font-medium shrink-0">½ Day</span>
                          )}
                          {!hasExplicit && rc.isFullDaySwitch && (
                            <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 px-1.5 py-0.5 rounded-full font-medium shrink-0">Full Day Switch</span>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">ƒ,1{(rc.incentiviseCharge ?? 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right">ƒ,1{(rc.monitorCharge ?? 0).toLocaleString()}</TableCell>
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
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:bg-destructive/10"
                              disabled={deleteMutation.isPending || deleteAutoRowMutation.isPending}
                              onClick={() => requestDeleteRoomCharge(rc, idx, isAutoRow)}
                              data-testid={`button-delete-room-charge-${isAutoRow ? `auto-${idx}` : rc.id}`}
                            >
                              <X className="w-3.5 h-3.5" />
                            </Button>
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
              <span className="text-primary text-base">Total: ₹{(totalRoom + totalNursing + totalRmo + totalIncentivise + totalMonitor + totalVisit).toLocaleString()}</span>
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
                <label className="text-sm font-medium">Incentivise</label>
                <Input type="number" min={0} data-testid="input-room-charge-incentivise" {...form.register("incentiviseCharge")} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Monitor</label>
                <Input type="number" min={0} data-testid="input-room-charge-monitor" {...form.register("monitorCharge")} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Visit</label>
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
  const { data: roomNumbers = [] } = useQuery<any[]>({ queryKey: [api.roomNumbers.list.path] });
  const { data: patients = [] } = usePatients();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const switchForm = useForm({
    defaultValues: { toRoomTypeId: "", bedNumber: "", switchDate: format(new Date(), "yyyy-MM-dd"), isHalfDay: "true", visitDistribution: "old_new", notes: "" }
  });

  const watchIsHalfDay = switchForm.watch("isHalfDay");
  const watchSwitchRoomTypeId = switchForm.watch("toRoomTypeId");
  const availableSwitchRooms = useMemo(() => {
    if (!watchSwitchRoomTypeId) return [];
    const selectedRoomTypeId = Number(watchSwitchRoomTypeId);
    const occupiedRoomNumbers = patients
      .filter((entry: any) => !entry.discharged && entry.id !== patient.id && entry.roomTypeId === selectedRoomTypeId)
      .map((entry: any) => entry.bedNumber?.trim().toLowerCase())
      .filter(Boolean);

    return roomNumbers
      .filter((room: any) => room.roomTypeId === selectedRoomTypeId)
      .filter((room: any) => !occupiedRoomNumbers.includes(room.number.trim().toLowerCase()))
      .sort((left: any, right: any) => left.number.localeCompare(right.number, undefined, { numeric: true, sensitivity: "base" }));
  }, [patient.id, patients, roomNumbers, watchSwitchRoomTypeId]);

  const switchMutation = useMutation({
    mutationFn: (data: any) =>
      fetch(`/api/patients/${patient.id}/room-switch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toRoomTypeId: parseInt(data.toRoomTypeId),
          bedNumber: data.bedNumber,
          switchDate: data.switchDate,
          isHalfDay: data.isHalfDay === "true",
          visitDistribution: data.isHalfDay === "true" ? data.visitDistribution : "old_new",
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
      switchForm.reset({ toRoomTypeId: "", bedNumber: "", switchDate: format(new Date(), "yyyy-MM-dd"), isHalfDay: "true", visitDistribution: "old_new", notes: "" });
      toast({ title: "Room switched", description: "Patient has been moved to the new room." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: any) => switchMutation.mutate(data);
  const deleteSwitchMutation = useMutation({
    mutationFn: async (switchId: number) => {
      const res = await fetch(`/api/patients/${patient.id}/room-switches/${switchId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Failed to remove room switch");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.patients.getBill.path, patient.id] });
      queryClient.invalidateQueries({ queryKey: [api.patients.get.path, patient.id] });
      queryClient.invalidateQueries({ queryKey: [api.patients.list.path] });
      toast({ title: "Deleted", description: "Room switch removed." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

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
                  <FormField control={switchForm.control} name="switchDate" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Switch Date</FormLabel>
                      <FormControl><Input type="date" {...field} data-testid="input-switch-date" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={switchForm.control} name="toRoomTypeId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Room</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          switchForm.setValue("bedNumber", "");
                        }}
                        value={field.value}
                      >
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
                  <FormField control={switchForm.control} name="bedNumber" render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Room Number</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={!watchSwitchRoomTypeId}>
                        <FormControl>
                          <SelectTrigger data-testid="select-new-room-number">
                            <SelectValue placeholder={watchSwitchRoomTypeId ? "Select room number" : "Select room type first"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableSwitchRooms.length > 0 ? (
                            availableSwitchRooms.map((room: any) => (
                              <SelectItem key={room.id} value={room.number} data-testid={`option-room-number-${room.id}`}>
                                {room.number}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="__none" disabled>No available room numbers</SelectItem>
                          )}
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
                  {watchIsHalfDay === "true" && (
                    <FormField control={switchForm.control} name="visitDistribution" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Doctor Visit Today</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger data-testid="select-visit-distribution"><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="old_new">Old room once + New room once</SelectItem>
                            <SelectItem value="old_twice">Old room twice</SelectItem>
                            <SelectItem value="new_twice">New room twice</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-1">How did the doctor visit on the switch day?</p>
                        <FormMessage />
                      </FormItem>
                    )} />
                  )}
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
                <TableHead>Doctor Visits</TableHead>
                {canManage && !patient.discharged && <TableHead className="w-[70px] text-right">Action</TableHead>}
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roomSwitches.map((sw: any) => {
                const fromRoom = roomTypes?.find((r: any) => r.id === sw.fromRoomTypeId);
                const toRoom = roomTypes?.find((r: any) => r.id === sw.toRoomTypeId);
                const visitDistLabel =
                  !sw.isHalfDay ? "—"
                  : sw.visitDistribution === "old_twice" ? `${fromRoom?.name ?? "Old"} ×2`
                  : sw.visitDistribution === "new_twice" ? `${toRoom?.name ?? "New"} ×2`
                  : `${fromRoom?.name ?? "Old"} + ${toRoom?.name ?? "New"}`;
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
                    <TableCell className="text-sm text-muted-foreground">{visitDistLabel}</TableCell>
                    {canManage && !patient.discharged && (
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          disabled={deleteSwitchMutation.isPending}
                          onClick={() => {
                            if (confirm("Remove this room switch? Billing will be recalculated.")) {
                              deleteSwitchMutation.mutate(sw.id);
                            }
                          }}
                          data-testid={`button-delete-room-switch-${sw.id}`}
                        >
                          {deleteSwitchMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                        </Button>
                      </TableCell>
                    )}
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

function ReceiptView({ patient, bill }: { patient: any, bill: any }) {
  const advanceAmount = bill.advanceAmount ?? patient.advanceAmount ?? 0;
  const finalAmount = bill.finalAmount ?? ((bill.grandTotal ?? 0) - advanceAmount);

  return (
    <div className="print-receipt-container">
      <div className="mx-auto max-w-3xl bg-white text-black">
        <div className="border-b-2 border-black pb-4 text-center">
          <h1 className="text-3xl font-bold">Criticare Hospital</h1>
          <p className="mt-1 text-sm">Advance Payment Receipt</p>
        </div>

        <div className="grid grid-cols-2 gap-6 py-6 text-sm">
          <div className="space-y-2">
            <p><span className="font-semibold">Patient Name:</span> {patient.name}</p>
            <p><span className="font-semibold">IPD Number:</span> {patient.ipdNumber || "N/A"}</p>
            <p><span className="font-semibold">Gender:</span> {patient.gender}</p>
            <p><span className="font-semibold">Phone:</span> {patient.phone || "N/A"}</p>
          </div>
          <div className="space-y-2 text-right">
            <p><span className="font-semibold">Receipt Date:</span> {format(new Date(), "MMM dd, yyyy")}</p>
            <p><span className="font-semibold">Admission:</span> {format(new Date(patient.admissionDate), "MMM dd, yyyy")}</p>
            <p><span className="font-semibold">Room/Bed:</span> {patient.bedNumber || "N/A"}</p>
            <p><span className="font-semibold">Status:</span> {patient.discharged ? "Discharged" : "Admitted"}</p>
          </div>
        </div>

        <div className="border border-black">
          <div className="flex justify-between border-b border-black px-4 py-3">
            <span className="font-semibold">Total Bill Amount</span>
            <span>{formatMoney(bill.grandTotal ?? 0)}</span>
          </div>
          <div className="flex justify-between border-b border-black px-4 py-3">
            <span className="font-semibold">Advance Amount</span>
            <span>{formatMoney(advanceAmount)}</span>
          </div>
          <div className="flex justify-between px-4 py-4 text-lg font-bold">
            <span>Final Payable Amount</span>
            <span>{formatMoney(finalAmount)}</span>
          </div>
        </div>

        <div className="mt-12 flex justify-between text-sm">
          <p>Patient/Relative Signature</p>
          <p>Authorized Signature</p>
        </div>
      </div>
    </div>
  );
}

type BillTimelineEntry = {
  id: string;
  date: string;
  title: string;
  details?: string;
  amount: number;
  isDailyVisit?: boolean;
  itemType:
    | "room_charge"
    | "nursing_charge"
    | "rmo_charge"
    | "incentivise_charge"
    | "monitor_charge"
    | "visit"
    | "registration"
    | "package"
    | "discount"
    | "extra_charge"
    | "procedure"
    | "surgery"
    | "prosthesis"
    | "pharmacy"
    | "pathology"
    | "radiology";
};

function formatMoney(amount: number) {
  return `\u20B9${amount.toLocaleString()}`;
}

const BILL_ITEM_TYPE_ORDER: Record<BillTimelineEntry["itemType"], number> = {
  room_charge: 1,
  nursing_charge: 2,
  rmo_charge: 3,
  incentivise_charge: 4,
  monitor_charge: 5,
  visit: 6,
  registration: 7,
  package: 8,
  discount: 9,
  extra_charge: 10,
  procedure: 11,
  surgery: 12,
  prosthesis: 13,
  pharmacy: 14,
  pathology: 15,
  radiology: 16,
};

function sortBillEntriesBySequence(entries: BillTimelineEntry[]) {
  return [...entries].sort((left, right) => {
    const typeDiff = BILL_ITEM_TYPE_ORDER[left.itemType] - BILL_ITEM_TYPE_ORDER[right.itemType];
    if (typeDiff !== 0) return typeDiff;

    const timeDiff = new Date(left.date).getTime() - new Date(right.date).getTime();
    if (timeDiff !== 0) return timeDiff;

    return left.title.localeCompare(right.title);
  });
}

function sortBillEntriesWithinDate(entries: BillTimelineEntry[]) {
  return [...entries].sort((left, right) => {
    const typeDiff = BILL_ITEM_TYPE_ORDER[left.itemType] - BILL_ITEM_TYPE_ORDER[right.itemType];
    if (typeDiff !== 0) return typeDiff;

    const timeDiff = new Date(left.date).getTime() - new Date(right.date).getTime();
    if (timeDiff !== 0) return timeDiff;

    return left.title.localeCompare(right.title);
  });
}

function splitAmountAcrossDays(total: number, days: number) {
  if (days <= 0) return [];

  const roundedTotal = Math.round(total);
  const base = Math.floor(roundedTotal / days);
  let remainder = roundedTotal - base * days;

  return Array.from({ length: days }, () => {
    const value = base + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder -= 1;
    return value;
  });
}

function getStayDates(admissionDate: string, daysAdmitted: number) {
  const start = new Date(admissionDate);

  return Array.from({ length: Math.max(1, daysAdmitted) }, (_, index) => {
    const date = new Date(start);
    date.setHours(9, 0, 0, 0);
    date.setDate(date.getDate() + index);
    return date.toISOString();
  });
}

function buildBillTimelineEntries(
  patient: any,
  bill: any,
  roomTypes: any[] | undefined,
  doctors: any[] | undefined,
  medicines: any[] | undefined,
  assignedDoctors: any[] | undefined,
) {
  const entries: BillTimelineEntry[] = [];
  const roomTypeMap = new Map((roomTypes ?? []).map((room) => [room.id, room]));
  const doctorMap = new Map((doctors ?? []).map((doctor) => [doctor.id, doctor]));
  const medicineMap = new Map((medicines ?? []).map((medicine) => [medicine.id, medicine]));
  const stayDates = getStayDates(patient.admissionDate, bill.daysAdmitted ?? 1);
  const currentRoom = roomTypeMap.get(patient.roomTypeId);
  const assignedDoctorName = assignedDoctors?.[0]?.doctorName
    ? formatDoctorName(assignedDoctors[0].doctorName)
    : undefined;
  const visibleRoomChargesList = (bill.roomChargesList ?? []).filter((row: any) => row.notes !== EMPTY_ROOM_CONFIGURATION_MARKER);
  const hasExplicitRoomCharges = visibleRoomChargesList.length > 0 && (bill.roomSwitches?.length ?? 0) === 0;

  if ((bill.registrationCharge ?? patient.registrationCharge ?? 400) > 0) {
    entries.push({
      id: "registration-charge",
      date: patient.admissionDate,
      title: "Registration Charge",
      details: "Fixed patient registration charge",
      amount: bill.registrationCharge ?? patient.registrationCharge ?? 400,
      itemType: "registration",
    });
  }

  if ((bill.packageAmount ?? patient.packageAmount ?? 0) > 0) {
    entries.push({
      id: "package-amount",
      date: patient.admissionDate,
      title: "Package",
      details: "Package amount",
      amount: bill.packageAmount ?? patient.packageAmount ?? 0,
      itemType: "package",
    });
  }

  const addRoomChargeEntries = (row: any, details: string, idBase: string, visitDetails?: string) => {
    const rowEntries = [
      { key: "room", title: "Room Charge", amount: row.roomCharge ?? 0, itemType: "room_charge" as const, details },
      { key: "nursing", title: "Nursing Charge", amount: row.nursingCharge ?? 0, itemType: "nursing_charge" as const, details },
      { key: "rmo", title: "RMO Charge", amount: row.rmoCharge ?? 0, itemType: "rmo_charge" as const, details },
      { key: "incentivise", title: "Incentivise Charge", amount: row.incentiviseCharge ?? 0, itemType: "incentivise_charge" as const, details },
      { key: "monitor", title: "Monitor Charge", amount: row.monitorCharge ?? 0, itemType: "monitor_charge" as const, details },
      { key: "visit", title: "Doctor Visit", amount: row.visitCharge ?? 0, itemType: "visit" as const, details: visitDetails ?? details, isDailyVisit: true },
    ];

    for (const entry of rowEntries) {
      if (entry.amount > 0) {
        entries.push({
          id: `${idBase}-${entry.key}`,
          date: row.date,
          title: entry.title,
          details: entry.details,
          amount: entry.amount,
          isDailyVisit: entry.isDailyVisit,
          itemType: entry.itemType,
        });
      }
    }
  };

  if (hasExplicitRoomCharges) {
    for (const row of visibleRoomChargesList) {
      const room = roomTypeMap.get(row.roomTypeId) ?? currentRoom;
      const roomName = room ? room.name : "Room stay";
      const visitDetails = assignedDoctorName ? `${assignedDoctorName} | ${roomName}` : roomName;
      addRoomChargeEntries(row, roomName, `room-row-${row.id}`, visitDetails);
    }
  } else {
    const computedRoomRows = roomTypes?.length
      ? computeDailyRoomCharges(patient, bill.roomSwitches ?? [], roomTypes, bill.daysAdmitted ?? 1)
      : [];

    if (computedRoomRows.length > 0) {
      computedRoomRows.forEach((row: any, index: number) => {
        const roomName = row.roomTypeName || roomTypeMap.get(row.roomTypeId)?.name || currentRoom?.name || "Room stay";
        const visitDetails = assignedDoctorName ? `${assignedDoctorName} | ${roomName}` : roomName;
        addRoomChargeEntries(row, roomName, `computed-room-${index}`, visitDetails);
      });
    } else {
      const details = currentRoom ? currentRoom.name : "Auto-calculated stay charge";
      const visitDetails = assignedDoctorName ? `${assignedDoctorName} | ${details}` : details;
      const syntheticCharges = [
        { key: "room", title: "Room Charge", total: bill.roomCharge ?? 0, itemType: "room_charge" as const, details },
        { key: "nursing", title: "Nursing Charge", total: bill.roomNursingCharges ?? 0, itemType: "nursing_charge" as const, details },
        { key: "rmo", title: "RMO Charge", total: bill.rmoCharges ?? 0, itemType: "rmo_charge" as const, details },
        { key: "incentivise", title: "Incentivise Charge", total: bill.incentiviseCharges ?? 0, itemType: "incentivise_charge" as const, details },
        { key: "monitor", title: "Monitor Charge", total: bill.monitorCharges ?? 0, itemType: "monitor_charge" as const, details },
        { key: "visit", title: "Doctor Visit", total: bill.visitCharges ?? 0, itemType: "visit" as const, details: visitDetails, isDailyVisit: true },
      ];

      for (const charge of syntheticCharges) {
        const amounts = splitAmountAcrossDays(charge.total, stayDates.length);

        amounts.forEach((amount, index) => {
          if (amount > 0) {
            entries.push({
              id: `synthetic-${charge.key}-${index}`,
              date: stayDates[index],
              title: charge.title,
              details: charge.details,
              amount,
              isDailyVisit: charge.isDailyVisit,
              itemType: charge.itemType,
            });
          }
        });
      }
    }
  }

  for (const visit of bill.visits ?? []) {
    const doctor = doctorMap.get(visit.doctorId);
    entries.push({
      id: `visit-${visit.id}`,
      date: visit.date,
      title: "Doctor Visit",
      details: doctor ? formatDoctorName(doctor.name) : `Doctor #${visit.doctorId}`,
      amount: visit.charge ?? 0,
      itemType: "visit",
    });
  }

  for (const prescription of bill.prescriptions ?? []) {
    const medicine = medicineMap.get(prescription.medicineId);
    entries.push({
      id: `prescription-${prescription.id}`,
      date: prescription.date,
      title: "Pharmacy / Medicine",
      details: medicine
        ? `${medicine.name} x${prescription.quantity}`
        : `Medicine #${prescription.medicineId} x${prescription.quantity}`,
      amount: prescription.totalCost ?? 0,
      itemType: "pharmacy",
    });
  }

  for (const charge of bill.charges ?? []) {
    const chargeItemType: BillTimelineEntry["itemType"] =
      charge.type === "PROSTHESIS"
        ? "prosthesis"
        : charge.type === "PATHOLOGY"
          ? "pathology"
          : charge.type === "RADIOLOGY"
            ? "radiology"
            : "extra_charge";

    const chargeTitle =
      charge.type === "PROSTHESIS"
        ? "Prosthesis"
        : charge.type === "PATHOLOGY"
          ? "Pathology"
            : charge.type === "RADIOLOGY"
              ? "Radiology"
            : charge.type === "NURSING"
              ? "Extra Charge"
              : "Extra Charge";

    entries.push({
      id: `charge-${charge.id}`,
      date: charge.date,
      title: chargeTitle,
      details: charge.description?.trim() || chargeTitle,
      amount: charge.amount ?? 0,
      itemType: chargeItemType,
    });
  }

  for (const procedure of bill.procedures ?? []) {
    const doctor = procedure.doctorId ? doctorMap.get(procedure.doctorId) : undefined;
    entries.push({
      id: `procedure-${procedure.id}`,
      date: procedure.date,
      title: "Procedure",
      details: [procedure.name, procedure.description, doctor ? formatDoctorName(doctor.name) : undefined]
        .filter(Boolean)
        .join(" | "),
      amount: procedure.cost ?? 0,
      itemType: "procedure",
    });
  }

  for (const surgery of bill.surgeries ?? []) {
    const surgeryTotal =
      (surgery.surgeryCharge ?? 0) +
      (surgery.surgeonCharge ?? 0) +
      (surgery.assistantSurgeonCharge ?? 0) +
      (surgery.anaesthetistCharge ?? 0) +
      (surgery.otCharge ?? 0) +
      (surgery.otAssistantCharge ?? 0) +
      (surgery.armLaminarCharge ?? 0) +
      (surgery.airFlowSterilisationCharge ?? 0) +
      (surgery.gaksCharge ?? 0);

    const breakdown = [
      surgery.surgeryCharge ? `Features ${formatMoney(surgery.surgeryCharge)}` : null,
      surgery.surgeonCharge ? `Surgeon ${formatMoney(surgery.surgeonCharge)}` : null,
      surgery.assistantSurgeonCharge ? `Assistant ${formatMoney(surgery.assistantSurgeonCharge)}` : null,
      surgery.anaesthetistCharge ? `Anaesthetist ${formatMoney(surgery.anaesthetistCharge)}` : null,
      surgery.otCharge ? `OT ${formatMoney(surgery.otCharge)}` : null,
      surgery.otAssistantCharge ? `OT Assistant ${formatMoney(surgery.otAssistantCharge)}` : null,
      surgery.armLaminarCharge ? `Arm Laminar ${formatMoney(surgery.armLaminarCharge)}` : null,
      surgery.airFlowSterilisationCharge ? `Air Flow Sterilisation ${formatMoney(surgery.airFlowSterilisationCharge)}` : null,
      surgery.gaksCharge ? `GAKS ${formatMoney(surgery.gaksCharge)}` : null,
    ]
      .filter(Boolean)
      .join(" | ");

    entries.push({
      id: `surgery-${surgery.id}`,
      date: surgery.date,
      title: "Surgery",
      details: [surgery.surgeryName, breakdown].filter(Boolean).join(" | ") || "Surgery charges",
      amount: surgeryTotal,
      itemType: "surgery",
    });
  }

  if ((bill.discountAmount ?? patient.discountAmount ?? 0) > 0) {
    const discountType = bill.discountType ?? patient.discountType;
    entries.push({
      id: "discount",
      date: patient.expectedDischargeDate ?? patient.admissionDate,
      title: "Discount",
      details: discountType === "TRUST" ? "Trust discount" : "Self discount",
      amount: -(bill.discountAmount ?? patient.discountAmount ?? 0),
      itemType: "discount",
    });
  }

  return entries;
}

function ProgressiveBillTable({ entries }: { entries: BillTimelineEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No bill line items available yet.</p>;
  }

  const orderedEntries = sortBillEntriesBySequence(entries);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[150px]">Date</TableHead>
          <TableHead className="w-[220px]">Item</TableHead>
          <TableHead>Details</TableHead>
          <TableHead className="text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orderedEntries.map((entry) => (
          <TableRow key={entry.id}>
            <TableCell>{format(new Date(entry.date), "MMM dd, yyyy")}</TableCell>
            <TableCell className="font-medium">
              <span className="inline-flex items-center gap-2">
                <span>{entry.title}</span>
                {entry.isDailyVisit ? <UserCheck className="h-3.5 w-3.5 text-primary" /> : null}
              </span>
            </TableCell>
            <TableCell className="text-muted-foreground">{entry.details || "—"}</TableCell>
            <TableCell className="text-right font-medium">{formatMoney(entry.amount)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function DateWiseBillGroups({ entries }: { entries: BillTimelineEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No bill line items available yet.</p>;
  }

  const groupedEntries = entries.reduce<Array<{ dateKey: string; entries: BillTimelineEntry[] }>>((groups, entry) => {
    const dateKey = format(new Date(entry.date), "yyyy-MM-dd");
    const existingGroup = groups.find((group) => group.dateKey === dateKey);

    if (existingGroup) {
      existingGroup.entries.push(entry);
      return groups;
    }

    groups.push({ dateKey, entries: [entry] });
    return groups;
  }, []);

  return (
    <div className="space-y-6">
      {groupedEntries.map((group) => {
        const orderedEntries = sortBillEntriesWithinDate(group.entries);
        const dayTotal = orderedEntries.reduce((sum, entry) => sum + entry.amount, 0);

        return (
          <div key={group.dateKey} className="overflow-hidden rounded-2xl border border-border/50">
            <div className="flex items-center justify-between bg-secondary/30 px-5 py-4">
              <div>
                <h4 className="font-display text-lg font-semibold">
                  {format(new Date(group.entries[0].date), "MMM dd, yyyy")}
                </h4>
                <p className="text-xs text-muted-foreground">
                  {group.entries.length} item{group.entries.length !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Day Total</p>
                <p className="font-semibold text-primary">{formatMoney(dayTotal)}</p>
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[220px]">Item</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orderedEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">
                      <span className="inline-flex items-center gap-2">
                        <span>{entry.title}</span>
                        {entry.isDailyVisit ? <UserCheck className="h-3.5 w-3.5 text-primary" /> : null}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{entry.details || "—"}</TableCell>
                    <TableCell className="text-right font-medium">{formatMoney(entry.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        );
      })}
    </div>
  );
}

type SummarisedBillRow = {
  key: string;
  item: string;
  details: string;
  count: number;
  amount: number;
  itemType: BillTimelineEntry["itemType"];
};

function buildSummarisedBillRows(entries: BillTimelineEntry[]): SummarisedBillRow[] {
  const rowMap = new Map<string, SummarisedBillRow>();

  for (const entry of entries) {
    const details = entry.details || "-";
    const key = `${entry.itemType}::${entry.title}::${details}`;
    const existing = rowMap.get(key);

    if (existing) {
      existing.count += 1;
      existing.amount += entry.amount;
      continue;
    }

    rowMap.set(key, {
      key,
      item: entry.title,
      details,
      count: 1,
      amount: entry.amount,
      itemType: entry.itemType,
    });
  }

  return Array.from(rowMap.values()).sort((left, right) => {
    const typeDiff = BILL_ITEM_TYPE_ORDER[left.itemType] - BILL_ITEM_TYPE_ORDER[right.itemType];
    if (typeDiff !== 0) return typeDiff;
    const itemDiff = left.item.localeCompare(right.item);
    if (itemDiff !== 0) return itemDiff;
    return left.details.localeCompare(right.details);
  });
}

function SummarisedBillTable({ entries }: { entries: BillTimelineEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No bill line items available yet.</p>;
  }

  const rows = buildSummarisedBillRows(entries);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[220px]">Item</TableHead>
          <TableHead>Details</TableHead>
          <TableHead className="text-right">Number</TableHead>
          <TableHead className="text-right">Final Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.key}>
            <TableCell className="font-medium">{row.item}</TableCell>
            <TableCell className="text-muted-foreground">{row.details}</TableCell>
            <TableCell className="text-right">{row.count}</TableCell>
            <TableCell className="text-right font-semibold text-primary">{formatMoney(row.amount)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function BillView({
  patient,
  bill,
  mode,
  onModeChange,
  onPrint,
  printMode = false,
}: {
  patient: any,
  bill: any,
  mode: BillDisplayMode,
  onModeChange: (mode: BillDisplayMode) => void,
  onPrint?: () => void,
  printMode?: boolean
}) {
  const { data: doctors } = useDoctors();
  const { data: medicines } = useMedicines();
  const { data: roomTypes } = useRoomTypes();
  const { data: assignedDoctors } = useAssignedDoctors(patient.id);
  const entries = buildBillTimelineEntries(patient, bill, roomTypes, doctors, medicines, assignedDoctors);
  const advanceAmount = bill.advanceAmount ?? patient.advanceAmount ?? 0;
  const finalAmount = bill.finalAmount ?? ((bill.grandTotal ?? 0) - advanceAmount);
  const billModeTitle: Record<BillDisplayMode, string> = {
    summarised: "Summarised Bill",
    progressive: "Progressive Bill",
    "date-wise": "Date-wise Bill",
  };
  const billModeDescription: Record<BillDisplayMode, string> = {
    summarised: "Bill items grouped by item and details with count and final amount.",
    progressive: "Every bill item in one running list with its date.",
    "date-wise": "Each date followed by all billable activity recorded on that day.",
  };

  return (
    <Card className={`border-border/50 shadow-md ${printMode ? 'border-none shadow-none' : ''}`}>
      <CardHeader className={`text-center border-b ${printMode ? 'pb-3 mb-3' : 'pb-6 mb-4'}`}>
        <h2 className={`${printMode ? 'text-2xl' : 'text-3xl'} font-display font-bold text-primary`}>Criticare Hospital</h2>
        <p className="text-muted-foreground">Official IPD Final Bill</p>
      </CardHeader>
      <CardContent className={`${printMode ? 'space-y-4 p-4 pt-0' : 'space-y-8 p-8 pt-0'}`}>
        <div className={`grid grid-cols-2 ${printMode ? 'gap-3 border border-border p-3 text-xs' : 'gap-8 text-sm'}`}>
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

        {false && (
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
              {(bill.visitCharges ?? 0) > 0 && (
                <TableRow>
                  <TableCell>Doctor Visit Charges ({bill.daysAdmitted} day{bill.daysAdmitted !== 1 ? "s" : ""})</TableCell>
                  <TableCell className="text-right">₹{(bill.visitCharges ?? 0).toLocaleString()}</TableCell>
                </TableRow>
              )}
              {(bill.doctorCharges ?? 0) > 0 && (
                <TableRow>
                  <TableCell>Doctor Visit Fees ({bill.visits.length} recorded visit{bill.visits.length !== 1 ? "s" : ""})</TableCell>
                  <TableCell className="text-right">₹{bill.doctorCharges}</TableCell>
                </TableRow>
              )}
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
        )}

        <div className={`${printMode ? 'border border-border p-3' : 'border-t border-border/50 pt-6'}`}>
          <div className={`${printMode ? 'mb-3' : 'mb-5'} flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between`}>
            <div>
              <h3 className="font-display font-semibold text-lg">
                {billModeTitle[mode]}
              </h3>
              <p className="text-sm text-muted-foreground">
                {billModeDescription[mode]}
              </p>
            </div>

            {!printMode && (
              <div className="flex flex-col gap-2 sm:items-end">
                <Tabs value={mode} onValueChange={(value) => onModeChange(value as BillDisplayMode)}>
                  <TabsList className="grid w-full grid-cols-3 sm:w-[480px]">
                    <TabsTrigger value="summarised">Summarised Bill</TabsTrigger>
                    <TabsTrigger value="progressive">Progressive Bill</TabsTrigger>
                    <TabsTrigger value="date-wise">Date-wise Bill</TabsTrigger>
                  </TabsList>
                </Tabs>
                <Button type="button" variant="outline" size="sm" className="gap-2" onClick={onPrint}>
                  <Printer className="h-4 w-4" />
                  Print {billModeTitle[mode]}
                </Button>
              </div>
            )}
          </div>

          {mode === "summarised" ? (
            <SummarisedBillTable entries={entries} />
          ) : mode === "progressive" ? (
            <ProgressiveBillTable entries={entries} />
          ) : (
            <DateWiseBillGroups entries={entries} />
          )}

          <div className={`${printMode ? 'mt-3 border border-border bg-secondary/20 px-3 py-2' : 'mt-6 rounded-2xl border border-border/60 bg-secondary/20 px-5 py-4'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Grand Total</p>
                <p className="text-sm text-muted-foreground">
                  {bill.daysAdmitted} day{bill.daysAdmitted !== 1 ? "s" : ""} admitted
                </p>
              </div>
              <p className="text-2xl font-bold text-primary">{formatMoney(bill.grandTotal)}</p>
            </div>
            <div className="mt-4 space-y-2 border-t border-border/60 pt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Advance Paid</span>
                <span className="font-semibold text-emerald-700">-{formatMoney(advanceAmount)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-display font-semibold text-primary">Final Payable</span>
                <span className="text-2xl font-bold text-primary">{formatMoney(finalAmount)}</span>
              </div>
            </div>
          </div>
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




