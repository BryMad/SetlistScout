// src/App.jsx
import React from "react";
import { ChakraProvider } from "@chakra-ui/react";
import theme from "./theme";
import "./App.css";
import MainLayout from "./layouts/MainLayout";
import Home from "./pages/Home";
import { AuthProvider } from "./context/AuthContext";
import { SetlistProvider } from "./context/SetlistContext";

export const server_url =
  import.meta.env.VITE_SERVER_URL || "http://localhost:3000";

function App() {
  return (
    <ChakraProvider theme={theme}>
      <AuthProvider>
        <SetlistProvider>
          <MainLayout>
            <Home />
          </MainLayout>
        </SetlistProvider>
      </AuthProvider>
    </ChakraProvider>
  );
}

export default App;
