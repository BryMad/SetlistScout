// File: ./src/App.jsx
import React, { useState, useEffect } from "react";
import { ChakraProvider } from "@chakra-ui/react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import theme from "./theme";
import "./App.css";
import NavBar from "./components/NavBar";
import MainLayout from "./layouts/MainLayout";
import Home from "./pages/Home";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Legal from "./pages/Legal";
import ConsentModal from "./components/ConsentModal";
import { AuthProvider } from "./context/AuthContext";
import { SetlistProvider } from "./context/SetlistContext";
import { getFromLocalStorage } from "./utils/storage";

export const server_url =
  process.env.NODE_ENV === "production"
    ? "" // Empty string means use relative URLs like '/api/endpoint'
    : "http://localhost:3000"; // For local development

// AppContent component to use location hooks (can't use them directly in App)
function AppContent() {
  const [isConsentModalOpen, setIsConsentModalOpen] = useState(false);
  const location = useLocation();

  // Check for consent on initial load and route changes
  useEffect(() => {
    const hasConsented = getFromLocalStorage("setlistScoutConsent");

    // Only show modal if not on a legal page and not consented
    if (!hasConsented && !location.pathname.includes("/legal")) {
      setIsConsentModalOpen(true);
    } else {
      setIsConsentModalOpen(false);
    }

    // Check if returning from legal page with consent pending
    if (sessionStorage.getItem("returnToConsent") === "true") {
      // Only reopen if not on legal page
      if (!location.pathname.includes("/legal")) {
        sessionStorage.removeItem("returnToConsent");
        setIsConsentModalOpen(true);
      }
    }
  }, [location.pathname]);

  // Handle consent modal close
  const handleConsentModalClose = () => {
    setIsConsentModalOpen(false);
  };

  return (
    <>
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
    </>
  );
}

function App() {
  return (
    <ChakraProvider theme={theme}>
      <AuthProvider>
        <SetlistProvider>
          <Router>
            <AppContent />
          </Router>
        </SetlistProvider>
      </AuthProvider>
    </ChakraProvider>
  );
}

export default App;
