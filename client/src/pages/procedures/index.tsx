import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Plus, Search, Pencil, Trash2, Stethoscope } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Textarea } from "@/components/ui/textarea";

const procedureCatalogSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  cost: z.coerce.number().min(0, "Cost must be 0 or more"),
});

type ProcedureCatalogForm = z.infer<typeof procedureCatalogSchema>;

function ProcedureAddEditDialog({ item, onClose }: { item?: any; onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEdit = !!item;

  const form = useForm<ProcedureCatalogForm>({
    resolver: zodResolver(procedureCatalogSchema),
    defaultValues: { name: item?.name ?? "", description: item?.description ?? "", cost: item?.cost ?? 0 },
  });

  const mutation = useMutation({
    mutationFn: async (data: ProcedureCatalogForm) => {
      const url = isEdit ? `/api/procedure-catalog/${item.id}` : "/api/procedure-catalog";
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/procedure-catalog"] });
      toast({ title: "Success", description: isEdit ? "Procedure updated." : "Procedure added." });
      onClose();
    },
    onError: () => toast({ title: "Error", description: "Failed to save.", variant: "destructive" }),
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-4 pt-2">
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem>
            <FormLabel>Procedure Name</FormLabel>
            <FormControl><Input data-testid="input-proc-name" placeholder="e.g. Appendectomy, CT Scan" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="description" render={({ field }) => (
          <FormItem>
            <FormLabel>Description (optional)</FormLabel>
            <FormControl><Textarea data-testid="input-proc-description" placeholder="Brief description..." rows={2} {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="cost" render={({ field }) => (
          <FormItem>
            <FormLabel>Cost (₹)</FormLabel>
            <FormControl><Input type="number" min="0" data-testid="input-proc-cost" placeholder="0" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <div className="flex gap-2 pt-1">
          <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90" disabled={mutation.isPending} data-testid="button-save-catalog">
            {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEdit ? "Update" : "Add Procedure"}
          </Button>
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Form>
  );
}

function ProcedureCatalogTab({ canManage }: { canManage: boolean }) {
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: catalog, isLoading } = useQuery<any[]>({ queryKey: ["/api/procedure-catalog"] });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/procedure-catalog/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/procedure-catalog"] });
      toast({ title: "Deleted", description: "Procedure removed from catalog." });
    },
    onError: () => toast({ title: "Error", description: "Failed to delete.", variant: "destructive" }),
  });

  const filtered = catalog?.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.description ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Card className="border-border/50 shadow-md">
      <CardHeader className="py-4 border-b bg-secondary/20 flex flex-row items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search procedures..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-background border-border/60" data-testid="input-search-catalog" />
        </div>
        {canManage && (
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="hover-elevate shadow-lg shrink-0" data-testid="button-add-catalog">
                <Plus className="w-5 h-5 mr-2" /> Add Procedure
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[440px]">
              <DialogHeader><DialogTitle className="font-display">Add Procedure to Catalog</DialogTitle></DialogHeader>
              <ProcedureAddEditDialog onClose={() => setAddOpen(false)} />
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>
        ) : filtered?.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Stethoscope className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No procedures in the catalog yet.</p>
            {canManage && <p className="text-sm mt-1">Click "Add Procedure" to get started.</p>}
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-secondary/40">
              <TableRow>
                <TableHead>Procedure Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                {canManage && <TableHead className="w-[100px]"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered?.map((item) => (
                <TableRow key={item.id} data-testid={`row-catalog-${item.id}`}>
                  <TableCell className="font-semibold">{item.name}</TableCell>
                  <TableCell className="text-muted-foreground">{item.description || "—"}</TableCell>
                  <TableCell className="text-right font-medium">₹{item.cost.toLocaleString()}</TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Dialog open={editItem?.id === item.id} onOpenChange={(open) => !open && setEditItem(null)}>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => setEditItem(item)} className="hover:bg-primary/10 hover:text-primary" data-testid={`button-edit-catalog-${item.id}`}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[440px]">
                            <DialogHeader><DialogTitle className="font-display">Edit Procedure</DialogTitle></DialogHeader>
                            {editItem?.id === item.id && <ProcedureAddEditDialog item={editItem} onClose={() => setEditItem(null)} />}
                          </DialogContent>
                        </Dialog>
                        <Button variant="ghost" size="icon" onClick={() => { if (confirm(`Remove "${item.name}" from the catalog?`)) deleteMutation.mutate(item.id); }} className="hover:bg-destructive/10 hover:text-destructive" data-testid={`button-delete-catalog-${item.id}`}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export default function ProceduresPage() {
  const { data: currentUser } = useAuth();
  const canManage = currentUser?.role === "ADMIN" || currentUser?.role === "MANAGER";

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight">Procedures</h1>
        <p className="text-muted-foreground">Manage the procedure catalog used across patient records.</p>
      </div>
      <ProcedureCatalogTab canManage={canManage} />
    </div>
  );
}
