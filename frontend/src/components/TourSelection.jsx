import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Card,
  CardBody,
  Badge,
  Divider,
  Heading,
  useColorModeValue,
  Icon,
  Flex,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription
} from '@chakra-ui/react';
import { FaCalendarAlt, FaMusic, FaExclamationTriangle } from 'react-icons/fa';

const TourSelection = ({ 
  artist, 
  tourOptions, 
  totalShows, 
  onTourSelect, 
  isProcessing,
  onGoBack 
}) => {
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getDateRange = (tour) => {
    if (!tour.dateRange) return 'Date range unknown';
    const start = formatDate(tour.dateRange.earliest);
    const end = formatDate(tour.dateRange.latest);
    return start === end ? start : `${start} - ${end}`;
  };

  return (
    <Box maxW="4xl" mx="auto" p={4}>
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <Box textAlign="center">
          <Heading size="lg" mb={2}>
            Choose Tour for {artist.name}
          </Heading>
          <Text color={mutedColor}>
            Found {tourOptions.length} tour option{tourOptions.length !== 1 ? 's' : ''} 
            from {totalShows} recent shows
          </Text>
        </Box>

        {/* Tour Options */}
        <VStack spacing={4} align="stretch">
          {tourOptions.map((tour, index) => (
            <Card 
              key={index}
              bg={cardBg}
              borderColor={borderColor}
              borderWidth="1px"
              _hover={{ 
                shadow: 'md', 
                borderColor: 'brand.300',
                transform: 'translateY(-2px)'
              }}
              transition="all 0.2s"
              cursor={isProcessing ? 'not-allowed' : 'pointer'}
              opacity={isProcessing ? 0.7 : 1}
              onClick={() => !isProcessing && onTourSelect(tour)}
            >
              <CardBody>
                <VStack align="stretch" spacing={3}>
                  {/* Tour Name and Badges */}
                  <Flex justify="space-between" align="flex-start" wrap="wrap" gap={2}>
                    <Box flex="1">
                      <Heading size="md" mb={1}>
                        {tour.name}
                      </Heading>
                      <HStack spacing={2} wrap="wrap">
                        <Badge colorScheme="blue" variant="subtle">
                          <Icon as={FaMusic} mr={1} />
                          {tour.count} show{tour.count !== 1 ? 's' : ''}
                        </Badge>
                        {tour.isStale && (
                          <Badge colorScheme="yellow" variant="subtle">
                            <Icon as={FaExclamationTriangle} mr={1} />
                            Older tour
                          </Badge>
                        )}
                        {tour.isIndividual && (
                          <Badge colorScheme="purple" variant="subtle">
                            Recent shows
                          </Badge>
                        )}
                      </HStack>
                    </Box>
                  </Flex>

                  {/* Date Range */}
                  <HStack spacing={2} color={mutedColor}>
                    <Icon as={FaCalendarAlt} />
                    <Text fontSize="sm">
                      {getDateRange(tour)}
                    </Text>
                  </HStack>

                  {/* Staleness Warning */}
                  {tour.isStale && (
                    <Alert status="warning" size="sm" borderRadius="md">
                      <AlertIcon />
                      <AlertTitle fontSize="sm">Older Tour</AlertTitle>
                      <AlertDescription fontSize="sm">
                        This tour's last show was over 2 years ago. Song choices may not reflect current setlists.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Description */}
                  <Text fontSize="sm" color={mutedColor}>
                    {tour.isIndividual 
                      ? "Individual shows not part of a named tour. Good for recent one-off performances."
                      : `Analysis of ${tour.count} shows from this tour.`
                    }
                  </Text>
                </VStack>
              </CardBody>
            </Card>
          ))}
        </VStack>

        {/* Back Button */}
        <Divider />
        <HStack justify="center">
          <Button 
            variant="outline" 
            onClick={onGoBack}
            isDisabled={isProcessing}
            size="lg"
          >
            Search Different Artist
          </Button>
        </HStack>
      </VStack>
    </Box>
  );
};

export default TourSelection;