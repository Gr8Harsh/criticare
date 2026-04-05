import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Loader2, Edit2, Stethoscope, HeartPulse, Info, UserCheck, BedDouble, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { api } from "@shared/routes";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";

const roomChargesSchema = z.object({
  dailyCharge: z.coerce.number().min(0, "Must be 0 or more"),
  nursingCharge: z.coerce.number().min(0, "Must be 0 or more"),
  rmoCharge: z.coerce.number().min(0, "Must be 0 or more"),
  visitCharge: z.coerce.number().min(0, "Must be 0 or more"),
});

const addRoomSchema = z.object({
  name: z.string().min(1, "Room type name is required"),
  dailyCharge: z.coerce.number().min(0, "Must be 0 or more"),
  nursingCharge: z.coerce.number().min(0, "Must be 0 or more").default(0),
  rmoCharge: z.coerce.number().min(0, "Must be 0 or more").default(0),
  visitCharge: z.coerce.number().min(0, "Must be 0 or more").default(0),
});

const RATE_FIELDS = [
  { name: "dailyCharge" as const, label: "Bed Charge", icon: BedDouble, desc: "Base room or bed charge per day" },
  { name: "nursingCharge" as const, label: "Nursing Charge", icon: Stethoscope, desc: "Charged per day for nursing care" },
  { name: "rmoCharge" as const, label: "RMO Charge", icon: HeartPulse, desc: "Charged per day for RMO services" },
  { name: "visitCharge" as const, label: "Visit Charge", icon: UserCheck, desc: "Charged per day for doctor visit" },
] as const;

