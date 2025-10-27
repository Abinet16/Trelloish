// src/App.tsx
import { useAuth } from "./context/AuthContext";
import { Auth } from "./components/Auth";
import { CreateTask } from "./components/CreateTask";
import { RealTimeTasks } from "./components/RealTimeTasks";
import { Button } from "./components/ui/button";

function App() {
  const { isAuthenticated, logout } = useAuth();

  const handleLogout = () => {
    logout();
    window.location.reload();
  };

  if (!isAuthenticated) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4 sm:p-6 lg:p-8">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Trelloish Dashboard
        </h1>
        <Button variant="outline" onClick={handleLogout}>
          Logout
        </Button>
      </header>

      <main className="grid gap-8 md:grid-cols-2">
        <div className="space-y-8">
          <CreateTask />
        </div>
        <div className="space-y-8">
          <RealTimeTasks />
        </div>
      </main>
    </div>
  );
}

export default App;
