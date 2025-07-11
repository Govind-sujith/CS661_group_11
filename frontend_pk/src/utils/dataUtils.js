// src/utils/dataUtils.js

/**
 * A reusable function to clean analytical data from the API.
 * It removes any items where the specified requiredKeys are null or undefined.
 * @param {Array<Object>} data - The array of data from the API.
 * @param {Array<string>} requiredKeys - An array of key names that must not be null.
 * @returns {Array<Object>} The cleaned array of data.
 */
export const cleanDataForCharts = (data, requiredKeys) => {
    if (!Array.isArray(data) || !Array.isArray(requiredKeys)) {
      return []; // Return empty if input is invalid
    }
    return data.filter(d => 
      requiredKeys.every(key => d[key] !== null && d[key] !== undefined)
    );
  };