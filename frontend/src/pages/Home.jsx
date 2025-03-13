// src/pages/Home.jsx
import React from "react";
import { Box, Grid, GridItem } from "@chakra-ui/react";
import UserInput from "../components/UserInput";
import TracksHUD from "../components/TracksHUD";

/**
 * Home page component
 * - Main landing page with artist search and track display
 */
export default function Home() {
  return (
    <Grid
      templateColumns={{
        base: "1fr",
        md: "minmax(300px, 1fr) minmax(300px, 2fr)",
      }}
      gap={6}
      width="100%"
    >
      <GridItem>
        <Box p={4}>
          <UserInput />
        </Box>
      </GridItem>
      <GridItem>
        <Box p={4}>
          <TracksHUD />
        </Box>
      </GridItem>
    </Grid>
  );
}
