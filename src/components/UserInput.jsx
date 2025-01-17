import React from "react";
import {
  Button,
  Flex,
  Input,
  Box,
  VStack,
  Text,
  Spinner,
} from "@chakra-ui/react";

export default function UserInput({
  userInput,
  setUserInput,
  loading,
  fetchSetlists,
}) {
  return (
    <Box display="flex" flexDirection="column" alignItems="center" mt={8}>
      <Flex width="100%" alignItems="center">
        <Input
          onChange={(e) => setUserInput(e.target.value)}
          value={userInput}
          w={["100%", "50%"]}
          placeholder="Enter your setlist.fm URL"
          size="lg"
          variant="outline"
        />
        <Button
          isDisabled={loading || !userInput}
          size="md"
          colorScheme="blue"
          onClick={fetchSetlists}
        >
          Get Songs
        </Button>
      </Flex>
    </Box>
  );
}
