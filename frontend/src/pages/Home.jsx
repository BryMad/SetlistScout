// src/pages/Home.jsx
import React from "react";
import { Box, SimpleGrid } from "@chakra-ui/react";
import UserInput from "../components/UserInput";
import TracksHUD from "../components/TracksHUD";

/**
 * Home page component
 * - Main landing page with artist search and track display
 */
export default function Home() {
  return (
    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
      <Box p={4}>
        <UserInput />
      </Box>
      <Box p={4}>
        <TracksHUD />
      </Box>
    </SimpleGrid>
  );
}
