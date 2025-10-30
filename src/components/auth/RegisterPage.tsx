// src/components/auth/RegisterPage.tsx
import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useMutation } from "@apollo/client/react";
import { REGISTER_MUTATION } from "@/api/graphql";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

export function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useAuth();
  const { toast } = useToast();

  const [register, { loading }] = useMutation(REGISTER_MUTATION, {
    onCompleted: (data: any) => {
      login(data.register.accessToken, data.register.user);
      toast({ title: "Registration Successful", description: "Welcome!" });
      // The router in App.tsx will automatically redirect to the dashboard
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: error.message,
      });
    },
  });

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    register({ variables: { email, password } });
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle>Create an Account</CardTitle>
          <CardDescription>
            Enter your email and password to get started.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister}>
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="underline">
              Login
            </Link>
          </p>
          <Button onClick={handleRegister} disabled={loading}>
            {loading ? "Registering..." : "Register"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
