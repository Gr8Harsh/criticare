import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Plus, Search, Pencil, Trash2, Stethoscope, Scissors } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Textarea } from "@/components/ui/textarea";

// ─── Procedure Catalog ───────────────────────────────────────────────────────

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

  const filtered = catalog?.filter(c =>
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

// ─── Surgery Catalog ─────────────────────────────────────────────────────────

const SURGERY_CATEGORY_OPTIONS = [
  { value: "SURGERY",           label: "Surgery" },
  { value: "SURGEON",           label: "Surgeon" },
  { value: "ASSISTANT_SURGEON", label: "Assistant Surgeon" },
  { value: "ANAESTHETIST",      label: "Anaesthetist" },
  { value: "OT",                label: "OT (Operating Theatre)" },
  { value: "OT_ASSISTANT",      label: "OT Assistant" },
];

const surgeryCatalogSchema = z.object({
  name: z.string().min(1, "Name is required"),
  cost: z.coerce.number().min(0, "Cost must be 0 or more"),
  category: z.enum(["SURGERY", "SURGEON", "ASSISTANT_SURGEON", "ANAESTHETIST", "OT", "OT_ASSISTANT"]),
});
type SurgeryCatalogForm = z.infer<typeof surgeryCatalogSchema>;

function SurgeryAddEditDialog({ item, onClose }: { item?: any; onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEdit = !!item;

  const form = useForm<SurgeryCatalogForm>({
    resolver: zodResolver(surgeryCatalogSchema),
    defaultValues: { name: item?.name ?? "", cost: item?.cost ?? 0, category: item?.category ?? "SURGERY" },
  });

  const mutation = useMutation({
    mutationFn: async (data: SurgeryCatalogForm) => {
      const url = isEdit ? `/api/surgery-catalog/${item.id}` : "/api/surgery-catalog";
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
      queryClient.invalidateQueries({ queryKey: ["/api/surgery-catalog"] });
      toast({ title: "Success", description: isEdit ? "Entry updated." : "Entry added." });
      onClose();
    },
    onError: () => toast({ title: "Error", description: "Failed to save.", variant: "destructive" }),
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-4 pt-2">
        <FormField control={form.control} name="category" render={({ field }) => (
          <FormItem>
            <FormLabel>Charge Category</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl><SelectTrigger data-testid="select-surgery-category"><SelectValue placeholder="Select category" /></SelectTrigger></FormControl>
              <SelectContent>
                {SURGERY_CATEGORY_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem>
            <FormLabel>Name</FormLabel>
            <FormControl><Input data-testid="input-surgery-name" placeholder="e.g. General Surgery, Laparoscopy" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="cost" render={({ field }) => (
          <FormItem>
            <FormLabel>Charge (₹)</FormLabel>
            <FormControl><Input type="number" min="0" data-testid="input-surgery-cost" placeholder="0" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <div className="flex gap-2 pt-1">
          <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90" disabled={mutation.isPending} data-testid="button-save-surgery-catalog">
            {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEdit ? "Update" : "Add Entry"}
          </Button>
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Form>
  );
}

function SurgeryCatalogTab({ canManage }: { canManage: boolean }) {
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<string>("ALL");
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: catalog, isLoading } = useQuery<any[]>({ queryKey: ["/api/surgery-catalog"] });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/surgery-catalog/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/surgery-catalog"] });
      toast({ title: "Deleted", description: "Entry removed." });
    },
    onError: () => toast({ title: "Error", description: "Failed to delete.", variant: "destructive" }),
  });

  const filtered = catalog?.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === "ALL" || c.category === filterCat;
    return matchSearch && matchCat;
  });

  const getCategoryLabel = (cat: string) =>
    SURGERY_CATEGORY_OPTIONS.find(o => o.value === cat)?.label ?? cat;

  return (
    <Card className="border-border/50 shadow-md">
      <CardHeader className="py-4 border-b bg-secondary/20 flex flex-row items-center gap-3 flex-wrap">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-background border-border/60" data-testid="input-search-surgery-catalog" />
        </div>
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-[200px]" data-testid="select-filter-surgery-category">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Categories</SelectItem>
            {SURGERY_CATEGORY_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {canManage && (
          <div className="ml-auto">
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button className="hover-elevate shadow-lg" data-testid="button-add-surgery-catalog">
                  <Plus className="w-5 h-5 mr-2" /> Add Entry
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[440px]">
                <DialogHeader><DialogTitle className="font-display">Add to Surgery Catalog</DialogTitle></DialogHeader>
                <SurgeryAddEditDialog onClose={() => setAddOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>
        ) : filtered?.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Scissors className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No surgery catalog entries yet.</p>
            {canManage && <p className="text-sm mt-1">Click "Add Entry" to build the catalog.</p>}
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-secondary/40">
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Charge</TableHead>
                {canManage && <TableHead className="w-[100px]"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered?.map((item) => (
                <TableRow key={item.id} data-testid={`row-surgery-catalog-${item.id}`}>
                  <TableCell className="font-semibold">{item.name}</TableCell>
                  <TableCell>
                    <span className="text-xs bg-primary/10 text-primary font-medium px-2 py-0.5 rounded-full">
                      {getCategoryLabel(item.category)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-medium">₹{item.cost.toLocaleString()}</TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Dialog open={editItem?.id === item.id} onOpenChange={(open) => !open && setEditItem(null)}>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => setEditItem(item)} className="hover:bg-primary/10 hover:text-primary" data-testid={`button-edit-surgery-catalog-${item.id}`}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[440px]">
                            <DialogHeader><DialogTitle className="font-display">Edit Entry</DialogTitle></DialogHeader>
                            {editItem?.id === item.id && <SurgeryAddEditDialog item={editItem} onClose={() => setEditItem(null)} />}
                          </DialogContent>
                        </Dialog>
                        <Button variant="ghost" size="icon" onClick={() => { if (confirm(`Remove "${item.name}"?`)) deleteMutation.mutate(item.id); }} className="hover:bg-destructive/10 hover:text-destructive" data-testid={`button-delete-surgery-catalog-${item.id}`}>
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

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function ProceduresPage() {
  const { data: currentUser } = useAuth();
  const canManage = currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER';

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight">Catalog Management</h1>
        <p className="text-muted-foreground">Manage procedure and surgery charge catalogs used across patient records.</p>
      </div>

      <Tabs defaultValue="procedures">
        <TabsList className="bg-secondary/50 p-1 rounded-xl">
          <TabsTrigger value="procedures" className="rounded-lg px-6">
            <Stethoscope className="w-4 h-4 mr-2" /> Procedures
          </TabsTrigger>
          <TabsTrigger value="surgery" className="rounded-lg px-6">
            <Scissors className="w-4 h-4 mr-2" /> Surgery
          </TabsTrigger>
        </TabsList>
        <div className="mt-4">
          <TabsContent value="procedures">
            <ProcedureCatalogTab canManage={canManage} />
          </TabsContent>
          <TabsContent value="surgery">
            <SurgeryCatalogTab canManage={canManage} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
