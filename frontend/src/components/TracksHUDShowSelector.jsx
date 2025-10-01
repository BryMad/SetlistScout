import React from "react";
import {
  Box,
  Button,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
} from "@chakra-ui/react";
import { ChevronDownIcon } from "@chakra-ui/icons";

export default function TracksHUDShowSelector({
  shows,
  selectedShow,
  onShowSelect,
  formatShowDisplay,
}) {
  const hasShows = shows && shows.length > 0;

  return (
    <Box mb={6} width="full" maxW="600px" mx="auto">
      <Menu>
        <MenuButton
          as={Button}
          rightIcon={<ChevronDownIcon />}
          width="full"
          textAlign="left"
          justifyContent="space-between"
          bg="gray.800"
          color="gray.100"
          borderColor="gray.600"
          border="1px solid"
          _hover={{
            borderColor: "gray.500",
            bg: "gray.700",
          }}
          _active={{
            borderColor: "brand.300",
            bg: "gray.800",
          }}
          _focus={{
            borderColor: "brand.300",
            boxShadow: "0 0 0 1px var(--chakra-colors-brand-300)",
          }}
          isDisabled={!hasShows}
          fontWeight="normal"
          fontSize="md"
          h="40px"
        >
          {selectedShow
            ? formatShowDisplay(selectedShow)
            : hasShows
            ? `Select a show (${shows.length} available)`
            : "No shows available"}
        </MenuButton>
        <MenuList
          bg="gray.800"
          borderColor="gray.600"
          maxH="300px"
          overflowY="auto"
        >
          {shows.map((show) => (
            <MenuItem
              key={show.id}
              onClick={() => onShowSelect(show.id)}
              bg="gray.800"
              color="gray.100"
              _hover={{ bg: "gray.700" }}
              _focus={{ bg: "gray.700" }}
              fontSize="sm"
            >
              {formatShowDisplay(show)}
            </MenuItem>
          ))}
        </MenuList>
      </Menu>
    </Box>
  );
}
