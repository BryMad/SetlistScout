// src/components/AlertMessage.jsx
import React from "react";
import {
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  CloseButton,
} from "@chakra-ui/react";

/**
 * Reusable alert component for notifications and errors
 *
 * @param {Object} props Component props
 * @param {string} props.status Alert status (error, success, warning, info)
 * @param {string} props.title Optional title for the alert
 * @param {string} props.message Main alert message
 * @param {Function} props.onClose Function to call when closed
 * @param {Object} props.mt Margin top
 * @param {Object} props.mb Margin bottom
 * @param {Object} props.rest Additional props to pass to the Alert component
 */
const AlertMessage = ({
  status,
  title,
  message,
  onClose,
  mt = 4,
  mb = 4,
  ...rest
}) => {
  if (!message) return null;

  return (
    <Alert
      status={status}
      variant="solid"
      mt={mt}
      mb={mb}
      borderRadius="md"
      position="relative"
      {...rest}
    >
      <AlertIcon />

      {title && <AlertTitle mr={2}>{title}:</AlertTitle>}

      <AlertDescription flex="1">{message}</AlertDescription>

      {onClose && (
        <CloseButton
          position="absolute"
          right="8px"
          top="8px"
          onClick={onClose}
        />
      )}
    </Alert>
  );
};

export default AlertMessage;
