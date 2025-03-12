// src/App.jsx
import React from "react";
import { ChakraProvider } from "@chakra-ui/react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import theme from "./theme";
import "./App.css";
import NavBar from "./components/NavBar";
import MainLayout from "./layouts/MainLayout";
import Home from "./pages/Home";
import About from "./pages/About";
import Contact from "./pages/Contact";
import { AuthProvider } from "./context/AuthContext";
import { SetlistProvider } from "./context/SetlistContext";

export const server_url =
  import.meta.env.VITE_SERVER_URL || "http://localhost:3000";

function App() {
  return (
    <ChakraProvider theme={theme}>
      <AuthProvider>
        <SetlistProvider>
          <Router>
            <NavBar />
            <Routes>
              <Route
                path="/"
                element={
                  <MainLayout>
                    <Home />
                  </MainLayout>
                }
              />
              <Route
                path="/about"
                element={
                  <MainLayout>
                    <About />
                  </MainLayout>
                }
              />
              <Route
                path="/contact"
                element={
                  <MainLayout>
                    <Contact />
                  </MainLayout>
                }
              />
            </Routes>
          </Router>
        </SetlistProvider>
      </AuthProvider>
    </ChakraProvider>
  );
}

export default App;
