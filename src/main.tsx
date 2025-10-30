// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import {App} from "./App.tsx";
import "./index.css";
import { ApolloProvider } from "@apollo/client/react";
import { client } from "./api/apolloClient.ts";
import { Toaster } from "@/components/ui/toaster";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ApolloProvider client={client}>
      <App /> {/* The App component now contains the AuthProvider */}
      <Toaster />
    </ApolloProvider>
  </React.StrictMode>
);
