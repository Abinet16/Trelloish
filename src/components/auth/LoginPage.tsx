// src/components/auth/LoginPage.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast'; // Correct shadcn/ui path
import { Link, useNavigate } from 'react-router-dom'; // Correct react-router-dom path
import { LogIn, Loader2 } from 'lucide-react';

export function LoginPage() {
  const [email, setEmail] = useState('owner@example.com'); // Pre-fill for demo convenience
  const [password, setPassword] = useState('Password123!');
  const [loading, setLoading] = useState(false);
  const { isAuthenticated, login } = useAuth(); // We only need the 'login' function here
  const { toast } = useToast();
  const navigate = useNavigate();

  // The problematic useEffect has been REMOVED.
  // The PublicLayout in AppRouter.tsx now handles this logic correctly.

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("http://localhost:4000/rest/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();

      if (!response.ok) 
        throw new Error(
          data.message || "Login failed. Please check your credentials."
        );
      

      // 1. Update the global authentication state
      login(data.accessToken, data.user);

      toast({
        title: "Login Successful",
        description: "Redirecting...",
      });
      navigate('/dashboard', { replace: true });
      // --- THE FIX IS HERE ---
      // ALWAYS navigate to the single entry point. Let the dashboard handle the rest.
      //navigate("/dashboard", { replace: true });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: err.message,
      });
      setLoading(false); // Make sure loading stops on error
    }
    // No finally block needed as navigation will unmount the component
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-slate-100 dark:bg-slate-900">
      <Card className="w-[400px] shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">
            Welcome Back!
          </CardTitle>
          <CardDescription>
            Enter your credentials to access Trelloish.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} id="login-form">
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)} // Update email state (e.g.,et.value)}
                  placeholder="name@example.com"
                  required
                  disabled={loading}
                />
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  required
                  disabled={loading}
                />
              </div>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button
            type="submit"
            form="login-form"
            className="w-full"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <LogIn className="mr-2 h-4 w-4" />
            )}
            {loading ? "Signing In..." : "Sign In"}
          </Button>
          <p className="text-sm text-center text-muted-foreground">
            Don't have an account?{" "}
            <Link
              to="/register"
              className="font-semibold underline hover:text-primary"
            >
              Register
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}