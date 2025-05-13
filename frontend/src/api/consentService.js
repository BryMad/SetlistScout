// File: ./frontend/src/api/consentService.js
import axios from 'axios';
import { server_url } from "../App";

/**
 * Log user consent to server
 * 
 * @param {Object} consentData Data about user consent
 * @param {Date|string} consentData.date Timestamp when consent was given
 * @param {boolean} consentData.agreedToTerms Whether user agreed to terms
 * @param {boolean} consentData.agreedToPrivacy Whether user agreed to privacy policy
 * @returns {Promise<Object>} Promise resolving to response object with consentId
 */
export const logConsent = async (consentData) => {
  try {
    const response = await axios.post(
      `${server_url}/consent/log`,
      { consentData },
      { headers: { "Content-Type": "application/json" } }
    );

    return {
      success: true,
      consentId: response.data.consentId,
      message: response.data.message
    };
  } catch (error) {
    console.error("Error logging consent:", error);

    // Return object indicating to fall back to localStorage only
    return {
      success: false,
      localStorageOnly: true,
      message: error.response?.data?.message || "Failed to log consent to server"
    };
  }
};

/**
 * Verify a consent record exists on the server
 * 
 * @param {string} consentId ID of the consent record to verify
 * @returns {Promise<Object>} Promise resolving to verification result
 */
export const verifyConsent = async (consentId) => {
  try {
    if (!consentId) {
      throw new Error("Missing consent ID");
    }

    const response = await axios.get(
      `${server_url}/consent/verify/${consentId}`,
      { headers: { "Content-Type": "application/json" } }
    );

    return {
      verified: response.data.verified,
      details: response.data.details,
      message: response.data.message
    };
  } catch (error) {
    console.error("Error verifying consent:", error);

    return {
      verified: false,
      message: error.response?.data?.message || "Failed to verify consent"
    };
  }
};