// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ApolloProvider } from "@apollo/client/react";
import { client } from "./api/apolloClient.ts";
import { AuthProvider } from "./context/AuthContext.tsx";
import { Toaster } from "@/components/ui/toaster"; // Import Toaster

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ApolloProvider client={client}>
      <AuthProvider>
        <App />
        <Toaster /> {/* Add Toaster here */}
      </AuthProvider>
    </ApolloProvider>
  </React.StrictMode>
);
