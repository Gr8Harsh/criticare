import { useState } from "react";
import { useDoctors } from "@/hooks/use-doctors";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Plus, Search, Stethoscope } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";

const doctorSchema = z.object({
  name: z.string().min(2),
  specialization: z.string().min(2),
  visitCharge: z.coerce.number().min(0),
  userId: z.coerce.number().min(1, "Create a User account first and provide ID"),
});

export default function DoctorsList() {
  const { data: doctors, isLoading } = useDoctors();
  const { data: user } = useAuth();
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createDoctor = useMutation({
    mutationFn: async (data: z.infer<typeof doctorSchema>) => {
      const res = await fetch(api.doctors.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create doctor");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.doctors.list.path] });
      toast({ title: "Doctor added successfully" });
      setIsAddOpen(false);
    }
  });

  const form = useForm<z.infer<typeof doctorSchema>>({
    resolver: zodResolver(doctorSchema),
    defaultValues: { name: "", specialization: "", visitCharge: 0, userId: 0 }
  });

  const filteredDoctors = doctors?.filter(d => d.name.toLowerCase().includes(search.toLowerCase()));

  if (user?.role !== 'MANAGER' && user?.role !== 'ADMIN') return <div>Unauthorized</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Doctors</h1>
          <p className="text-muted-foreground">Manage hospital medical staff.</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="hover-elevate shadow-lg"><Plus className="w-5 h-5 mr-2" /> Add Doctor</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Doctor Profile</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((d) => createDoctor.mutate(d))} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="specialization" render={({ field }) => (
                  <FormItem><FormLabel>Specialization</FormLabel><FormControl><Input placeholder="Cardiology" {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="visitCharge" render={({ field }) => (
                  <FormItem><FormLabel>Visit Charge ($)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="userId" render={({ field }) => (
                  <FormItem><FormLabel>Linked User ID</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                )} />
                <Button type="submit" className="w-full" disabled={createDoctor.isPending}>Save Profile</Button>
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
              placeholder="Search doctors..." 
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
                  <TableHead>Doctor Name</TableHead>
                  <TableHead>Specialization</TableHead>
                  <TableHead className="text-right">Visit Charge</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDoctors?.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-bold flex items-center gap-2">
                      <Stethoscope className="w-4 h-4 text-primary" /> Dr. {doc.name}
                    </TableCell>
                    <TableCell>{doc.specialization}</TableCell>
                    <TableCell className="text-right font-medium">${doc.visitCharge}</TableCell>
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
