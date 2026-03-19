import { useState } from "react";
import { useDoctors } from "@/hooks/use-doctors";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Plus, Search, Stethoscope, Settings2, Scissors } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const userSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["MANAGER", "DOCTOR"]),
});

const doctorSchema = z.object({
  name: z.string().min(2),
  specialization: z.string().min(2),
  visitCharge: z.coerce.number().min(0),
  userId: z.coerce.number().min(1, "Select a User account"),
  isSurgeon: z.boolean().default(false),
});

function RoomChargesDialog({ doctor }: { doctor: any }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: roomTypes } = useQuery<any[]>({ queryKey: [api.roomTypes.list.path] });
  const { data: roomCharges, isLoading } = useQuery<any[]>({
    queryKey: [`/api/doctors/${doctor.id}/room-charges`],
    enabled: open,
  });

  const upsertCharge = useMutation({
    mutationFn: async ({ roomTypeId, charge }: { roomTypeId: number; charge: number }) => {
      const res = await fetch(`/api/doctors/${doctor.id}/room-charges`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomTypeId, charge }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to save charge");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/doctors/${doctor.id}/room-charges`] });
      toast({ title: "Saved", description: "Room charge updated." });
    },
    onError: () => toast({ title: "Error", description: "Failed to save.", variant: "destructive" }),
  });

  const getCharge = (roomTypeId: number) =>
    roomCharges?.find((rc) => rc.roomTypeId === roomTypeId)?.charge ?? "";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="hover-elevate"
          data-testid={`button-room-charges-${doctor.id}`}
        >
          <Settings2 className="w-4 h-4 mr-1" /> Room Charges
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="font-display">
            Room-wise Visit Charges — Dr. {doctor.name}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground -mt-2 mb-1">
          Set a different visit charge for each room type. Leave blank to use the default charge (₹{doctor.visitCharge}).
        </p>
        {isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : (
          <div className="space-y-3">
            {roomTypes?.map((rt) => (
              <RoomChargeRow
                key={rt.id}
                roomType={rt}
                currentCharge={getCharge(rt.id)}
                onSave={(charge) => upsertCharge.mutate({ roomTypeId: rt.id, charge })}
                isPending={upsertCharge.isPending}
              />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function RoomChargeRow({ roomType, currentCharge, onSave, isPending }: {
  roomType: any;
  currentCharge: number | string;
  onSave: (charge: number) => void;
  isPending: boolean;
}) {
  const [value, setValue] = useState(currentCharge.toString());

  const handleSave = () => {
    const num = parseInt(value);
    if (!isNaN(num) && num >= 0) onSave(num);
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
      <div className="flex-1">
        <div className="font-medium text-sm">{roomType.name}</div>
        <div className="text-xs text-muted-foreground">Room rate: ₹{roomType.dailyCharge}/day</div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-sm">₹</span>
        <Input
          type="number"
          min="0"
          className="w-28 h-8 text-sm"
          placeholder={`default`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          data-testid={`input-room-charge-${roomType.id}`}
        />
        <Button
          size="sm"
          variant="secondary"
          className="h-8 px-3"
          onClick={handleSave}
          disabled={isPending}
          data-testid={`button-save-room-charge-${roomType.id}`}
        >
          Save
        </Button>
      </div>
    </div>
  );
}

export default function DoctorsList() {
  const { data: doctors, isLoading } = useDoctors();
  const { data: currentUser } = useAuth();
  const [search, setSearch] = useState("");
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isAddDoctorOpen, setIsAddDoctorOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: usersList } = useQuery<any[]>({
    queryKey: ["/api/admin/users"],
    enabled: currentUser?.role === 'ADMIN'
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: z.infer<typeof userSchema>) => {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create user");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User created successfully" });
      setIsAddUserOpen(false);
      userForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

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
      setIsAddDoctorOpen(false);
      doctorForm.reset();
    }
  });

  const userForm = useForm<z.infer<typeof userSchema>>({
    resolver: zodResolver(userSchema),
    defaultValues: { name: "", email: "", password: "", role: "DOCTOR" }
  });

  const doctorForm = useForm<z.infer<typeof doctorSchema>>({
    resolver: zodResolver(doctorSchema),
    defaultValues: { name: "", specialization: "", visitCharge: 0, userId: 0, isSurgeon: false }
  });

  const filteredDoctors = doctors?.filter(d => d.name.toLowerCase().includes(search.toLowerCase()));

  if (currentUser?.role !== 'MANAGER' && currentUser?.role !== 'ADMIN') return <div>Unauthorized</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">{currentUser?.role === 'ADMIN' ? 'Staff Management' : 'Doctors'}</h1>
          <p className="text-muted-foreground">{currentUser?.role === 'ADMIN' ? 'Manage hospital medical and administrative staff.' : 'View available doctors and their specializations.'}</p>
        </div>
        {currentUser?.role === 'ADMIN' && (
          <div className="flex gap-2">
            <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="hover-elevate shadow-sm"><Plus className="w-5 h-5 mr-2" /> Add User Account</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create New User Account</DialogTitle></DialogHeader>
                <Form {...userForm}>
                  <form onSubmit={userForm.handleSubmit((d) => createUserMutation.mutate(d))} className="space-y-4">
                    <FormField control={userForm.control} name="name" render={({ field }) => (
                      <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={userForm.control} name="email" render={({ field }) => (
                      <FormItem><FormLabel>Email Address</FormLabel><FormControl><Input type="email" placeholder="john@example.com" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={userForm.control} name="password" render={({ field }) => (
                      <FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={userForm.control} name="role" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="MANAGER">Manager</SelectItem>
                            <SelectItem value="DOCTOR">Doctor</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <Button type="submit" className="w-full" disabled={createUserMutation.isPending}>Create User</Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
            <Dialog open={isAddDoctorOpen} onOpenChange={setIsAddDoctorOpen}>
              <DialogTrigger asChild>
                <Button className="hover-elevate shadow-lg"><Plus className="w-5 h-5 mr-2" /> Add Doctor Profile</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>New Doctor Profile</DialogTitle></DialogHeader>
                <Form {...doctorForm}>
                  <form onSubmit={doctorForm.handleSubmit((d) => createDoctor.mutate(d))} className="space-y-4">
                    <FormField control={doctorForm.control} name="name" render={({ field }) => (
                      <FormItem><FormLabel>Doctor Name</FormLabel><FormControl><Input placeholder="Dr. John Doe" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={doctorForm.control} name="specialization" render={({ field }) => (
                      <FormItem><FormLabel>Specialization</FormLabel><FormControl><Input placeholder="Cardiology" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={doctorForm.control} name="visitCharge" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Visit Charge (₹)</FormLabel>
                        <FormControl><Input type="number" {...field} /></FormControl>
                        <FormMessage />
                        <p className="text-xs text-muted-foreground">Used when no room-specific charge is set.</p>
                      </FormItem>
                    )} />
                    <FormField control={doctorForm.control} name="userId" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Link to User Account</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value.toString()}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select a user" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {usersList?.filter(u => u.role === 'DOCTOR').map(u => (
                              <SelectItem key={u.id} value={u.id.toString()}>{u.name} ({u.email})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={doctorForm.control} name="isSurgeon" render={({ field }) => (
                      <FormItem className="flex items-center gap-3 rounded-lg border border-border/50 p-3 bg-secondary/20">
                        <FormControl>
                          <Checkbox
                            data-testid="checkbox-is-surgeon"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-0.5 leading-none">
                          <FormLabel className="cursor-pointer flex items-center gap-1.5">
                            <Scissors className="w-3.5 h-3.5" /> Mark as Surgeon
                          </FormLabel>
                          <p className="text-xs text-muted-foreground">Surgeon doctors can be assigned surgery charges.</p>
                        </div>
                      </FormItem>
                    )} />
                    <Button type="submit" className="w-full" disabled={createDoctor.isPending}>Save Profile</Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        )}
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
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Default Visit Charge</TableHead>
                  <TableHead className="text-right">Room Charges</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDoctors?.map((doc) => (
                  <TableRow key={doc.id} data-testid={`row-doctor-${doc.id}`}>
                    <TableCell className="font-bold">
                      <div className="flex items-center gap-2">
                        <Stethoscope className="w-4 h-4 text-primary shrink-0" /> Dr. {doc.name}
                      </div>
                    </TableCell>
                    <TableCell>{doc.specialization}</TableCell>
                    <TableCell>
                      {doc.isSurgeon ? (
                        <Badge className="gap-1 bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 border-violet-200">
                          <Scissors className="w-3 h-3" /> Surgeon
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <Stethoscope className="w-3 h-3" /> Doctor
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">₹{doc.visitCharge}</TableCell>
                    <TableCell className="text-right">
                      {(currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER') && (
                        <RoomChargesDialog doctor={doc} />
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
