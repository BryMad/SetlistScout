import React, { useState } from "react";
import {
  Box,
  Image,
  Text,
  Link,
  VStack,
  Flex,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
} from "@chakra-ui/react";
import AlertMessage from "./AlertMessage";
import ProgressIndicator from "./ProgressIndicator";
import TracksHUDTourHeader from "./TracksHUDTourHeader";
import TracksHUDPlaylistControls from "./TracksHUDPlaylistControls";
import TracksHUDShowSelector from "./TracksHUDShowSelector";
import TracksHUDShowDisplay from "./TracksHUDShowDisplay";
import TracksHUDTracksList from "./TracksHUDTracksList";
import { useAuth } from "../hooks/useAuth";
import { useSetlist } from "../hooks/useSetlist";
import { useSpotify } from "../hooks/useSpotify";
import useTracksHud from "../hooks/useTracksHud";
import { formatShowDate, formatShowDisplay } from "../utils/tracksHudHelpers";
import spotifyLogo from "../assets/Spotify_Full_Logo_RGB_Green.png";

export default function TracksHUD() {
  const { isLoggedIn, login, logout } = useAuth();
  const { createPlaylist, playlistUrl, clearPlaylistUrl, isCreatingPlaylist } =
    useSpotify();
  const {
    spotifyData,
    tourData,
    showsList,
    selectedShowId,
    setSelectedShow,
    getSpotifyTrack,
    loading,
    playlistNotification,
    setNotification,
    progress,
  } = useSetlist();

  // Comprehensive TracksHUD business logic
  const tracksHudState = useTracksHud({
    selectedShowId,
    setSelectedShow,
    setNotification,
    showsList,
    spotifyData,
    getSpotifyTrack,
    logout,
    playlistUrl,
    clearPlaylistUrl,
    login,
    tourData,
  });

  const {
    tabIndex,
    setTabIndex,
    sortedShows,
    selectedShow,
    handleShowSelection,
    tourYears,
    showData,
    showLoading,
    showError,
    showTracks,
    availableForPlaylist,
    showPlaylistUrl,
    isCreatingShowPlaylist,
    createShowPlaylist: handleCreateShowPlaylist,
    clearShowPlaylistUrl,
    handleLoginClick,
  } = tracksHudState;

  // Determine if we should show the tracks section
  const shouldShowTracks = spotifyData?.length > 0 && !loading;

  // Check if we have shows available for "Pick a Show" feature
  const hasShows = showsList && showsList.length > 0;

  return (
    <Box width="full" maxW="100%">
      {/* Spotify Attribution - Visible initially and after loading is complete */}
      {!loading && (
        <VStack width="full">
          <Flex
            align="left"
            justify="left"
            flexWrap="wrap"
            gap={2}
            // mt={4}
            px={2}
          >
            <Text
              color="gray.400"
              fontWeight="medium"
              fontSize="sm"
              textAlign="left"
            >
              Artist search, track lookup, and playlist creation powered by:
            </Text>
          </Flex>
          <Flex>
            <Link href="https://open.spotify.com" isExternal display="block">
              <Image
                mt={9}
                mb={9}
                src={spotifyLogo}
                alt="Spotify Logo"
                height="auto"
                width="160px"
                flexShrink={0}
                style={{ cursor: "pointer !important" }}
                _hover={{ cursor: "pointer !important" }}
              />
            </Link>
          </Flex>
        </VStack>
      )}

      {/* Loading State */}
      {loading && (
        <Box width="full" mb={{ base: 3, md: 6 }}>
          <ProgressIndicator isLoading={loading} progress={progress} />
        </Box>
      )}

      {/* Main Tracks Interface */}
      {shouldShowTracks && (
        <Box width="full">
          {/* Tabs for "All Songs" vs "Pick a Show" */}
          <Tabs
            index={tabIndex}
            onChange={setTabIndex}
            variant="unstyled"
            mb={4}
          >
            <TabList justifyContent="center" gap={8}>
              <Tab
                _selected={{
                  color: "brand.300",
                  _after: {
                    content: '""',
                    position: "absolute",
                    bottom: "-2px",
                    left: "0",
                    right: "0",
                    height: "2px",
                    bg: "brand.300",
                  },
                }}
                _hover={{ color: "brand.400" }}
                fontWeight="medium"
                fontSize="sm"
                color="gray.400"
                pb={3}
                px={2}
                bg="transparent"
                border="none"
                borderRadius="0"
                transition="all 0.3s ease"
                position="relative"
                minW="auto"
                w="auto"
              >
                All Tour Songs
              </Tab>
              <Tab
                _selected={{
                  color: "brand.300",
                  _after: {
                    content: '""',
                    position: "absolute",
                    bottom: "-2px",
                    left: "0",
                    right: "0",
                    height: "2px",
                    bg: "brand.300",
                  },
                }}
                _hover={{ color: "brand.400" }}
                fontWeight="medium"
                fontSize="sm"
                color="gray.400"
                pb={3}
                px={2}
                bg="transparent"
                border="none"
                borderRadius="0"
                transition="all 0.3s ease"
                position="relative"
                minW="auto"
                w="auto"
                isDisabled={!hasShows}
              >
                Pick a Show
              </Tab>
            </TabList>

            <TabPanels>
              {/* Tab 1: All Tour Songs */}
              <TabPanel px={0}>
                <TracksHUDTourHeader
                  tourData={tourData}
                  spotifyData={spotifyData}
                  tourYears={tourYears}
                />

                <TracksHUDPlaylistControls
                  isLoggedIn={isLoggedIn}
                  onLogin={handleLoginClick}
                  onCreatePlaylist={createPlaylist}
                  isCreatingPlaylist={isCreatingPlaylist}
                  playlistUrl={playlistUrl}
                />

                <TracksHUDTracksList tracks={spotifyData} tourData={tourData} />
              </TabPanel>

              {/* Tab 2: Pick a Show */}
              <TabPanel px={0}>
                <TracksHUDShowSelector
                  shows={sortedShows}
                  selectedShow={selectedShow}
                  onShowSelect={handleShowSelection}
                  formatShowDisplay={formatShowDisplay}
                />

                {/* Selected Show Tracks */}
                {selectedShowId && (
                  <Box width="full">
                    <TracksHUDShowDisplay
                      showData={showData}
                      showLoading={showLoading}
                      showError={showError}
                      onRetry={() => handleShowSelection(selectedShowId)}
                      formatShowDate={formatShowDate}
                    >
                      {showTracks.length} songs played
                      {availableForPlaylist < showTracks.length && (
                        <Text as="span" color="yellow.400" ml={2}>
                          ({showTracks.length - availableForPlaylist} not found
                          on Spotify)
                        </Text>
                      )}
                    </TracksHUDShowDisplay>

                    {showData && !showLoading && !showError && (
                      <>
                        <TracksHUDPlaylistControls
                          isLoggedIn={isLoggedIn}
                          onLogin={handleLoginClick}
                          onCreatePlaylist={() =>
                            handleCreateShowPlaylist(
                              showData,
                              showTracks,
                              tourData
                            )
                          }
                          isCreatingPlaylist={isCreatingShowPlaylist}
                          playlistUrl={showPlaylistUrl}
                          buttonText="Create Show Playlist"
                          loginText="to create show playlist"
                          playlistLinkText="View your show playlist on Spotify"
                          trackCount={availableForPlaylist}
                        />

                        {showTracks.length > 0 ? (
                          <TracksHUDTracksList
                            tracks={showTracks}
                            tourData={tourData}
                            showOrder={true}
                          />
                        ) : (
                          <Text color="gray.500" textAlign="center" py={8}>
                            No songs found for this show
                          </Text>
                        )}
                      </>
                    )}
                  </Box>
                )}
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Box>
      )}

      {/* Playlist Notification Message - Keep outside the main section for visibility */}
      {playlistNotification && playlistNotification.message && (
        <AlertMessage
          status={playlistNotification.status}
          message={playlistNotification.message}
          onClose={() => setNotification({ message: "", status: "" })}
          width="full"
        />
      )}
    </Box>
  );
}
