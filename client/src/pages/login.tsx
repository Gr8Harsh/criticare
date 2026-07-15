import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { loginSchema } from "@shared/routes";
import { useLogin } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import logoImg from "@assets/Adobe_Express_-_file_1772173054491.png";

export default function Login() {
  const [, setLocation] = useLocation();
  const loginMutation = useLogin();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  function onSubmit(values: z.infer<typeof loginSchema>) {
    loginMutation.mutate(values, {
      onSuccess: () => {
        toast({ title: "Welcome back", description: "Successfully logged in." });
        setTimeout(() => setLocation("/"), 500);
      },
      onError: (err) => {
        toast({ title: "Login Failed", description: err.message, variant: "destructive" });
      },
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary to-background p-4 relative overflow-hidden">
      {/* Decorative background blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/10 rounded-full blur-3xl pointer-events-none" />

      <Card className="w-full max-w-md shadow-2xl border-border/50 bg-background/80 backdrop-blur-xl z-10">
        <CardHeader className="space-y-3 pb-6 text-center">
          <div className="mx-auto w-20 h-20 rounded-2xl flex items-center justify-center overflow-hidden mb-2">
            <img src={logoImg} alt="Criticare Logo" className="w-full h-full object-contain" />
          </div>
          <CardTitle className="text-3xl font-display font-bold text-primary tracking-tight">
            Criticare IPD
          </CardTitle>
          <CardDescription className="text-base font-medium">
            Sign in to access the hospital management system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground/80">Email Address</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="doctor@criticare.com" 
                        {...field} 
                        className="h-12 rounded-xl bg-card border-2 focus-visible:ring-primary/20"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground/80">Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="••••••••" 
                        {...field} 
                        className="h-12 rounded-xl bg-card border-2 focus-visible:ring-primary/20"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="submit" 
                className="w-full h-12 text-base font-bold rounded-xl bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Authenticating...</>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
