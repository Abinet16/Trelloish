// src/App.tsx
import { AuthProvider } from "./context/AuthContext";
import { AppRouter } from "./AppRouter";

export function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}