export default function ChargeRatesPage() {
  const { data: user } = useAuth();
  const { data: roomTypes, isLoading } = useQuery<any[]>({ queryKey: [api.roomTypes.list.path] });
  const [editingRoom, setEditingRoom] = useState<any | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updateMutation = useMutation({
    mutationFn: async ({ id, dailyCharge, nursingCharge, rmoCharge, visitCharge }: { id: number; dailyCharge: number; nursingCharge: number; rmoCharge: number; visitCharge: number }) => {
      const res = await fetch(`/api/admin/room-types/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dailyCharge, nursingCharge, rmoCharge, visitCharge }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update room charges");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.roomTypes.list.path] });
      toast({ title: "Saved", description: "Room charges updated successfully." });
      setEditingRoom(null);
    },
    onError: () => toast({ title: "Error", description: "Failed to save room charges.", variant: "destructive" }),
  });

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof addRoomSchema>) => apiRequest("POST", api.roomTypes.create.path, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.roomTypes.list.path] });
      toast({ title: "Saved", description: "Room type added successfully." });
      setAddOpen(false);
      addForm.reset({ name: "", dailyCharge: 0, nursingCharge: 0, rmoCharge: 0, visitCharge: 0 });
    },
    onError: () => toast({ title: "Error", description: "Failed to add room type.", variant: "destructive" }),
  });

  const form = useForm({
    resolver: zodResolver(roomChargesSchema),
    defaultValues: { dailyCharge: 0, nursingCharge: 0, rmoCharge: 0, visitCharge: 0 },
  });

  const addForm = useForm({
    resolver: zodResolver(addRoomSchema),
    defaultValues: { name: "", dailyCharge: 0, nursingCharge: 0, rmoCharge: 0, visitCharge: 0 },
  });

  const openEdit = (rt: any) => {
    setEditingRoom(rt);
    form.reset({
      dailyCharge: rt.dailyCharge ?? 0,
      nursingCharge: rt.nursingCharge ?? 0,
      rmoCharge: rt.rmoCharge ?? 0,
      visitCharge: rt.visitCharge ?? 0,
    });
  };

  const isAdmin = user?.role === "ADMIN";
  const isManager = user?.role === "MANAGER" || isAdmin;
  if (!isManager) return <div className="p-8 text-center text-destructive font-bold">Unauthorized Access</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Room Charges</h1>
          <p className="text-muted-foreground">Configure bed, nursing, RMO, and visit charges per room type.</p>
        </div>
        {isAdmin && (
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" /> Add Room Type
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Room Type</DialogTitle></DialogHeader>
              <Form {...addForm}>
                <form onSubmit={addForm.handleSubmit((values) => createMutation.mutate(values))} className="space-y-4 pt-2">
                  <FormField control={addForm.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Room Type Name</FormLabel>
                      <FormControl><Input placeholder="e.g. ICU, Private Suite" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  {RATE_FIELDS.map(({ name, label }) => (
                    <FormField key={name} control={addForm.control} name={name} render={({ field }) => (
                      <FormItem>
                        <FormLabel>{label} (₹/day)</FormLabel>
                        <FormControl><Input type="number" min={0} placeholder="0" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  ))}
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={createMutation.isPending}>
                      {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                      Add Room Type
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card className="border-border/50 bg-primary/5 shadow-none">
        <CardContent className="flex items-start gap-3 p-4">
          <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground">
            These charges are <span className="text-foreground font-medium">automatically calculated</span> based on the patient&apos;s room and added to the final bill per day of stay.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {RATE_FIELDS.map(({ name, label, icon: Icon, desc }) => (
          <Card key={name} className="border-border/50 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                {label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/50 shadow-md">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : (
            <Table>
              <TableHeader className="bg-secondary/40">
                <TableRow>
                  <TableHead>Room Type</TableHead>
                  <TableHead className="text-right">Bed (₹/day)</TableHead>
                  <TableHead className="text-right">Nursing (₹/day)</TableHead>
                  <TableHead className="text-right">RMO (₹/day)</TableHead>
                  <TableHead className="text-right">Visit (₹/day)</TableHead>
                  <TableHead className="text-right">Total (₹/day)</TableHead>
                  {isAdmin && <TableHead className="w-[100px] text-right">Action</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {roomTypes?.map((rt) => {
                  const total = (rt.dailyCharge ?? 0) + (rt.nursingCharge ?? 0) + (rt.rmoCharge ?? 0) + (rt.visitCharge ?? 0);
                  return (
                    <TableRow key={rt.id} data-testid={`row-charge-rate-${rt.id}`}>
                      <TableCell className="font-bold">{rt.name}</TableCell>
                      <TableCell className="text-right font-medium">₹{(rt.dailyCharge ?? 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        {(rt.nursingCharge ?? 0) > 0 ? <span className="font-medium">₹{rt.nursingCharge.toLocaleString()}</span> : <Badge variant="outline" className="text-xs font-normal text-muted-foreground">Not set</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        {(rt.rmoCharge ?? 0) > 0 ? <span className="font-medium">₹{rt.rmoCharge.toLocaleString()}</span> : <Badge variant="outline" className="text-xs font-normal text-muted-foreground">Not set</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        {(rt.visitCharge ?? 0) > 0 ? <span className="font-medium">₹{rt.visitCharge.toLocaleString()}</span> : <Badge variant="outline" className="text-xs font-normal text-muted-foreground">Not set</Badge>}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-primary">₹{total.toLocaleString()}</TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <Button size="sm" variant="ghost" className="hover-elevate h-8 gap-2" onClick={() => openEdit(rt)}>
                            <Edit2 className="w-3.5 h-3.5" /> Edit
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editingRoom} onOpenChange={(v) => { if (!v) setEditingRoom(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Room Charges - {editingRoom?.name}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((values) => updateMutation.mutate({ id: editingRoom.id, ...values }))} className="space-y-4 pt-1">
              {RATE_FIELDS.map(({ name, label, icon: Icon }) => (
                <FormField key={name} control={form.control} name={name} render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-muted-foreground" /> {label} (₹/day)
                    </FormLabel>
                    <FormControl>
                      <Input type="number" min={0} placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              ))}
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setEditingRoom(null)}>Cancel</Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Save Charges
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
