import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Plus, Pencil, Trash2, CreditCard, Microscope, ScanLine, PackagePlus } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const OTHER_CHARGE_CATEGORIES = [
  { value: "OTHER", label: "Extra Charges", icon: CreditCard },
  { value: "PROSTHESIS", label: "Prosthesis", icon: PackagePlus },
  { value: "PATHOLOGY", label: "Pathology", icon: Microscope },
  { value: "RADIOLOGY", label: "Radiology", icon: ScanLine },
] as const;

const otherChargeCatalogSchema = z.object({
  name: z.string().min(1, "Name is required"),
  defaultAmount: z.coerce.number().min(0, "Amount must be 0 or more"),
});

type OtherChargeCatalogForm = z.infer<typeof otherChargeCatalogSchema>;

function OtherChargeCatalogDialog({
  category,
  item,
  onClose,
}: {
  category: string;
  item?: any;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isEdit = Boolean(item);
  const isProsthesis = category === "PROSTHESIS";

  const form = useForm<OtherChargeCatalogForm>({
    resolver: zodResolver(otherChargeCatalogSchema),
    defaultValues: {
      name: item?.name ?? "",
      defaultAmount: item?.defaultAmount ?? 0,
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: OtherChargeCatalogForm) => {
      const url = isEdit ? `/api/other-charge-catalog/${item.id}` : "/api/other-charge-catalog";
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, defaultAmount: isProsthesis ? 0 : data.defaultAmount, category }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/other-charge-catalog"] });
      toast({ title: isEdit ? "Catalog updated" : "Catalog item added" });
      onClose();
    },
    onError: () => toast({ title: "Error", description: "Failed to save catalog item.", variant: "destructive" }),
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} className="space-y-4 pt-2">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Charge Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Dressing materials, CT Chest, Stent" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {!isProsthesis && (
        <FormField
          control={form.control}
          name="defaultAmount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Default Amount (₹)</FormLabel>
              <FormControl>
                <Input type="number" min="0" placeholder="0" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        )}
        <div className="flex gap-2 pt-2">
          <Button type="submit" className="flex-1" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? "Update" : "Add Item"}
          </Button>
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}

export default function OtherChargesPage() {
  const { data: user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState<(typeof OTHER_CHARGE_CATEGORIES)[number]["value"]>("OTHER");
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const canManage = user?.role === "ADMIN" || user?.role === "MANAGER";

  const { data: catalog = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/other-charge-catalog"],
  });

  const filteredCatalog = useMemo(
    () => catalog.filter((item) => item.category === activeCategory),
    [activeCategory, catalog],
  );

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/other-charge-catalog/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/other-charge-catalog"] });
      toast({ title: "Catalog item deleted" });
    },
    onError: () => toast({ title: "Error", description: "Failed to delete catalog item.", variant: "destructive" }),
  });

  if (!canManage) {
    return <div className="p-8 text-center text-muted-foreground">Access restricted.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight">Other Charges</h1>
        <p className="text-muted-foreground">
          Manage reusable charge options for extra charges, prosthesis, pathology, and radiology.
          These items appear in the patient charge form dropdown, and staff can still type a custom charge when needed.
        </p>
      </div>

      <Tabs value={activeCategory} onValueChange={(value) => setActiveCategory(value as typeof activeCategory)}>
        <TabsList className="h-auto flex-wrap gap-1 rounded-xl bg-secondary/50 p-1">
          {OTHER_CHARGE_CATEGORIES.map((category) => (
            <TabsTrigger key={category.value} value={category.value} className="rounded-lg px-5">
              <category.icon className="mr-2 h-4 w-4" />
              {category.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {OTHER_CHARGE_CATEGORIES.map((category) => (
          <TabsContent key={category.value} value={category.value} className="mt-6">
            <Card className="border-border/50 shadow-md">
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle className="font-display">{category.label}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Saved items here can be picked from a dropdown while adding charges to a patient.
                  </p>
                </div>
                <Dialog open={addOpen && activeCategory === category.value} onOpenChange={setAddOpen}>
                  <DialogTrigger asChild>
                    <Button className="shrink-0">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Item
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[440px]">
                    <DialogHeader>
                      <DialogTitle className="font-display">Add {category.label} Item</DialogTitle>
                    </DialogHeader>
                    <OtherChargeCatalogDialog category={category.value} onClose={() => setAddOpen(false)} />
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : filteredCatalog.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground">
                    No saved {category.label.toLowerCase()} items yet.
                  </div>
                ) : (
                  <Table>
                    <TableHeader className="bg-secondary/40">
                      <TableRow>
                        <TableHead>Name</TableHead>
                        {category.value !== "PROSTHESIS" && <TableHead className="text-right">Default Amount</TableHead>}
                        <TableHead className="w-[100px] text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCatalog.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          {category.value !== "PROSTHESIS" && (
                          <TableCell className="text-right">₹{(item.defaultAmount ?? 0).toLocaleString()}</TableCell>
                          )}
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Dialog open={editItem?.id === item.id} onOpenChange={(open) => !open && setEditItem(null)}>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="icon" onClick={() => setEditItem(item)}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[440px]">
                                  <DialogHeader>
                                    <DialogTitle className="font-display">Edit {category.label} Item</DialogTitle>
                                  </DialogHeader>
                                  {editItem?.id === item.id && (
                                    <OtherChargeCatalogDialog
                                      category={category.value}
                                      item={editItem}
                                      onClose={() => setEditItem(null)}
                                    />
                                  )}
                                </DialogContent>
                              </Dialog>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  if (confirm(`Remove "${item.name}" from ${category.label}?`)) {
                                    deleteMutation.mutate(item.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
