// theme.js
import { extendTheme } from "@chakra-ui/react";

const theme = extendTheme({
  config: {
    initialColorMode: "dark",
    useSystemColorMode: false,
  },
  fonts: {
    heading: "'Bebas Neue', sans-serif",
    body: "'Inter', sans-serif",
  },
});

export default theme;