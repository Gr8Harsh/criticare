import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Plus, Search, Pencil, Trash2, Scissors } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const surgeryNameSchema = z.object({
  name: z.string().min(1, "Surgery name is required"),
});

const surgeryCatalogSchema = z.object({
  name: z.string().min(1, "Name is required"),
  cost: z.coerce.number().min(0, "Cost must be 0 or more"),
});

type SurgeryNameForm = z.infer<typeof surgeryNameSchema>;
type SurgeryCatalogForm = z.infer<typeof surgeryCatalogSchema>;

function SurgeryNameDialog({ item, onClose }: { item?: any; onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEdit = !!item;

  const form = useForm<SurgeryNameForm>({
    resolver: zodResolver(surgeryNameSchema),
    defaultValues: { name: item?.name ?? "" },
  });

  const mutation = useMutation({
    mutationFn: async (data: SurgeryNameForm) => {
      const url = isEdit ? `/api/surgery-names/${item.id}` : "/api/surgery-names";
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
      queryClient.invalidateQueries({ queryKey: ["/api/surgery-names"] });
      toast({ title: isEdit ? "Surgery name updated" : "Surgery name added" });
      onClose();
    },
    onError: () => toast({ title: "Error", description: "Failed to save.", variant: "destructive" }),
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-4 pt-2">
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem>
            <FormLabel>Surgery Name</FormLabel>
            <FormControl><Input placeholder="e.g. Appendectomy, Hernia Repair, CABG" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <div className="flex gap-2 pt-1">
          <Button type="submit" className="flex-1" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? "Update" : "Add Surgery Name"}
          </Button>
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Form>
  );
}

function SurgeryCatalogDialog({ item, onClose }: { item?: any; onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEdit = !!item;

  const form = useForm<SurgeryCatalogForm>({
    resolver: zodResolver(surgeryCatalogSchema),
    defaultValues: { name: item?.name ?? "", cost: item?.cost ?? 0 },
  });

  const mutation = useMutation({
    mutationFn: async (data: SurgeryCatalogForm) => {
      const url = isEdit ? `/api/surgery-catalog/${item.id}` : "/api/surgery-catalog";
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, category: "SURGERY" }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/surgery-catalog"] });
      toast({ title: isEdit ? "Catalog entry updated" : "Catalog entry added" });
      onClose();
    },
    onError: () => toast({ title: "Error", description: "Failed to save.", variant: "destructive" }),
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-4 pt-2">
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem>
            <FormLabel>Feature Name</FormLabel>
            <FormControl><Input placeholder="e.g. Laminar Airflow, C-Arm Charge, CABG Package" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="cost" render={({ field }) => (
          <FormItem>
            <FormLabel>Charge (₹)</FormLabel>
            <FormControl><Input type="number" min="0" placeholder="0" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <div className="flex gap-2 pt-1">
          <Button type="submit" className="flex-1" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? "Update" : "Add Entry"}
          </Button>
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Form>
  );
}

function SurgeryNamesTab({ isAdmin }: { isAdmin: boolean }) {
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: surgeryNamesList, isLoading } = useQuery<any[]>({ queryKey: ["/api/surgery-names"] });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/surgery-names/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/surgery-names"] });
      toast({ title: "Deleted", description: "Surgery name removed." });
    },
    onError: () => toast({ title: "Error", description: "Failed to delete.", variant: "destructive" }),
  });

  const filtered = surgeryNamesList?.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Card className="border-border/50 shadow-md">
      <CardHeader className="py-4 border-b bg-secondary/20 flex flex-row items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search surgery names..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-background border-border/60" />
        </div>
        {isAdmin && (
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Add Surgery Name</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[420px]">
              <DialogHeader><DialogTitle className="font-display">Add Surgery Name</DialogTitle></DialogHeader>
              <SurgeryNameDialog onClose={() => setAddOpen(false)} />
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : filtered && filtered.length > 0 ? (
          <Table>
            <TableHeader className="bg-secondary/40">
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Surgery Name</TableHead>
                {isAdmin && <TableHead className="w-[120px]"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item, index) => (
                <TableRow key={item.id}>
                  <TableCell className="w-12 text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  {isAdmin && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Dialog open={editItem?.id === item.id} onOpenChange={(open) => !open && setEditItem(null)}>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => setEditItem(item)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[420px]">
                            <DialogHeader><DialogTitle className="font-display">Edit Surgery Name</DialogTitle></DialogHeader>
                            {editItem?.id === item.id && <SurgeryNameDialog item={editItem} onClose={() => setEditItem(null)} />}
                          </DialogContent>
                        </Dialog>
                        <Button variant="ghost" size="icon" onClick={() => { if (confirm(`Remove "${item.name}" from the surgery names list?`)) deleteMutation.mutate(item.id); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="py-16 text-center text-muted-foreground">
            {search ? "No surgery names match your search." : "No surgery names added yet."}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SurgeryCatalogTab({ canManage }: { canManage: boolean }) {
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: catalog = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/surgery-catalog"] });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/surgery-catalog/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/surgery-catalog"] });
      toast({ title: "Deleted", description: "Surgery catalog entry removed." });
    },
    onError: () => toast({ title: "Error", description: "Failed to delete.", variant: "destructive" }),
  });

  const filtered = catalog.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Card className="border-border/50 shadow-md">
      <CardHeader className="py-4 border-b bg-secondary/20 flex flex-row items-center gap-3 flex-wrap">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search surgery catalog..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-background border-border/60" />
        </div>
        {canManage && (
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="ml-auto"><Plus className="mr-2 h-4 w-4" />Add Feature</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[440px]">
              <DialogHeader><DialogTitle className="font-display">Add Surgery Feature</DialogTitle></DialogHeader>
              <SurgeryCatalogDialog onClose={() => setAddOpen(false)} />
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : filtered.length > 0 ? (
          <Table>
            <TableHeader className="bg-secondary/40">
              <TableRow>
                <TableHead>Feature</TableHead>
                <TableHead className="text-right">Charge</TableHead>
                {canManage && <TableHead className="w-[120px]"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-right">₹{item.cost.toLocaleString()}</TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Dialog open={editItem?.id === item.id} onOpenChange={(open) => !open && setEditItem(null)}>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => setEditItem(item)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[440px]">
                            <DialogHeader><DialogTitle className="font-display">Edit Surgery Feature</DialogTitle></DialogHeader>
                            {editItem?.id === item.id && <SurgeryCatalogDialog item={editItem} onClose={() => setEditItem(null)} />}
                          </DialogContent>
                        </Dialog>
                        <Button variant="ghost" size="icon" onClick={() => { if (confirm(`Remove "${item.name}"?`)) deleteMutation.mutate(item.id); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="py-16 text-center text-muted-foreground">
            {search ? "No surgery features match your search." : "No surgery features added yet."}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function SurgeriesPage() {
  const { data: user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const canManage = user?.role === "MANAGER" || isAdmin;

  if (!canManage) return <div className="p-8 text-center text-muted-foreground">Access restricted.</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight">Surgeries</h1>
        <p className="text-muted-foreground">
          Manage surgery names and the surgery charge catalog from one place.
        </p>
      </div>

      <Tabs defaultValue="surgery-names">
        <TabsList className="rounded-xl bg-secondary/50 p-1">
          <TabsTrigger value="surgery-names" className="rounded-lg px-6">
            <Scissors className="mr-2 h-4 w-4" />
            Surgery Names
          </TabsTrigger>
          <TabsTrigger value="surgery-catalog" className="rounded-lg px-6">
            <Scissors className="mr-2 h-4 w-4" />
            Surgery Catalog
          </TabsTrigger>
        </TabsList>
        <div className="mt-4">
          <TabsContent value="surgery-names">
            <SurgeryNamesTab isAdmin={Boolean(isAdmin)} />
          </TabsContent>
          <TabsContent value="surgery-catalog">
            <SurgeryCatalogTab canManage={canManage} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
