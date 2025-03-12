/**
 * Save data to localStorage with error handling
 * 
 * @param {string} key Storage key
 * @param {*} value Value to store (will be JSON-serialized)
 * @returns {boolean} Success status
 */
export const saveToLocalStorage = (key, value) => {
  try {
    const serializedValue = typeof value === 'string'
      ? value
      : JSON.stringify(value);

    localStorage.setItem(key, serializedValue);
    return true;
  } catch (error) {
    console.error(`Error saving to localStorage [${key}]:`, error);
    return false;
  }
};

/**
 * Retrieve data from localStorage with error handling
 * 
 * @param {string} key Storage key
 * @param {boolean} parse Whether to parse the value as JSON
 * @returns {*} Retrieved value or null if not found/error
 */
export const getFromLocalStorage = (key, parse = true) => {
  try {
    const value = localStorage.getItem(key);

    if (value === null) {
      return null;
    }

    return parse ? JSON.parse(value) : value;
  } catch (error) {
    console.error(`Error retrieving from localStorage [${key}]:`, error);
    return null;
  }
};

/**
 * Remove data from localStorage
 * 
 * @param {string} key Storage key to remove
 * @returns {boolean} Success status
 */
export const removeFromLocalStorage = (key) => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Error removing from localStorage [${key}]:`, error);
    return false;
  }
};

/**
 * Save data to sessionStorage with error handling
 * 
 * @param {string} key Storage key
 * @param {*} value Value to store (will be JSON-serialized)
 * @returns {boolean} Success status
 */
export const saveToSessionStorage = (key, value) => {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Error saving to sessionStorage [${key}]:`, error);
    return false;
  }
};

/**
 * Retrieve data from sessionStorage with error handling
 * 
 * @param {string} key Storage key
 * @returns {*} Retrieved value or null if not found/error
 */
export const getFromSessionStorage = (key) => {
  try {
    const value = sessionStorage.getItem(key);

    if (value === null) {
      return null;
    }

    return JSON.parse(value);
  } catch (error) {
    console.error(`Error retrieving from sessionStorage [${key}]:`, error);
    return null;
  }
};

/**
 * Remove data from sessionStorage
 * 
 * @param {string} key Storage key to remove
 * @returns {boolean} Success status
 */
export const removeFromSessionStorage = (key) => {
  try {
    sessionStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Error removing from sessionStorage [${key}]:`, error);
    return false;
  }
};