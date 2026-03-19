import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Plus, Search, Pencil, Trash2, Scissors } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const surgeryNameSchema = z.object({
  name: z.string().min(1, "Surgery name is required"),
});
type SurgeryNameForm = z.infer<typeof surgeryNameSchema>;

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
            <FormControl>
              <Input placeholder="e.g. Appendectomy, Hernia Repair, Bypass Surgery…" {...field} data-testid="input-surgery-name" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <div className="flex gap-2 pt-1">
          <Button type="submit" className="flex-1" disabled={mutation.isPending} data-testid="button-save-surgery-name">
            {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEdit ? "Update" : "Add Surgery Name"}
          </Button>
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Form>
  );
}

export default function SurgeriesPage() {
  const { data: user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const isManager = user?.role === "MANAGER" || isAdmin;
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: surgeryNamesList, isLoading } = useQuery<any[]>({
    queryKey: ["/api/surgery-names"],
  });

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

  const handleDelete = (id: number, name: string) => {
    if (confirm(`Remove "${name}" from the surgery names list?`)) {
      deleteMutation.mutate(id);
    }
  };

  if (!isManager) return <div className="p-8 text-center text-muted-foreground">Access restricted.</div>;

  const filtered = surgeryNamesList?.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Surgery Names</h1>
          <p className="text-muted-foreground">
            Manage the list of surgery names available when recording patient surgeries.
          </p>
        </div>
        {isAdmin && (
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="hover-elevate shadow-lg" data-testid="button-add-surgery-name">
                <Plus className="w-5 h-5 mr-2" /> Add Surgery Name
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[420px]">
              <DialogHeader>
                <DialogTitle className="font-display">Add Surgery Name</DialogTitle>
              </DialogHeader>
              <SurgeryNameDialog onClose={() => setAddOpen(false)} />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card className="border-border/50 shadow-md">
        <CardHeader className="py-4 border-b bg-secondary/20">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search surgery names…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background border-border/60"
              data-testid="input-search-surgeries"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
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
                {filtered.map((s, idx) => (
                  <TableRow key={s.id} data-testid={`row-surgery-name-${s.id}`}>
                    <TableCell className="text-muted-foreground w-12">{idx + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Scissors className="w-4 h-4 text-primary shrink-0" />
                        <span className="font-medium">{s.name}</span>
                      </div>
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="hover:bg-primary/10 hover:text-primary"
                            onClick={() => setEditItem(s)}
                            data-testid={`button-edit-surgery-name-${s.id}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => handleDelete(s.id, s.name)}
                            disabled={deleteMutation.isPending}
                            data-testid={`button-delete-surgery-name-${s.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-16 flex flex-col items-center gap-3 text-center">
              <Scissors className="w-10 h-10 text-muted-foreground/40" />
              <p className="text-muted-foreground font-medium">
                {search ? "No surgery names match your search." : "No surgery names added yet."}
              </p>
              {isAdmin && !search && (
                <p className="text-sm text-muted-foreground">
                  Click "Add Surgery Name" to start building your surgery list.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {editItem && (
        <Dialog open={!!editItem} onOpenChange={(open) => { if (!open) setEditItem(null); }}>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle className="font-display">Edit Surgery Name</DialogTitle>
            </DialogHeader>
            <SurgeryNameDialog item={editItem} onClose={() => setEditItem(null)} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
