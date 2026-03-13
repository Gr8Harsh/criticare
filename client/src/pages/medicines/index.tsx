import { useState } from "react";
import { useMedicines, useCreateMedicine } from "@/hooks/use-medicines";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Plus, Search, Pill } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const medSchema = z.object({
  name: z.string().min(2),
  unitCost: z.coerce.number().min(0),
});

export default function MedicinesList() {
  const { data: medicines, isLoading } = useMedicines();
  const createMedicine = useCreateMedicine();
  const { data: user } = useAuth();
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);

  const form = useForm<z.infer<typeof medSchema>>({
    resolver: zodResolver(medSchema),
    defaultValues: { name: "", unitCost: 0 }
  });

  const filteredMeds = medicines?.filter(m => m.name.toLowerCase().includes(search.toLowerCase()));

  if (user?.role !== 'MANAGER') return <div>Unauthorized</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Pharmacy</h1>
          <p className="text-muted-foreground">Manage medicine inventory and pricing.</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="hover-elevate shadow-lg"><Plus className="w-5 h-5 mr-2" /> Add Medicine</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Medicine</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((d) => createMedicine.mutate(d, { onSuccess: () => setIsAddOpen(false) }))} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Medicine Name</FormLabel><FormControl><Input placeholder="Paracetamol" {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="unitCost" render={({ field }) => (
                  <FormItem><FormLabel>Unit Cost ($)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                )} />
                <Button type="submit" className="w-full" disabled={createMedicine.isPending}>Save</Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border/50 shadow-md">
        <CardHeader className="py-4 border-b bg-secondary/20">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search medicines..." 
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background border-border/60"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader className="bg-secondary/40">
                <TableRow>
                  <TableHead>Medicine Name</TableHead>
                  <TableHead className="text-right">Unit Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMeds?.map((med) => (
                  <TableRow key={med.id}>
                    <TableCell className="font-bold flex items-center gap-2">
                      <Pill className="w-4 h-4 text-primary" /> {med.name}
                    </TableCell>
                    <TableCell className="text-right font-medium">₹{med.unitCost}</TableCell>
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
