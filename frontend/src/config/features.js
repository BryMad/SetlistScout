/**
 * Feature flags configuration for frontend
 * Controls which UI features are displayed
 */

export const FEATURES = {
  // Advanced search with Past Tours tab
  ADVANCED_SEARCH: import.meta.env.VITE_ENABLE_ADVANCED_SEARCH === 'true',

};

// Log active features in development
if (import.meta.env.MODE === 'development') {
  console.log('Active feature flags:', FEATURES);
}