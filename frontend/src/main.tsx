import { createRoot } from "react-dom/client";
import { ApolloProvider } from '@apollo/client';
import App from "./App.tsx";
import "./index.css";
import { apolloClient } from "./lib/apolloClient";

createRoot(document.getElementById("root")!).render(
  <ApolloProvider client={apolloClient}>
    <App />
  </ApolloProvider>
);
