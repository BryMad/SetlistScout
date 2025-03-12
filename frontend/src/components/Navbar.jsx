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
  Spacer,
} from "@chakra-ui/react";
import { HamburgerIcon, CloseIcon } from "@chakra-ui/icons";

export default function Navbar({ isLoggedIn, handleLogout, handleLogin }) {
  const { isOpen, onToggle } = useDisclosure();

  return (
    <Box as="nav" bg="gray.900" px={4} boxShadow="md">
      <Flex h={16} alignItems="center" justifyContent="space-between">
        <HStack spacing={8} alignItems="center">
          <Text
            fontSize="xl"
            fontWeight="bold"
            bgGradient="linear(to-r, teal.400, green.400)"
            bgClip="text"
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
            <Button variant="ghost" _hover={{ color: "teal.400" }}>
              About
            </Button>
            <Button variant="ghost" _hover={{ color: "teal.400" }}>
              Contact
            </Button>
            {isLoggedIn ? (
              <Button
                colorScheme="teal"
                variant="outline"
                onClick={handleLogout}
              >
                Logout
              </Button>
            ) : (
              <Button
                colorScheme="teal"
                variant="outline"
                onClick={handleLogin}
              >
                Login
              </Button>
            )}
          </HStack>

          {/* Mobile menu button */}
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

      {/* Mobile menu content */}
      <Collapse in={isOpen} animateOpacity>
        <Box pb={4} display={{ md: "none" }}>
          <VStack spacing={4} align="stretch">
            <Button
              variant="ghost"
              justifyContent="flex-start"
              _hover={{ color: "teal.400" }}
            >
              About
            </Button>
            <Button
              variant="ghost"
              justifyContent="flex-start"
              _hover={{ color: "teal.400" }}
            >
              Contact
            </Button>
            {isLoggedIn ? (
              <Button
                colorScheme="teal"
                variant="outline"
                onClick={handleLogout}
              >
                Logout
              </Button>
            ) : (
              <Button
                colorScheme="teal"
                variant="outline"
                onClick={handleLogin}
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
