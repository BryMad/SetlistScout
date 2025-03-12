/**
 * Detects if the current device is a mobile device
 * 
 * @returns {boolean} True if the current device is mobile, false otherwise
 */
export const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};