// File: ./frontend/src/pages/Legal.jsx
import React, { useEffect } from "react";
import {
  Box,
  Heading,
  Text,
  Container,
  VStack,
  Link,
  Divider,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
} from "@chakra-ui/react";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import { ExternalLinkIcon } from "@chakra-ui/icons";

/**
 * Combined Legal page component
 * - Displays both End User Agreement and Privacy Policy in tabs
 * - Supports direct linking to specific tab via URL parameter
 */
export default function Legal() {
  const [searchParams] = useSearchParams();
  const tabIndex = parseInt(searchParams.get("tab") || "0");

  return (
    <Container maxW="container.md" mt={8} mb={8}>
      <Heading as="h1" size="xl" color="teal.400" mb={4}>
        Legal Information
      </Heading>
      <Text color="gray.500" mb={6}>
        Effective Date: May 12, 2025
      </Text>

      <Tabs
        variant="enclosed"
        colorScheme="teal"
        isLazy
        defaultIndex={tabIndex}
      >
        <TabList>
          <Tab fontWeight="semibold">Terms of Service</Tab>
          <Tab fontWeight="semibold">Privacy Policy</Tab>
        </TabList>

        <TabPanels>
          {/* TERMS OF SERVICE TAB */}
          <TabPanel>
            <VStack spacing={6} align="start">
              <Heading as="h2" size="lg">
                End User Agreement for Setlist Scout
              </Heading>

              <Divider />

              <Heading as="h2" size="lg">
                Introduction and Acceptance
              </Heading>
              <Text>
                Welcome to Setlist Scout! This End User Agreement ("Agreement")
                is a legally binding contract between you and Setlist Scout
                regarding your use of our service.
              </Text>
              <Text fontWeight="bold">
                By accessing or using Setlist Scout, you agree to be bound by
                this Agreement. If you do not agree to this Agreement, you must
                not access or use our service.
              </Text>
              <Text>
                Setlist Scout is a tool designed to help concert-goers prepare
                for upcoming shows by providing insights into what songs their
                favorite artists are playing on tour.
              </Text>

              <Heading as="h2" size="lg">
                Service Description
              </Heading>
              <Text>Setlist Scout allows you to:</Text>
              <Box pl={4}>
                <Text>• Search for artists and view their recent setlists</Text>
                <Text>
                  • See which songs artists have been playing on tour and their
                  frequency
                </Text>
                <Text>
                  • Create Spotify playlists from these song lists when logged
                  in with Spotify
                </Text>
              </Box>

              <Heading as="h2" size="lg">
                Third-Party Services
              </Heading>
              <Heading as="h3" size="md">
                Spotify Integration
              </Heading>
              <Text>
                Setlist Scout integrates with Spotify's API to provide music
                information and playlist creation capabilities. By using these
                features:
              </Text>
              <Box pl={4}>
                <Text>
                  1. You agree to comply with{" "}
                  <Link
                    href="https://www.spotify.com/us/legal/end-user-agreement/"
                    color="teal.500"
                    isExternal
                  >
                    Spotify's Terms of Use <ExternalLinkIcon mx="2px" />
                  </Link>
                </Text>
                <Text>
                  2. You authorize Setlist Scout to access your Spotify account
                  with the permissions you approve
                </Text>
                <Text>
                  3. You acknowledge that Spotify is a third-party beneficiary
                  of this Agreement and is entitled to directly enforce this
                  Agreement
                </Text>
                <Text>
                  4. You understand that your use of Spotify features is also
                  governed by Spotify's Privacy Policy
                </Text>
              </Box>

              <Heading as="h3" size="md">
                Setlist.fm Integration
              </Heading>
              <Text>
                We use data from Setlist.fm to provide setlist information. Your
                use of our service is also subject to Setlist.fm's terms.
              </Text>

              <Heading as="h2" size="lg">
                User Accounts and Security
              </Heading>
              <Text>When you connect your Spotify account:</Text>
              <Box pl={4}>
                <Text>
                  • You are responsible for maintaining the confidentiality of
                  your credentials
                </Text>
                <Text>
                  • You agree not to share your login information with others
                </Text>
                <Text>
                  • You must notify us of any unauthorized use of your account
                </Text>
              </Box>

              <Heading as="h2" size="lg">
                Data Usage and Privacy
              </Heading>
              <Text>
                Your use of Setlist Scout is also subject to our Privacy Policy,
                which explains how we collect, use, and protect your personal
                information. By using Setlist Scout, you consent to the data
                practices described in the Privacy Policy.
              </Text>

              <Heading as="h2" size="lg">
                User Conduct
              </Heading>
              <Text>When using Setlist Scout, you agree not to:</Text>
              <Box pl={4}>
                <Text>• Violate any applicable laws or regulations</Text>
                <Text>• Interfere with or disrupt the service or servers</Text>
                <Text>
                  • Attempt to gain unauthorized access to any part of the
                  service
                </Text>
                <Text>
                  • Use the service for any commercial purpose without our
                  consent
                </Text>
                <Text>
                  • Engage in any activity that could harm other users or our
                  service
                </Text>
              </Box>

              <Heading as="h2" size="lg">
                Intellectual Property
              </Heading>
              <Text>
                The content, organization, graphics, design, and other matters
                related to Setlist Scout are protected by applicable copyrights
                and other proprietary rights. We respect the intellectual
                property of others and expect users to do the same.
              </Text>

              <Heading as="h2" size="lg">
                Disclaimer of Warranties
              </Heading>
              <Text fontWeight="bold">
                SETLIST SCOUT IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT
                WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. WE DISCLAIM
                ALL WARRANTIES, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY,
                FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT.
              </Text>

              <Heading as="h2" size="lg">
                Limitation of Liability
              </Heading>
              <Text fontWeight="bold">
                TO THE FULLEST EXTENT PERMITTED BY LAW, IN NO EVENT WILL SETLIST
                SCOUT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
                CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING OUT OF OR RELATING TO
                YOUR USE OF THE SERVICE.
              </Text>

              <Heading as="h2" size="lg">
                Termination
              </Heading>
              <Text>
                We may terminate or suspend your access to Setlist Scout at any
                time, without prior notice or liability, for any reason.
              </Text>

              <Heading as="h2" size="lg">
                Changes to this Agreement
              </Heading>
              <Text>
                We may modify this Agreement at any time. If we make material
                changes, we will notify you by email or by posting a notice on
                our website before the changes become effective. Your continued
                use of Setlist Scout after any changes indicates your acceptance
                of the modified Agreement.
              </Text>

              <Heading as="h2" size="lg">
                Governing Law
              </Heading>
              <Text>
                This Agreement shall be governed by the laws of the jurisdiction
                in which Setlist Scout operates, without regard to its conflict
                of law provisions.
              </Text>

              <Heading as="h2" size="lg">
                Contact Information
              </Heading>
              <Text>
                If you have any questions about this Agreement, please contact
                us at: setlistscout@gmail.com
              </Text>

              <Divider />

              <Text fontWeight="bold">
                Spotify is a third-party beneficiary of this End User Agreement
                and is entitled to directly enforce its terms.
              </Text>
            </VStack>
          </TabPanel>

          {/* PRIVACY POLICY TAB */}
          <TabPanel>
            <VStack spacing={6} align="start">
              <Heading as="h2" size="lg">
                Privacy Policy for Setlist Scout
              </Heading>

              <Divider />

              <Heading as="h2" size="lg">
                Introduction
              </Heading>
              <Text>
                Your privacy is important to us. This Privacy Policy explains
                how Setlist Scout ("we", "our", or "us") collects, uses, and
                protects your personal information when you use our website and
                services.
              </Text>
              <Text>
                Setlist Scout is a tool designed to help concert-goers prepare
                for upcoming shows by providing insights into what songs their
                favorite artists are playing on tour.
              </Text>

              <Heading as="h2" size="lg">
                Information We Collect
              </Heading>

              <Heading as="h3" size="md">
                Information You Provide
              </Heading>
              <Text>
                When you use Setlist Scout, we collect the following
                information:
              </Text>
              <Box pl={4}>
                <Text>
                  <strong>Spotify User ID</strong>: Stored temporarily to
                  identify your account when creating playlists
                </Text>
                <Text>
                  <strong>Spotify Access Tokens</strong>: Stored securely to
                  perform authorized actions on your behalf
                </Text>
                <Text>
                  <strong>Session Information</strong>: Stored in encrypted
                  server-side sessions
                </Text>
              </Box>

              <Heading as="h3" size="md">
                Information Collected Automatically
              </Heading>
              <Text>
                We also collect certain information automatically when you use
                our service:
              </Text>
              <Box pl={4}>
                <Text>
                  <strong>Usage Data</strong>: Information about how you
                  interact with our service
                </Text>
                <Text>
                  <strong>Device Information</strong>: Browser type, operating
                  system, and device type
                </Text>
                <Text>
                  <strong>IP Address</strong>: Used for service operation and
                  security purposes
                </Text>
              </Box>

              <Heading as="h3" size="md">
                Cookies and Similar Technologies
              </Heading>
              <Text>
                Our service uses cookies and similar technologies to enhance
                your experience. These technologies may collect information such
                as your IP address, browser type, and usage patterns.
              </Text>
              <Text>
                Third parties, including Spotify, may place cookies on your
                browser to collect information about your browsing activities on
                our website.
              </Text>

              <Heading as="h2" size="lg">
                How We Use Your Information
              </Heading>
              <Text>We use the information we collect to:</Text>
              <Box pl={4}>
                <Text>• Provide and maintain our service</Text>
                <Text>
                  • Create Spotify playlists based on your artist selections
                </Text>
                <Text>• Maintain your login session</Text>
                <Text>• Improve and personalize your experience</Text>
                <Text>• Ensure the security of our service</Text>
              </Box>

              <Heading as="h2" size="lg">
                Data Sharing and Disclosure
              </Heading>
              <Text>
                We share your information only in the following circumstances:
              </Text>
              <Box pl={4}>
                <Text>
                  <strong>With Spotify</strong>: To authenticate your account
                  and create playlists
                </Text>
                <Text>
                  <strong>Service Providers</strong>: Third-party companies that
                  help us deliver our service (such as hosting providers)
                </Text>
                <Text>
                  <strong>Legal Requirements</strong>: When required by law or
                  to protect our rights
                </Text>
              </Box>

              <Text fontWeight="bold" mt={4}>
                We do NOT:
              </Text>
              <Box pl={4}>
                <Text>• Analyze your listening habits</Text>
                <Text>• Store your search history</Text>
                <Text>• Track your application usage</Text>
                <Text>• Share your data with unauthorized third parties</Text>
              </Box>

              <Heading as="h2" size="lg">
                Data Retention
              </Heading>
              <Text>
                All authentication data is stored in encrypted sessions that
                expire after 24 hours. We do not maintain databases of user
                information or activity. You can delete your session data at any
                time by logging out.
              </Text>

              <Heading as="h2" size="lg">
                Your Privacy Rights and Choices
              </Heading>
              <Text>You have the right to:</Text>
              <Box pl={4}>
                <Text>
                  <strong>Access</strong>: Request information about the
                  personal data we have about you
                </Text>
                <Text>
                  <strong>Delete</strong>: Request deletion of your personal
                  data
                </Text>
                <Text>
                  <strong>Disconnect</strong>: Disconnect your Spotify account
                  from our service at any time
                </Text>
                <Text>
                  <strong>Opt-Out</strong>: Control whether third parties place
                  cookies on your browser
                </Text>
              </Box>

              <Text mt={2}>To exercise these rights, you can:</Text>
              <Box pl={4}>
                <Text>• Log out from our application</Text>
                <Text>• Email us at setlistscout@gmail.com</Text>
              </Box>

              <Heading as="h2" size="lg">
                Children's Privacy
              </Heading>
              <Text>
                Our service is not directed to children under the age of 13. We
                do not knowingly collect personal information from children
                under 13. If you are a parent or guardian and believe we have
                collected information from your child, please contact us.
              </Text>

              <Heading as="h2" size="lg">
                Changes to This Privacy Policy
              </Heading>
              <Text>
                We may update our Privacy Policy from time to time. We will
                notify you of any changes by posting the new Privacy Policy on
                this page and updating the "Effective Date" at the top.
              </Text>

              <Heading as="h2" size="lg">
                Third-Party Services
              </Heading>

              <Heading as="h3" size="md">
                Spotify
              </Heading>
              <Text>
                When you connect your Spotify account to Setlist Scout:
              </Text>
              <Box pl={4}>
                <Text>
                  • We request only the minimum permissions needed
                  (playlist-modify-public)
                </Text>
                <Text>
                  • Your use of Spotify through our service is also subject to{" "}
                  <Link
                    href="https://www.spotify.com/us/legal/privacy-policy/"
                    color="teal.500"
                    isExternal
                  >
                    Spotify's Privacy Policy <ExternalLinkIcon mx="2px" />
                  </Link>
                </Text>
                <Text>
                  • You will be prompted to authorize specific permissions
                  before we access your Spotify account
                </Text>
              </Box>

              <Heading as="h3" size="md">
                Setlist.fm
              </Heading>
              <Text>
                We use Setlist.fm to retrieve artist setlist information. We do
                not share your personal information with Setlist.fm.
              </Text>

              <Heading as="h2" size="lg">
                User Consent
              </Heading>
              <Text fontWeight="bold">
                By using Setlist Scout, you consent to our collection, use, and
                sharing of your information as described in this Privacy Policy.
                If you do not agree with this policy, please do not use our
                service.
              </Text>

              <Heading as="h2" size="lg">
                Contact Us
              </Heading>
              <Text>
                If you have any questions about this Privacy Policy, please
                contact us at:
              </Text>
              <Box pl={4}>
                <Text>Email: setlistscout@gmail.com</Text>
              </Box>

              <Divider />

              <Text fontWeight="bold">
                Spotify is a third-party beneficiary of this Privacy Policy and
                is entitled to directly enforce its terms.
              </Text>
            </VStack>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Container>
  );
}
