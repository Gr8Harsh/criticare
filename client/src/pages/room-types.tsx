import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const roomTypeSchema = z.object({
  dailyCharge: z.coerce.number().min(0),
});

export default function RoomTypesPage() {
  const { data: user } = useAuth();
  const { data: roomTypes, isLoading } = useQuery<any[]>({ queryKey: [api.roomTypes.list.path] });
  const [editingId, setEditingId] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updateMutation = useMutation({
    mutationFn: async ({ id, dailyCharge }: { id: number, dailyCharge: number }) => {
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
    }
  });

  const form = useForm({
    resolver: zodResolver(roomTypeSchema),
    defaultValues: { dailyCharge: 0 }
  });

  if (user?.role !== 'ADMIN') return <div className="p-8 text-center text-destructive font-bold">Unauthorized Access</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight">Room Configuration</h1>
        <p className="text-muted-foreground">Adjust daily charges for different room types.</p>
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
                  <TableHead className="text-right">Current Daily Charge</TableHead>
                  <TableHead className="w-[150px] text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roomTypes?.map((rt) => (
                  <TableRow key={rt.id}>
                    <TableCell className="font-bold">{rt.name}</TableCell>
                    <TableCell className="text-right font-medium">
                      {editingId === rt.id ? (
                        <Form {...form}>
                          <form id={`edit-form-${rt.id}`} onSubmit={form.handleSubmit((d) => updateMutation.mutate({ id: rt.id, dailyCharge: d.dailyCharge }))}>
                            <FormField control={form.control} name="dailyCharge" render={({ field }) => (
                              <Input type="number" className="w-24 ml-auto text-right h-8" {...field} />
                            )} />
                          </form>
                        </Form>
                      ) : (
                        `$${rt.dailyCharge.toLocaleString()}`
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {editingId === rt.id ? (
                        <div className="flex justify-end gap-2">
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600" form={`edit-form-${rt.id}`} type="submit">
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setEditingId(null)}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="ghost" className="hover-elevate h-8 gap-2" onClick={() => {
                          setEditingId(rt.id);
                          form.reset({ dailyCharge: rt.dailyCharge });
                        }}>
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
