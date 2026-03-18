import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Plus, Edit2, Check, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { api } from "@shared/routes";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";

const editSchema = z.object({
  dailyCharge: z.coerce.number().min(0),
});

const addSchema = z.object({
  name: z.string().min(1, "Room type name is required"),
  dailyCharge: z.coerce.number().min(0, "Daily charge must be 0 or more"),
});

export default function RoomTypesPage() {
  const { data: user } = useAuth();
  const { data: roomTypes, isLoading } = useQuery<any[]>({ queryKey: [api.roomTypes.list.path] });
  const [editingId, setEditingId] = useState<number | null>(null);
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
      if (!res.ok) throw new Error("Failed to update room charge");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.roomTypes.list.path] });
      toast({ title: "Success", description: "Room charge updated." });
      setEditingId(null);
    },
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
    onError: () => {
      toast({ title: "Error", description: "Failed to add room type.", variant: "destructive" });
    },
  });

  const editForm = useForm({
    resolver: zodResolver(editSchema),
    defaultValues: { dailyCharge: 0 },
  });

  const addForm = useForm({
    resolver: zodResolver(addSchema),
    defaultValues: { name: "", dailyCharge: 0 },
  });

  if (user?.role !== "ADMIN") return <div className="p-8 text-center text-destructive font-bold">Unauthorized Access</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Room Configuration</h1>
          <p className="text-muted-foreground">Manage room types and adjust their daily charges.</p>
        </div>

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-room-type" className="gap-2">
              <Plus className="w-4 h-4" /> Add Room Type
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Room Type</DialogTitle>
            </DialogHeader>
            <Form {...addForm}>
              <form
                onSubmit={addForm.handleSubmit((d) => createMutation.mutate(d))}
                className="space-y-4 pt-2"
              >
                <FormField
                  control={addForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Room Type Name</FormLabel>
                      <FormControl>
                        <Input data-testid="input-room-type-name" placeholder="e.g. ICU, Private Suite" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="dailyCharge"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Daily Charge (₹)</FormLabel>
                      <FormControl>
                        <Input data-testid="input-room-daily-charge" type="number" min={0} placeholder="e.g. 5000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                    Cancel
                  </Button>
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

      <Card className="border-border/50 shadow-md">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-secondary/40">
                <TableRow>
                  <TableHead>Room Type</TableHead>
                  <TableHead className="text-right">Current Daily Charge</TableHead>
                  <TableHead className="w-[150px] text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roomTypes?.map((rt) => (
                  <TableRow key={rt.id} data-testid={`row-room-type-${rt.id}`}>
                    <TableCell className="font-bold">{rt.name}</TableCell>
                    <TableCell className="text-right font-medium">
                      {editingId === rt.id ? (
                        <Form {...editForm}>
                          <form
                            id={`edit-form-${rt.id}`}
                            onSubmit={editForm.handleSubmit((d) =>
                              updateMutation.mutate({ id: rt.id, dailyCharge: d.dailyCharge })
                            )}
                          >
                            <FormField
                              control={editForm.control}
                              name="dailyCharge"
                              render={({ field }) => (
                                <Input
                                  data-testid={`input-edit-charge-${rt.id}`}
                                  type="number"
                                  className="w-24 ml-auto text-right h-8"
                                  {...field}
                                />
                              )}
                            />
                          </form>
                        </Form>
                      ) : (
                        `₹${rt.dailyCharge.toLocaleString()}`
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {editingId === rt.id ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            data-testid={`button-save-charge-${rt.id}`}
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-emerald-600"
                            form={`edit-form-${rt.id}`}
                            type="submit"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            data-testid={`button-cancel-edit-${rt.id}`}
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive"
                            onClick={() => setEditingId(null)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          data-testid={`button-edit-room-type-${rt.id}`}
                          size="sm"
                          variant="ghost"
                          className="hover-elevate h-8 gap-2"
                          onClick={() => {
                            setEditingId(rt.id);
                            editForm.reset({ dailyCharge: rt.dailyCharge });
                          }}
                        >
                          <Edit2 className="w-3.5 h-3.5" /> Edit
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
    </div>
  );
}
