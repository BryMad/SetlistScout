import React from "react";
import {
  Box,
  Flex,
  HStack,
  Button,
  Text,
  useDisclosure,
  IconButton,
  Collapse,
  VStack,
} from "@chakra-ui/react";
import { HamburgerIcon, CloseIcon } from "@chakra-ui/icons";

export default function Navbar({
  isLoggedIn,
  handleLogout,
  handleLogin,
  setRightPanelContent,
  activeNav,
}) {
  const { isOpen, onToggle } = useDisclosure();

  // Use the activeNav prop to determine which tab is highlighted.
  const isActive = (content) => activeNav === content;

  const handleNavClick = (content) => {
    setRightPanelContent(content);
  };

  return (
    <Box as="nav" bg="gray.900" px={4} boxShadow="md">
      <Flex h={16} alignItems="center" justifyContent="space-between">
        <HStack spacing={8} alignItems="center">
          <Text
            fontSize="xl"
            fontWeight="bold"
            bgGradient="linear(to-r, teal.400, green.400)"
            bgClip="text"
            cursor="pointer"
            onClick={() => handleNavClick("tracks")}
          >
            Setlist Scout
          </Text>
        </HStack>
        <Flex alignItems="center">
          <HStack
            as="nav"
            spacing={4}
            display={{ base: "none", md: "flex" }}
            mx={4}
          >
            <Button
              variant={isActive("about") ? "solid" : "ghost"}
              colorScheme="teal"
              _hover={{ color: "teal.400" }}
              onClick={() => handleNavClick("about")}
            >
              About
            </Button>
            <Button
              variant={isActive("contact") ? "solid" : "ghost"}
              colorScheme="teal"
              _hover={{ color: "teal.400" }}
              onClick={() => handleNavClick("contact")}
            >
              Contact
            </Button>
            {isLoggedIn ? (
              <Button colorScheme="teal" onClick={handleLogout}>
                Logout
              </Button>
            ) : (
              <Button colorScheme="teal" onClick={handleLogin}>
                Login
              </Button>
            )}
          </HStack>

          <IconButton
            display={{ base: "flex", md: "none" }}
            onClick={onToggle}
            icon={
              isOpen ? <CloseIcon w={3} h={3} /> : <HamburgerIcon w={5} h={5} />
            }
            variant="ghost"
            aria-label="Toggle Navigation"
          />
        </Flex>
      </Flex>

      <Collapse in={isOpen} animateOpacity>
        <Box pb={4} display={{ md: "none" }}>
          <VStack spacing={4} align="stretch">
            <Button
              variant={isActive("about") ? "solid" : "ghost"}
              justifyContent="flex-start"
              colorScheme="teal"
              _hover={{ color: "teal.400" }}
              onClick={() => {
                handleNavClick("about");
                onToggle();
              }}
            >
              About
            </Button>
            <Button
              variant={isActive("contact") ? "solid" : "ghost"}
              justifyContent="flex-start"
              colorScheme="teal"
              _hover={{ color: "teal.400" }}
              onClick={() => {
                handleNavClick("contact");
                onToggle();
              }}
            >
              Contact
            </Button>
            {isLoggedIn ? (
              <Button
                colorScheme="teal"
                onClick={() => {
                  handleLogout();
                  onToggle();
                }}
              >
                Logout
              </Button>
            ) : (
              <Button
                colorScheme="teal"
                onClick={() => {
                  handleLogin();
                  onToggle();
                }}
              >
                Login
              </Button>
            )}
          </VStack>
        </Box>
      </Collapse>
    </Box>
  );
}
