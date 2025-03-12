// src/pages/Contact.jsx
import React from "react";
import {
  Box,
  Heading,
  Text,
  VStack,
  Link,
  Flex,
  Icon,
  Container,
} from "@chakra-ui/react";
import { EmailIcon } from "@chakra-ui/icons";

export default function Contact() {
  return (
    <Container maxW="container.md" mt={8}>
      <VStack spacing={6} align="start">
        <Heading as="h1" size="xl" color="teal.400">
          Contact
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

        <Text mt={4}>For technical issues, please include details about:</Text>
        <Box pl={4}>
          <Text>• your browser</Text>
          <Text>• what artist you were searching for</Text>
          <Text>• any error messages you received</Text>
        </Box>
      </VStack>
    </Container>
  );
}
