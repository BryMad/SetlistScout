/**
 * Feature flags configuration
 * Controls which features are enabled in the application
 */

const features = {
  // Advanced search allows users to search historical tours
  ADVANCED_SEARCH: process.env.ENABLE_ADVANCED_SEARCH === 'true',
  
  // Intelligent workflow analyzes data quality and suggests best approach
  INTELLIGENT_WORKFLOW: process.env.ENABLE_INTELLIGENT_WORKFLOW === 'true',
  
  // Future features can be added here
};

// Log active features on startup (only in development)
if (process.env.NODE_ENV === 'development') {
  console.log('Active feature flags:', Object.entries(features)
    .filter(([, enabled]) => enabled)
    .map(([name]) => name)
    .join(', ') || 'None');
}

module.exports = features;