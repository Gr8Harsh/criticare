import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Loader2, Edit2, Stethoscope, HeartPulse, Info, UserCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { api } from "@shared/routes";
import { useAuth } from "@/hooks/use-auth";

const rateSchema = z.object({
  nursingCharge: z.coerce.number().min(0, "Must be 0 or more"),
  rmoCharge: z.coerce.number().min(0, "Must be 0 or more"),
  visitCharge: z.coerce.number().min(0, "Must be 0 or more"),
});

const RATE_FIELDS = [
  { name: "nursingCharge" as const, label: "Nursing Charge", icon: Stethoscope, desc: "Charged per day for nursing care" },
  { name: "rmoCharge" as const, label: "RMO Charge", icon: HeartPulse, desc: "Charged per day for RMO services" },
  { name: "visitCharge" as const, label: "Visit Charge", icon: UserCheck, desc: "Charged per day for doctor visit" },
];

export default function ChargeRatesPage() {
  const { data: user } = useAuth();
  const { data: roomTypes, isLoading } = useQuery<any[]>({ queryKey: [api.roomTypes.list.path] });
  const [editingRoom, setEditingRoom] = useState<any | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updateMutation = useMutation({
    mutationFn: async ({ id, nursingCharge, rmoCharge, visitCharge }: { id: number; nursingCharge: number; rmoCharge: number; visitCharge: number }) => {
      const res = await fetch(`/api/admin/room-types/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nursingCharge, rmoCharge, visitCharge }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update charge rates");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.roomTypes.list.path] });
      toast({ title: "Saved", description: "Charge rates updated successfully." });
      setEditingRoom(null);
    },
    onError: () => toast({ title: "Error", description: "Failed to save charge rates.", variant: "destructive" }),
  });

  const form = useForm({
    resolver: zodResolver(rateSchema),
    defaultValues: { nursingCharge: 0, rmoCharge: 0, visitCharge: 0 },
  });

  const openEdit = (rt: any) => {
    setEditingRoom(rt);
    form.reset({
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
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight">Charge Rates</h1>
        <p className="text-muted-foreground">Configure daily Bed, Nursing, RMO, and Visit charges per room type. These are automatically added to the patient's bill based on their current room.</p>
      </div>

      <Card className="border-border/50 bg-primary/5 shadow-none">
        <CardContent className="flex items-start gap-3 p-4">
          <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground">
            These charges are <span className="text-foreground font-medium">automatically calculated</span> based on the room the patient is currently admitted to, and are shown as separate line items in the final bill. They are applied per calendar day of stay.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-4 gap-4">
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
                  <TableHead className="text-right">Room Rate (₹/day)</TableHead>
                  <TableHead className="text-right">Nursing (₹/day)</TableHead>
                  <TableHead className="text-right">RMO (₹/day)</TableHead>
                  <TableHead className="text-right">Visit (₹/day)</TableHead>
                  <TableHead className="text-right">Total Extra/day</TableHead>
                  {isAdmin && <TableHead className="w-[100px] text-right">Action</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {roomTypes?.map((rt) => {
                  const extra = (rt.nursingCharge ?? 0) + (rt.rmoCharge ?? 0) + (rt.visitCharge ?? 0);
                  return (
                    <TableRow key={rt.id} data-testid={`row-charge-rate-${rt.id}`}>
                      <TableCell className="font-bold">{rt.name}</TableCell>
                      <TableCell className="text-right text-muted-foreground">₹{(rt.dailyCharge ?? 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        {(rt.nursingCharge ?? 0) > 0
                          ? <span className="font-medium">₹{rt.nursingCharge.toLocaleString()}</span>
                          : <Badge variant="outline" className="text-xs font-normal text-muted-foreground">Not set</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        {(rt.rmoCharge ?? 0) > 0
                          ? <span className="font-medium">₹{rt.rmoCharge.toLocaleString()}</span>
                          : <Badge variant="outline" className="text-xs font-normal text-muted-foreground">Not set</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        {(rt.visitCharge ?? 0) > 0
                          ? <span className="font-medium">₹{rt.visitCharge.toLocaleString()}</span>
                          : <Badge variant="outline" className="text-xs font-normal text-muted-foreground">Not set</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        {extra > 0
                          ? <span className="font-semibold text-primary">₹{extra.toLocaleString()}</span>
                          : <span className="text-muted-foreground text-sm">—</span>}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <Button
                            data-testid={`button-edit-charge-rate-${rt.id}`}
                            size="sm" variant="ghost"
                            className="hover-elevate h-8 gap-2"
                            onClick={() => openEdit(rt)}
                          >
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
            <DialogTitle>Edit Charge Rates — {editingRoom?.name}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-2">Room rate: ₹{(editingRoom?.dailyCharge ?? 0).toLocaleString()}/day (not editable here)</p>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((d) => updateMutation.mutate({ id: editingRoom.id, ...d }))} className="space-y-4 pt-1">
              {RATE_FIELDS.map(({ name, label, icon: Icon }) => (
                <FormField key={name} control={form.control} name={name} render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-muted-foreground" /> {label} (₹/day)
                    </FormLabel>
                    <FormControl>
                      <Input data-testid={`input-edit-${name}`} type="number" min={0} placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              ))}
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setEditingRoom(null)}>Cancel</Button>
                <Button type="submit" disabled={updateMutation.isPending} data-testid="button-save-charge-rates">
                  {updateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Save Rates
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
