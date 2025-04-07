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
  process.env.NODE_ENV === "production"
    ? "" // Empty string means use relative URLs like '/api/endpoint'
    : "http://localhost:3000"; // For local development

function App() {
  return (
    <ChakraProvider theme={theme}>
      <AuthProvider>
        <SetlistProvider>
          <Router>
            <NavBar />
            <MainLayout>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
              </Routes>
            </MainLayout>
          </Router>
        </SetlistProvider>
      </AuthProvider>
    </ChakraProvider>
  );
}

export default App;
