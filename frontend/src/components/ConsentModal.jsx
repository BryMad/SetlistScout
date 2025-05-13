// File: ./frontend/src/components/ConsentModal.jsx
import React, { useState } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  Text,
  VStack,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Box,
  Checkbox,
  Link,
  Flex,
  useToast,
} from "@chakra-ui/react";
import { ExternalLinkIcon } from "@chakra-ui/icons";
import { Link as RouterLink } from "react-router-dom";
import { getFromLocalStorage, saveToLocalStorage } from "../utils/storage";
import { logConsent } from "../api/consentService";

/**
 * Consent Modal Component
 * - Displays End User Agreement and Privacy Policy
 * - Requires user consent before using Spotify features
 * - Stores consent in localStorage and on server
 */
const ConsentModal = ({ isOpen, onClose }) => {
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  // Handle user consent
  const handleConsent = async () => {
    if (agreedToTerms && agreedToPrivacy) {
      setIsSubmitting(true);

      // Create consent data record
      const consentData = {
        consented: true,
        agreedToTerms: true,
        agreedToPrivacy: true,
        date: new Date().toISOString(),
      };

      try {
        // Log consent to server
        const result = await logConsent(consentData);

        // Save to localStorage with server consentId if available
        if (result.success) {
          saveToLocalStorage("setlistScoutConsent", {
            ...consentData,
            consentId: result.consentId,
          });
        } else {
          // Fall back to localStorage only if server logging failed
          saveToLocalStorage("setlistScoutConsent", consentData);

          // Show silent warning but don't block the user
          console.warn(
            "Server consent logging failed, using localStorage only"
          );
        }

        // Call the provided onClose function
        onClose();
      } catch (error) {
        console.error("Error during consent logging:", error);

        // Fall back to localStorage only in case of error
        saveToLocalStorage("setlistScoutConsent", consentData);

        toast({
          title: "Note",
          description:
            "Your consent was saved locally. Some features may require reconnecting later.",
          status: "info",
          duration: 5000,
          isClosable: true,
        });

        // Call the provided onClose function
        onClose();
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}} // Prevent closing by clicking outside
      closeOnOverlayClick={false}
      closeOnEsc={false}
      size="xl"
      scrollBehavior="inside"
    >
      <ModalOverlay />
      <ModalContent>
        <ModalHeader borderBottom="1px" borderColor="gray.200">
          Welcome to Setlist Scout
        </ModalHeader>

        <ModalBody py={4}>
          <VStack spacing={4} align="stretch">
            <Text>
              Before you can use our service, we need your consent to our End
              User Agreement and Privacy Policy. These agreements include
              important information about how we interact with Spotify's API on
              your behalf.
            </Text>

            <Tabs variant="enclosed" colorScheme="teal">
              <TabList>
                <Tab>End User Agreement</Tab>
                <Tab>Privacy Policy</Tab>
              </TabList>

              <TabPanels>
                <TabPanel maxH="300px" overflowY="auto">
                  <Box p={2}>
                    <Text fontWeight="bold" mb={2}>
                      End User Agreement (Summary)
                    </Text>
                    <Text mb={2}>
                      By using Setlist Scout, you agree to this End User
                      Agreement. Key points include:
                    </Text>
                    <VStack align="stretch" spacing={2} mb={4}>
                      <Text>
                        • Setlist Scout accesses Spotify data with your
                        permission
                      </Text>
                      <Text>
                        • We request the "playlist-modify-public" scope to
                        create playlists on your behalf
                      </Text>
                      <Text>
                        • Spotify is a third-party beneficiary of this agreement
                      </Text>
                      <Text>
                        • Setlist Scout is solely responsible for its services
                      </Text>
                      <Text>
                        • You agree not to modify or reverse-engineer Spotify
                        content
                      </Text>
                      <Text>
                        • You are responsible for maintaining account security
                      </Text>
                      <Text>
                        • Logging out will remove your data from our system
                      </Text>
                    </VStack>
                    <RouterLink to="/legal" target="_blank">
                      <Button
                        rightIcon={<ExternalLinkIcon />}
                        colorScheme="teal"
                        variant="outline"
                        size="sm"
                      >
                        Read full agreement
                      </Button>
                    </RouterLink>
                  </Box>
                </TabPanel>

                <TabPanel maxH="300px" overflowY="auto">
                  <Box p={2}>
                    <Text fontWeight="bold" mb={2}>
                      Privacy Policy (Summary)
                    </Text>
                    <Text mb={2}>
                      We value your privacy. Our Privacy Policy explains how we
                      handle your data:
                    </Text>
                    <VStack align="stretch" spacing={2} mb={4}>
                      <Text>
                        • We store only the minimum data needed (Spotify User
                        ID, access tokens)
                      </Text>
                      <Text>
                        • We request only the "playlist-modify-public" scope to
                        create playlists on your behalf
                      </Text>
                      <Text>
                        • Authentication data is stored in encrypted sessions
                        that expire after 24 hours
                      </Text>
                      <Text>
                        • We use a session cookie to maintain your login state
                      </Text>
                      <Text>
                        • Logging out will disconnect your Spotify account and
                        remove your data from our systems
                      </Text>
                      <Text>
                        • We do not analyze your listening habits or store
                        search history
                      </Text>
                    </VStack>
                    <RouterLink to="/legal?tab=1" target="_blank">
                      <Button
                        rightIcon={<ExternalLinkIcon />}
                        colorScheme="teal"
                        variant="outline"
                        size="sm"
                      >
                        Read full policy
                      </Button>
                    </RouterLink>
                  </Box>
                </TabPanel>
              </TabPanels>
            </Tabs>

            <Box mt={2}>
              <Flex mb={2}>
                <Checkbox
                  colorScheme="teal"
                  isChecked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  mr={2}
                />
                <Text>
                  I agree to the{" "}
                  <Link
                    as={RouterLink}
                    to="/legal"
                    color="teal.500"
                    target="_blank"
                  >
                    End User Agreement
                  </Link>
                </Text>
              </Flex>
              <Flex>
                <Checkbox
                  colorScheme="teal"
                  isChecked={agreedToPrivacy}
                  onChange={(e) => setAgreedToPrivacy(e.target.checked)}
                  mr={2}
                />
                <Text>
                  I agree to the{" "}
                  <Link
                    as={RouterLink}
                    to="/legal?tab=1"
                    color="teal.500"
                    target="_blank"
                  >
                    Privacy Policy
                  </Link>
                </Text>
              </Flex>
            </Box>

            <Text fontSize="sm" color="gray.500">
              Spotify is a third-party beneficiary of these agreements and is
              entitled to enforce their terms.
            </Text>
          </VStack>
        </ModalBody>

        <ModalFooter borderTop="1px" borderColor="gray.200">
          <Button
            colorScheme="teal"
            onClick={handleConsent}
            isDisabled={!agreedToTerms || !agreedToPrivacy || isSubmitting}
            isLoading={isSubmitting}
            loadingText="Saving..."
          >
            I Accept
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ConsentModal;
