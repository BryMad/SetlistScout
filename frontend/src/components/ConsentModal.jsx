// File: ./src/components/ConsentModal.jsx
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
  useBreakpointValue,
} from "@chakra-ui/react";
import { ExternalLinkIcon } from "@chakra-ui/icons";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { getFromLocalStorage, saveToLocalStorage } from "../utils/storage";
import { logConsent } from "../api/consentService";

/**
 * Consent Modal Component
 * - Displays End User Agreement and Privacy Policy
 * - Requires user consent before using Spotify features
 * - Allows viewing full legal documents before consenting
 * - Stores consent in localStorage and on server
 */
const ConsentModal = ({ isOpen, onClose }) => {
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  // Responsive max height - smaller on mobile to ensure checkboxes are visible
  const tabPanelMaxHeight = useBreakpointValue({
    base: "150px", // Mobile: much smaller to leave room for checkboxes
    sm: "200px", // Small tablets: slightly larger
    md: "250px", // Medium screens: more space
    lg: "300px", // Desktop: full height
  });

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

  // Handle clicking on legal links - temporarily close modal
  const handleLegalLinkClick = (path) => {
    // Save modal state to reopen it when returning from legal pages
    sessionStorage.setItem("returnToConsent", "true");

    // Temporarily close the modal
    onClose();

    // Navigate to the legal page
    navigate(path);
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
              Please consent to our End User Agreement and Privacy Policy. These
              agreements explain how we interact with Spotify's API on your
              behalf.
            </Text>

            <Tabs variant="enclosed" colorScheme="teal">
              <TabList>
                <Tab>End User Agreement</Tab>
                <Tab>Privacy Policy</Tab>
              </TabList>

              <TabPanels>
                <TabPanel maxH={tabPanelMaxHeight} overflowY="auto">
                  <Box p={2}>
                    <Text fontWeight="bold" mb={2}>
                      End User Agreement (Summary)
                    </Text>
                    <Text mb={2} fontSize="sm">
                      By using Setlist Scout, you agree to this End User
                      Agreement. Key points include:
                    </Text>
                    <VStack align="stretch" spacing={1} mb={4}>
                      <Text fontSize="sm">
                        • Setlist Scout accesses Spotify data with your
                        permission
                      </Text>
                      <Text fontSize="sm">
                        • We request the "playlist-modify-public" scope to
                        create playlists on your behalf
                      </Text>
                      <Text fontSize="sm">
                        • Spotify is a third-party beneficiary of this agreement
                      </Text>
                      <Text fontSize="sm">
                        • Setlist Scout is solely responsible for its services
                      </Text>
                      <Text fontSize="sm">
                        • You agree not to modify or reverse-engineer Spotify
                        content
                      </Text>
                      <Text fontSize="sm">
                        • You are responsible for maintaining account security
                      </Text>
                      <Text fontSize="sm">
                        • Logging out will remove your data from our system
                      </Text>
                    </VStack>
                    <Button
                      rightIcon={<ExternalLinkIcon />}
                      colorScheme="teal"
                      variant="outline"
                      size="sm"
                      onClick={() => handleLegalLinkClick("/legal")}
                    >
                      Read full agreement
                    </Button>
                  </Box>
                </TabPanel>

                <TabPanel maxH={tabPanelMaxHeight} overflowY="auto">
                  <Box p={2}>
                    <Text fontWeight="bold" mb={2}>
                      Privacy Policy (Summary)
                    </Text>
                    <Text mb={2} fontSize="sm">
                      We value your privacy. Our Privacy Policy explains how we
                      handle your data:
                    </Text>
                    <VStack align="stretch" spacing={1} mb={4}>
                      <Text fontSize="sm">
                        • We store only the minimum data needed (Spotify User
                        ID, access tokens)
                      </Text>
                      <Text fontSize="sm">
                        • We request only the "playlist-modify-public" scope to
                        create playlists on your behalf
                      </Text>
                      <Text fontSize="sm">
                        • Authentication data is stored in encrypted sessions
                        that expire after 24 hours
                      </Text>
                      <Text fontSize="sm">
                        • We use a session cookie to maintain your login state
                      </Text>
                      <Text fontSize="sm">
                        • Logging out will disconnect your Spotify account and
                        remove your data from our systems
                      </Text>
                      <Text fontSize="sm">
                        • We do not analyze your listening habits or store
                        search history
                      </Text>
                    </VStack>
                    <Button
                      rightIcon={<ExternalLinkIcon />}
                      colorScheme="teal"
                      variant="outline"
                      size="sm"
                      onClick={() => handleLegalLinkClick("/legal?tab=1")}
                    >
                      Read full policy
                    </Button>
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
                    as="span"
                    color="teal.500"
                    onClick={() => handleLegalLinkClick("/legal")}
                    cursor="pointer"
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
                    as="span"
                    color="teal.500"
                    onClick={() => handleLegalLinkClick("/legal?tab=1")}
                    cursor="pointer"
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
