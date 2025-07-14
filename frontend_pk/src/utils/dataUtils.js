// src/utils/dataUtils.js

// This file contains handy helper functions for processing data throughout the app.

/**
 * A reusable function to clean up data we get from the API before using it in our charts.
 * It makes sure that we don't try to plot any incomplete data by removing items that are
 * missing important values.
 *
 * @param {Array<Object>} data - The array of data objects from our API.
 * @param {Array<string>} requiredKeys - A list of keys that must have a value.
 * @returns {Array<Object>} The cleaned array of data, ready for charting.
 */
export const cleanDataForCharts = (data, requiredKeys) => {
  // First, a quick check to make sure we received valid inputs.
  if (!Array.isArray(data) || !Array.isArray(requiredKeys)) {
    return []; // If not, we'll just return an empty array to be safe.
  }
  // Here we filter the data. An item is kept only if every one of the
  // required keys has a value that isn't null or undefined.
  return data.filter(d => 
    requiredKeys.every(key => d[key] !== null && d[key] !== undefined)
  );
};
