import React from "react";
import { Box, Heading, Text, VStack, Link, Flex, Icon } from "@chakra-ui/react";
import { EmailIcon } from "@chakra-ui/icons";

export default function Contact() {
  return (
    <Box>
      <VStack spacing={6} align="start">
        <Heading
          as="h1"
          size="xl"
          bgGradient="linear(to-r, teal.400, green.400)"
          bgClip="text"
        >
          Contact Us
        </Heading>

        <Text>
          Have feedback, feature requests, or found a bug? We'd love to hear
          from you!
        </Text>

        <Flex align="center" mt={4}>
          <Icon as={EmailIcon} mr={2} color="teal.400" />
          <Link href="mailto:setlistscout@gmail.com" color="teal.400">
            setlistscout@gmail.com
          </Link>
        </Flex>

        <Text mt={4}>
          Please feel free to reach out with any questions, feature requests,
          bug reports, or general feedback about Setlist Scout. We're constantly
          working to improve the application and your input is valuable to us.
        </Text>

        <Text mt={4}>For technical issues, please include details about:</Text>
        <Box pl={4}>
          <Text>• What browser you're using</Text>
          <Text>• What you were trying to do</Text>
          <Text>• Any error messages you received</Text>
        </Box>
      </VStack>
    </Box>
  );
}
