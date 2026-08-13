import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import App from "./App";
import ErrorBoundary from "./components/common/ErrorBoundary";
import "./styles/globals.css";
import "./styles/components.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
    mutations: { retry: false },
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary><BrowserRouter><QueryClientProvider client={queryClient}><App /></QueryClientProvider></BrowserRouter></ErrorBoundary>
  </React.StrictMode>,
);
