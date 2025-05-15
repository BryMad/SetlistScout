// File: ./src/components/NavBar.jsx
import React from "react";
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
  useToast,
} from "@chakra-ui/react";
import { HamburgerIcon, CloseIcon } from "@chakra-ui/icons";
import { useAuth } from "../hooks/useAuth";
import { getFromLocalStorage } from "../utils/storage";

function NavBar() {
  const { isOpen, onToggle } = useDisclosure();
  const { isLoggedIn, login, logout } = useAuth();
  const location = useLocation();
  const bgColor = useColorModeValue("gray.800", "gray.900");
  const textColor = useColorModeValue("white", "gray.200");
  const toast = useToast();

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
        // Instead of opening the modal directly, show a toast notification
        // The app-level modal will appear naturally on initial load
        toast({
          title: "Consent Required",
          description: "Please accept the Terms & Privacy Policy first",
          status: "info",
          duration: 5000,
          isClosable: true,
        });
      }
    }
  };

  // Check if we should show the link based on consent status
  // For Legal pages, we always show them even without consent
  const shouldShowLink = (href) => {
    const hasConsented = getFromLocalStorage("setlistScoutConsent");
    return hasConsented || href.includes("/legal");
  };

  return (
    <Box>
      <Flex
        bg={bgColor}
        color={textColor}
        minHeight="70px"
        py={{ base: 4 }}
        px={{ base: 0 }} // Changed from px={{ base: 4 }} to remove horizontal padding
        align={"center"} // Changed from flex-start to center for vertical alignment
        width="100%"
      >
        {/* App title - left-aligned on all screen sizes */}
        <Flex flex={{ base: 1 }} ml={0} align="center">
          <Text
            fontFamily="heading"
            fontSize="6xl"
            letterSpacing="1px"
            color="purple.400"
            pt={3}
            pb={2}
            ml={4} // Small margin to prevent it from touching the edge
            as={Link}
            to="/"
            whiteSpace="nowrap" // Prevent text wrapping
          >
            Setlist Scout
          </Text>
          <Spacer />
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

          {/* Login/Logout Button */}
          <Box>
            <Link to="#" onClick={handleLoginClick}>
              <Box
                p={2}
                fontSize={"md"}
                fontWeight={500}
                color={"white"}
                _hover={{
                  textDecoration: "none",
                  color: "purple.600",
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
  const linkHoverColor = "purple.600";
  const activeColor = "purple.400";

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
        onClick={handleLogin}
      >
        <Text fontWeight={600} color={"white"}>
          {isLoggedIn ? "Logout" : "Login"}
        </Text>
      </Flex>
    </Stack>
  );
};

// Updated NAV_ITEMS - no change, just for completeness
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

export default NavBar;
