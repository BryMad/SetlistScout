import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Heading,
  Text,
  Link,
  VStack,
  Alert,
  AlertIcon,
  Code,
  useClipboard,
  Input,
  FormControl,
  FormLabel,
  Spinner,
  useToast,
} from "@chakra-ui/react";
import { ExternalLinkIcon, CopyIcon, CheckIcon } from "@chakra-ui/icons";
import { server_url } from "../App";

/**
 * Component for admin setup process
 * - Used for initial Spotify authorization
 * - Only shown to admins, not regular users
 */
export default function AdminSetup() {
  const [loading, setLoading] = useState(true);
  const [adminStatus, setAdminStatus] = useState(null);
  const [setupUrl, setSetupUrl] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);
  const toast = useToast();

  const { hasCopied, onCopy } = useClipboard(setupUrl);

  // Check admin status on mount
  useEffect(() => {
    const checkStatus = async () => {
      try {
        setLoading(true);
        setError("");

        console.log(`Checking admin status at: ${server_url}/admin/status`);
        const response = await fetch(`${server_url}/admin/status`, {
          method: "GET",
          credentials: "include",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(
            `Server returned ${response.status}: ${response.statusText}`
          );
        }

        const data = await response.json();
        console.log("Admin status response:", data);
        setAdminStatus(data);
        setLoading(false);
      } catch (error) {
        console.error("Error checking admin status:", error);
        setError(`Failed to check admin status: ${error.message}`);
        setLoading(false);

        toast({
          title: "Connection Error",
          description: `Could not connect to the server: ${error.message}`,
          status: "error",
          duration: 9000,
          isClosable: true,
        });
      }
    };

    checkStatus();
  }, [toast]);

  // Function to initiate admin setup
  const initiateSetup = async () => {
    try {
      setLoading(true);
      setError("");
      setSetupUrl("");

      console.log(`Initiating setup at: ${server_url}/admin/setup`);
      const response = await fetch(`${server_url}/admin/setup`, {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Setup error response:", errorText);
        throw new Error(
          `Server returned ${response.status}: ${response.statusText}`
        );
      }

      const data = await response.json();
      console.log("Setup response:", data);

      if (data.authUrl) {
        setSetupUrl(data.authUrl);

        toast({
          title: "Setup URL Generated",
          description: "Authorization URL has been generated successfully.",
          status: "success",
          duration: 5000,
          isClosable: true,
        });
      } else {
        setError(data.error || "Failed to get setup URL");
      }

      setLoading(false);
    } catch (error) {
      console.error("Error initiating setup:", error);
      setError(`Failed to initiate setup process: ${error.message}`);
      setLoading(false);

      toast({
        title: "Setup Failed",
        description: `Could not initiate setup: ${error.message}`,
        status: "error",
        duration: 9000,
        isClosable: true,
      });
    }
  };

  // Function to reset admin credentials
  const resetAdmin = async () => {
    try {
      if (!password) {
        setError("Admin password is required");
        return;
      }

      setLoading(true);
      setError("");
      setResetSuccess(false);

      console.log(`Resetting admin at: ${server_url}/admin/reset`);
      const response = await fetch(`${server_url}/admin/reset`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ adminPassword: password }),
        credentials: "include",
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Reset error response:", errorText);
        throw new Error(
          `Server returned ${response.status}: ${response.statusText}`
        );
      }

      const data = await response.json();
      console.log("Reset response:", data);

      if (data.success) {
        setResetSuccess(true);
        setSetupUrl("");
        setPassword("");

        toast({
          title: "Reset Successful",
          description:
            "Admin credentials have been reset. You'll need to run setup again.",
          status: "success",
          duration: 5000,
          isClosable: true,
        });

        // Update admin status
        const statusResponse = await fetch(`${server_url}/admin/status`, {
          method: "GET",
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
        });

        if (statusResponse.ok) {
          const status = await statusResponse.json();
          setAdminStatus(status);
        }
      } else {
        setError(data.error || "Failed to reset admin credentials");
      }

      setLoading(false);
    } catch (error) {
      console.error("Error resetting admin:", error);
      setError(`Failed to reset admin credentials: ${error.message}`);
      setLoading(false);

      toast({
        title: "Reset Failed",
        description: `Could not reset admin credentials: ${error.message}`,
        status: "error",
        duration: 9000,
        isClosable: true,
      });
    }
  };

  // Shows connection diagnostic information
  const showDiagnostics = () => {
    console.log("=== CONNECTION DIAGNOSTICS ===");
    console.log("server_url:", server_url);
    console.log("Current URL:", window.location.href);
    console.log("Current origin:", window.location.origin);
    console.log("Admin setup endpoint:", `${server_url}/admin/status`);
    console.log("User agent:", navigator.userAgent);

    toast({
      title: "Diagnostics Info",
      description: "Connection information logged to console.",
      status: "info",
      duration: 3000,
      isClosable: true,
    });
  };

  if (loading && !adminStatus) {
    return (
      <Box textAlign="center" py={10}>
        <Spinner size="xl" mb={4} />
        <Text>Loading admin status...</Text>
        <Button mt={4} colorScheme="blue" onClick={showDiagnostics} size="sm">
          Show Diagnostics
        </Button>
      </Box>
    );
  }

  return (
    <Box maxW="600px" mx="auto" p={5}>
      <VStack spacing={5} align="start">
        <Heading as="h1" size="xl">
          Spotify Admin Setup
        </Heading>

        {error && (
          <Alert status="error">
            <AlertIcon />
            {error}
          </Alert>
        )}

        {resetSuccess && (
          <Alert status="success">
            <AlertIcon />
            Admin credentials reset successfully!
          </Alert>
        )}

        <Box w="100%" p={4} borderWidth="1px" borderRadius="md">
          <VStack align="start" spacing={3}>
            <Heading as="h2" size="md">
              Current Status
            </Heading>
            <Text>
              Admin setup is:{" "}
              <strong>{adminStatus?.isSetup ? "Complete" : "Required"}</strong>
            </Text>
            {adminStatus?.isSetup ? (
              <Alert status="success" variant="subtle">
                <AlertIcon />
                Your Spotify admin account is properly configured! Users can
                create playlists.
              </Alert>
            ) : (
              <Alert status="warning" variant="subtle">
                <AlertIcon />
                Admin setup is required for playlist creation to work.
              </Alert>
            )}
          </VStack>
        </Box>

        {!adminStatus?.isSetup && (
          <Box w="100%" p={4} borderWidth="1px" borderRadius="md">
            <VStack align="start" spacing={3}>
              <Heading as="h2" size="md">
                Setup Process
              </Heading>
              <Text>
                This is a one-time process where you'll authorize the
                application to use your Spotify account.
              </Text>
              <Button
                colorScheme="teal"
                isLoading={loading}
                onClick={initiateSetup}
              >
                Start Setup Process
              </Button>

              {setupUrl && (
                <VStack align="start" spacing={3} w="100%">
                  <Text fontWeight="bold">Setup URL:</Text>
                  <Box position="relative" w="100%">
                    <Code p={2} borderRadius="md" w="100%" overflowX="auto">
                      {setupUrl}
                    </Code>
                    <Button
                      position="absolute"
                      right="2"
                      top="2"
                      size="sm"
                      onClick={onCopy}
                    >
                      {hasCopied ? <CheckIcon /> : <CopyIcon />}
                    </Button>
                  </Box>
                  <Button
                    colorScheme="green"
                    rightIcon={<ExternalLinkIcon />}
                    as={Link}
                    href={setupUrl}
                    isExternal
                  >
                    Open Authorization URL
                  </Button>
                  <Text fontSize="sm">
                    Click the button above to authorize with your Spotify
                    account. After authorizing, you'll be redirected back to
                    complete the setup.
                  </Text>
                </VStack>
              )}
            </VStack>
          </Box>
        )}

        {/* Admin Reset Section */}
        <Box w="100%" p={4} borderWidth="1px" borderRadius="md" mt={4}>
          <VStack align="start" spacing={3}>
            <Heading as="h2" size="md">
              Reset Admin Credentials
            </Heading>
            <Text>
              If you need to change the Spotify account used for playlist
              creation, you can reset the admin credentials here.
            </Text>
            <FormControl>
              <FormLabel>Admin Password</FormLabel>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
              />
            </FormControl>
            <Button colorScheme="red" isLoading={loading} onClick={resetAdmin}>
              Reset Admin Credentials
            </Button>
          </VStack>
        </Box>

        {/* Diagnostic Button */}
        <Button size="sm" colorScheme="gray" onClick={showDiagnostics} mt={2}>
          Run Connection Diagnostics
        </Button>
      </VStack>
    </Box>
  );
}
