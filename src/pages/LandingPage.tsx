// src/pages/LandingPage.tsx
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { CheckCircle, BarChart, Users, Zap } from "lucide-react";

export function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold">
            <Zap className="h-6 w-6 text-blue-500" />
            <span>Trelloish</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link to="/register">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                Get Started Free
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-20 md:py-32 lg:py-40 relative overflow-hidden">
          {/* Animated Gradient Background */}
          <div className="absolute top-0 left-0 -z-10 h-full w-full bg-white dark:bg-gray-950">
            <div className="absolute bottom-auto left-auto right-0 top-0 h-[500px] w-[500px] -translate-x-[30%] translate-y-[20%] rounded-full bg-[rgba(109,109,244,0.5)] opacity-50 blur-[80px]"></div>
          </div>
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center space-y-6 text-center">
              <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl/none bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
                Turn Chaos into Clarity
              </h1>
              <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                Trelloish is your team's visual workspace for planning,
                tracking, and completing projects of any size. Powerful,
                real-time, and beautifully simple.
              </p>
              <Link to="/register">
                <Button
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20"
                >
                  Start Organizing Now
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-slate-50 dark:bg-slate-900">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
              <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm">
                Key Features
              </div>
              <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">
                Everything You Need for Peak Productivity
              </h2>
              <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                From real-time updates to powerful AI integrations, Trelloish
                has you covered.
              </p>
            </div>
            <div className="mx-auto grid max-w-5xl items-start gap-8 sm:grid-cols-2 md:gap-12 lg:grid-cols-3">
              <FeatureCard
                icon={<CheckCircle className="h-8 w-8 text-blue-500" />}
                title="Intuitive Kanban Boards"
                description="Visualize your workflow with simple drag-and-drop cards and columns."
              />
              <FeatureCard
                icon={<BarChart className="h-8 w-8 text-blue-500" />}
                title="Real-Time Collaboration"
                description="See updates from your team instantly, keeping everyone perfectly in sync."
              />
              <FeatureCard
                icon={<Users className="h-8 w-8 text-blue-500" />}
                title="Seamless Team Management"
                description="Organize your work into shared workspaces with granular role-based permissions."
              />
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full py-6 border-t bg-slate-100 dark:bg-slate-900">
        <div className="container flex items-center justify-center">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Trelloish Inc. All rights
            reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

// A small helper component for the features section
function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="grid gap-2 text-left">
      <div className="mb-2">{icon}</div>
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
