// src/components/layout/RootLayout.tsx
import { Outlet } from "react-router-dom";
import { Header } from "./Header";

export function RootLayout() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <Outlet />
      </main>
    </div>
  );
}
