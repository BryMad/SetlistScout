// src/pages/Home.jsx
import React from "react";
import { Box } from "@chakra-ui/react";
import UserInput from "../components/UserInput";
import TracksHUD from "../components/TracksHUD";

/**
 * Home page component
 * - Main landing page with artist search and track display
 */
export default function Home() {
  return (
    <>
      <Box p={4}>
        <UserInput />
      </Box>
      <Box p={4}>
        <TracksHUD />
      </Box>
    </>
  );
}
