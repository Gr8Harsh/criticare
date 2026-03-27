import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Plus, Edit2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { api } from "@shared/routes";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";

const editSchema = z.object({
  dailyCharge: z.coerce.number().min(0, "Must be 0 or more"),
});

const addSchema = z.object({
  name: z.string().min(1, "Room type name is required"),
  dailyCharge: z.coerce.number().min(0),
});

export default function RoomTypesPage() {
  const { data: user } = useAuth();
  const { data: roomTypes, isLoading } = useQuery<any[]>({ queryKey: [api.roomTypes.list.path] });
  const [editingRoom, setEditingRoom] = useState<any | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updateMutation = useMutation({
    mutationFn: async ({ id, dailyCharge }: { id: number; dailyCharge: number }) => {
      const res = await fetch(`/api/admin/room-types/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dailyCharge }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update room");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.roomTypes.list.path] });
      toast({ title: "Success", description: "Room charge updated." });
      setEditingRoom(null);
    },
    onError: () => toast({ title: "Error", description: "Failed to update room.", variant: "destructive" }),
  });

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof addSchema>) => {
      return apiRequest("POST", api.roomTypes.create.path, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.roomTypes.list.path] });
      toast({ title: "Success", description: "Room type added." });
      setAddOpen(false);
      addForm.reset();
    },
    onError: () => toast({ title: "Error", description: "Failed to add room type.", variant: "destructive" }),
  });

  const editForm = useForm({
    resolver: zodResolver(editSchema),
    defaultValues: { dailyCharge: 0 },
  });

  const addForm = useForm({
    resolver: zodResolver(addSchema),
    defaultValues: { name: "", dailyCharge: 0 },
  });

  const openEdit = (rt: any) => {
    setEditingRoom(rt);
    editForm.reset({ dailyCharge: rt.dailyCharge });
  };

  if (user?.role !== "ADMIN") return <div className="p-8 text-center text-destructive font-bold">Unauthorized Access</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Room Configuration</h1>
          <p className="text-muted-foreground">Manage room types and their base daily room charges.</p>
        </div>

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-room-type" className="gap-2">
              <Plus className="w-4 h-4" /> Add Room Type
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add New Room Type</DialogTitle></DialogHeader>
            <Form {...addForm}>
              <form onSubmit={addForm.handleSubmit((d) => createMutation.mutate(d))} className="space-y-4 pt-2">
                <FormField control={addForm.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Room Type Name</FormLabel>
                    <FormControl><Input data-testid="input-room-type-name" placeholder="e.g. ICU, Private Suite" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={addForm.control} name="dailyCharge" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Room Charge (₹/day)</FormLabel>
                    <FormControl><Input data-testid="input-add-dailyCharge" type="number" min={0} placeholder="0" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <p className="text-xs text-muted-foreground">Bed, Nursing, and RMO charges can be configured separately under <strong>Charge Rates</strong>.</p>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
                  <Button data-testid="button-submit-room-type" type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Add Room Type
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingRoom} onOpenChange={(v) => { if (!v) setEditingRoom(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Room Charge — {editingRoom?.name}</DialogTitle></DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit((d) => updateMutation.mutate({ id: editingRoom.id, ...d }))} className="space-y-4 pt-2">
              <FormField control={editForm.control} name="dailyCharge" render={({ field }) => (
                <FormItem>
                  <FormLabel>Room Charge (₹/day)</FormLabel>
                  <FormControl><Input data-testid="input-edit-dailyCharge" type="number" min={0} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <p className="text-xs text-muted-foreground">To configure Bed, Nursing, and RMO charges, go to <strong>Charge Rates</strong> in the menu.</p>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setEditingRoom(null)}>Cancel</Button>
                <Button type="submit" disabled={updateMutation.isPending} data-testid="button-save-room-charges">
                  {updateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Save Changes
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Card className="border-border/50 shadow-md">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : (
            <Table>
              <TableHeader className="bg-secondary/40">
                <TableRow>
                  <TableHead>Room Type</TableHead>
                  <TableHead className="text-right">Room Charge (₹/day)</TableHead>
                  <TableHead className="w-[100px] text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roomTypes?.map((rt) => (
                  <TableRow key={rt.id} data-testid={`row-room-type-${rt.id}`}>
                    <TableCell className="font-bold">{rt.name}</TableCell>
                    <TableCell className="text-right font-semibold text-primary">₹{(rt.dailyCharge ?? 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        data-testid={`button-edit-room-type-${rt.id}`}
                        size="sm" variant="ghost"
                        className="hover-elevate h-8 gap-2"
                        onClick={() => openEdit(rt)}
                      >
                        <Edit2 className="w-3.5 h-3.5" /> Edit
                      </Button>
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
