import React from 'react';
import {
  Box,
  List,
  ListItem,
  Text,
  Badge,
  HStack,
  Flex,
  Spinner
} from '@chakra-ui/react';

const TourDropdown = ({ 
  tourOptions, 
  onTourSelect, 
  isLoading,
  isVisible 
}) => {
  if (!isVisible && !isLoading) return null;

  const getYearRange = (tour) => {
    if (!tour.dateRange) return 'Unknown dates';
    const start = new Date(tour.dateRange.earliest).getFullYear();
    const end = new Date(tour.dateRange.latest).getFullYear();
    return start === end ? start.toString() : `${start}-${end}`;
  };

  const getMostRecentTour = () => {
    if (!tourOptions.length) return null;
    
    // Filter out orphan shows and VIP tours, then sort by latest date
    const validTours = tourOptions.filter(tour => 
      !tour.isOrphan && 
      !tour.isVIPOrSoundcheck &&
      tour.dateRange
    );
    
    if (validTours.length === 0) return null;
    
    return validTours.sort((a, b) => 
      new Date(b.dateRange.latest) - new Date(a.dateRange.latest)
    )[0];
  };

  const mostRecentTour = getMostRecentTour();

  return (
    <Box
      position="absolute"
      zIndex="20"
      bg="gray.800"
      mt={2}
      ml={4} // Offset to the right
      width="400px"
      borderRadius="lg"
      overflow="hidden"
      boxShadow="xl"
      border="1px solid"
      borderColor="gray.700"
    >
      {isLoading ? (
        <Box p={4} textAlign="center">
          <Spinner size="sm" mr={2} />
          <Text as="span">Checking tours...</Text>
        </Box>
      ) : (
        <>
          <Box p={3} borderBottom="1px solid" borderColor="gray.700">
            <Text fontSize="sm" fontWeight="semibold" color="gray.300">
              Choose the tour you want setlist data for:
            </Text>
          </Box>
          <List spacing={0} maxH="300px" overflowY="auto">
            {tourOptions.map((tour, index) => {
              const isRecommended = mostRecentTour && tour.name === mostRecentTour.name;
              const isOrphan = tour.isOrphan || tour.name.toLowerCase() === "no tour info";
              
              return (
                <ListItem
                  key={index}
                  px={4}
                  py={3}
                  _hover={{ backgroundColor: "gray.700" }}
                  transition="background-color 0.2s"
                  cursor="pointer"
                  onClick={() => onTourSelect(tour)}
                  borderBottom="1px solid"
                  borderColor="gray.700"
                  _last={{ borderBottom: "none" }}
                >
                  <Flex direction="column" gap={1}>
                    <HStack justify="space-between" align="flex-start">
                      <Text 
                        fontSize="sm" 
                        fontWeight="medium"
                        flex="1"
                        lineHeight="1.3"
                      >
                        {isOrphan ? "Shows with no tour info" : tour.name}
                      </Text>
                      {isRecommended && (
                        <Badge colorScheme="green" size="sm" ml={2}>
                          Recommended!
                        </Badge>
                      )}
                    </HStack>
                    
                    <HStack justify="space-between" align="center">
                      <Text fontSize="xs" color="gray.400">
                        {isOrphan 
                          ? getYearRange(tour) 
                          : `${getYearRange(tour)} • ${tour.count} shows`
                        }
                      </Text>
                      
                      {tour.isStale && (
                        <Badge colorScheme="yellow" size="xs">
                          Older tour
                        </Badge>
                      )}
                    </HStack>
                    
                    {isRecommended && (
                      <Text fontSize="xs" color="green.300">
                        Most recent tour
                      </Text>
                    )}
                  </Flex>
                </ListItem>
              );
            })}
          </List>
        </>
      )}
    </Box>
  );
};

export default TourDropdown;