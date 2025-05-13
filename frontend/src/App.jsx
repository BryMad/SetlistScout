// File: ./frontend/src/App.jsx
import React, { useState, useEffect } from "react";
import { ChakraProvider } from "@chakra-ui/react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import theme from "./theme";
import "./App.css";
import NavBar from "./components/NavBar";
import MainLayout from "./layouts/MainLayout";
import Home from "./pages/Home";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Legal from "./pages/Legal";
import ConsentModal from "./components/ConsentModal"; // Import ConsentModal
import { AuthProvider } from "./context/AuthContext";
import { SetlistProvider } from "./context/SetlistContext";
import { getFromLocalStorage } from "./utils/storage"; // Import storage utils

export const server_url =
  process.env.NODE_ENV === "production"
    ? "" // Empty string means use relative URLs like '/api/endpoint'
    : "http://localhost:3000"; // For local development

function App() {
  // State for consent modal visibility
  const [isConsentModalOpen, setIsConsentModalOpen] = useState(false);

  // Check for consent on initial load
  useEffect(() => {
    const hasConsented = getFromLocalStorage("setlistScoutConsent");
    if (!hasConsented) {
      // If no consent found, show the modal
      setIsConsentModalOpen(true);
    }
  }, []);

  // Handle consent modal close
  const handleConsentModalClose = () => {
    setIsConsentModalOpen(false);
  };

  return (
    <ChakraProvider theme={theme}>
      <AuthProvider>
        <SetlistProvider>
          <Router>
            <NavBar />
            <MainLayout>
              {/* Add ConsentModal at the app level */}
              <ConsentModal
                isOpen={isConsentModalOpen}
                onClose={handleConsentModalClose}
              />
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/legal" element={<Legal />} />
              </Routes>
            </MainLayout>
          </Router>
        </SetlistProvider>
      </AuthProvider>
    </ChakraProvider>
  );
}

export default App;
