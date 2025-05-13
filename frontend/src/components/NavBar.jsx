// File: ./frontend/src/components/NavBar.jsx
import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Box,
  Flex,
  Spacer,
  Button,
  Text,
  useColorModeValue,
  Stack,
  IconButton,
  Collapse,
  useDisclosure,
} from "@chakra-ui/react";
import { HamburgerIcon, CloseIcon } from "@chakra-ui/icons";
import { useAuth } from "../hooks/useAuth";
import { getFromLocalStorage } from "../utils/storage";
import ConsentModal from "./ConsentModal";

export default function NavBar() {
  const { isOpen, onToggle } = useDisclosure();
  const { isLoggedIn, login, logout } = useAuth();
  const location = useLocation();
  const bgColor = useColorModeValue("gray.800", "gray.900");
  const textColor = useColorModeValue("white", "gray.200");

  // Add state for consent modal
  const [isConsentModalOpen, setIsConsentModalOpen] = useState(false);

  // Handle login click
  const handleLoginClick = (e) => {
    e.preventDefault();
    if (isLoggedIn) {
      logout();
    } else {
      const hasConsented = getFromLocalStorage("setlistScoutConsent");
      if (hasConsented) {
        login();
      } else {
        setIsConsentModalOpen(true);
      }
    }
  };

  // Handle consent modal close
  const handleConsentModalClose = () => {
    setIsConsentModalOpen(false);

    const hasConsented = getFromLocalStorage("setlistScoutConsent");
    if (hasConsented) {
      login();
    }
  };

  return (
    <Box>
      {/* Add the ConsentModal here */}
      <ConsentModal
        isOpen={isConsentModalOpen}
        onClose={handleConsentModalClose}
      />

      <Flex
        bg={bgColor}
        color={textColor}
        height="70px"
        py={{ base: 4 }}
        px={{ base: 4 }}
        align={"center"}
      >
        {/* App title - left-aligned on all screen sizes */}
        <Flex flex={{ base: 1, md: "auto" }} justify="start">
          <Text
            fontFamily="heading" // This will use Bebas Neue from the theme
            fontSize="5xl" // Make it slightly larger to match the Bebas Neue style
            letterSpacing="1px" // Optional: adds a bit of spacing for Bebas Neue
            color="teal.400"
            mt={8}
            ml={4}
            as={Link}
            to="/"
          >
            Setlist Scout
          </Text>
        </Flex>

        {/* Right-aligned hamburger menu for mobile */}
        <Flex
          display={{ base: "flex", md: "none" }}
          position="absolute"
          right="4"
          top="3"
        >
          <IconButton
            onClick={onToggle}
            icon={
              isOpen ? <CloseIcon w={3} h={3} /> : <HamburgerIcon w={5} h={5} />
            }
            variant={"ghost"}
            aria-label={"Toggle Navigation"}
          />
        </Flex>

        {/* Right-aligned menu items for desktop */}
        <Stack
          direction={"row"}
          spacing={4}
          display={{ base: "none", md: "flex" }}
          align="center"
          mr={4}
        >
          {/* Navigation Links */}
          <DesktopNav location={location} />

          {/* Login/Logout Button - Update to use the new handler */}
          <Box>
            <Link to="#" onClick={handleLoginClick}>
              <Box
                p={2}
                fontSize={"md"}
                fontWeight={500}
                color={"white"}
                _hover={{
                  textDecoration: "none",
                  color: "teal.400",
                }}
              >
                {isLoggedIn ? "Logout" : "Login"}
              </Box>
            </Link>
          </Box>
        </Stack>
      </Flex>
      <Collapse in={isOpen} animateOpacity>
        <MobileNav
          location={location}
          isLoggedIn={isLoggedIn}
          handleLogin={handleLoginClick}
          logout={logout}
        />
      </Collapse>
    </Box>
  );
}

const DesktopNav = ({ location }) => {
  const linkColor = "white";
  const linkHoverColor = "teal.400";
  const activeColor = "teal.400";

  return (
    <Stack direction={"row"} spacing={4}>
      {NAV_ITEMS.map((navItem) => {
        const isActive = location.pathname === navItem.href;
        return (
          <Box key={navItem.label}>
            <Link to={navItem.href}>
              <Box
                p={2}
                fontSize={"md"}
                fontWeight={500}
                color={isActive ? activeColor : linkColor}
                _hover={{
                  textDecoration: "none",
                  color: linkHoverColor,
                }}
              >
                {navItem.label}
              </Box>
            </Link>
          </Box>
        );
      })}
    </Stack>
  );
};

const MobileNav = ({ location, isLoggedIn, handleLogin, logout }) => {
  return (
    <Stack bg={"gray.800"} p={4} display={{ md: "none" }}>
      {NAV_ITEMS.map((navItem) => (
        <MobileNavItem
          key={navItem.label}
          {...navItem}
          isActive={location.pathname === navItem.href}
        />
      ))}
      <Flex
        py={2}
        as={Link}
        to={"#"}
        justify={"space-between"}
        align={"center"}
        _hover={{
          textDecoration: "none",
        }}
        onClick={handleLogin} // Use the new handler function
      >
        <Text fontWeight={600} color={"white"}>
          {isLoggedIn ? "Logout" : "Login"}
        </Text>
      </Flex>
    </Stack>
  );
};

const MobileNavItem = ({ label, href, isActive }) => {
  const color = isActive ? "teal.400" : "white";

  return (
    <Stack spacing={4}>
      <Flex
        py={2}
        as={Link}
        to={href}
        justify={"space-between"}
        align={"center"}
        _hover={{
          textDecoration: "none",
        }}
      >
        <Text fontWeight={600} color={color}>
          {label}
        </Text>
      </Flex>
    </Stack>
  );
};

// Updated NAV_ITEMS to include single Legal link
const NAV_ITEMS = [
  {
    label: "Home",
    href: "/",
  },
  {
    label: "About",
    href: "/about",
  },
  {
    label: "Privacy/Terms",
    href: "/legal",
  },
];
