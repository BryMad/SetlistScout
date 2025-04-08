// src/pages/Home.jsx
import React from "react";
import { Box, Grid, GridItem, useBreakpointValue } from "@chakra-ui/react";
import UserInput from "../components/UserInput";
import TracksHUD from "../components/TracksHUD";

/**
 * Home page component
 * - Main landing page with artist search and track display
 */
export default function Home() {
  // Responsive column layout
  const columns = useBreakpointValue({
    base: "1fr",
    lg: "minmax(300px, 1fr) minmax(300px, 2fr)", // Changed from md to lg for better mobile layout
  });

  return (
    <Grid templateColumns={columns} gap={6} width="100%" maxWidth="100%">
      <GridItem width="100%">
        <Box
          py={{ base: 4, md: 4 }}
          px={{ base: 2, md: 4 }}
          width="100%"
          mb={{ base: 2, md: 0 }}
        >
          <UserInput />
        </Box>
      </GridItem>
      <GridItem width="100%">
        <Box p={{ base: 2, md: 4 }} width="100%">
          <TracksHUD />
        </Box>
      </GridItem>
    </Grid>
  );
}
