// src/api/apiService.js

// This is the base URL for our backend API. It points to the FastAPI service
// running in our Docker container, which we've exposed on port 8000.
const BASE_URL = 'http://localhost:8000/api/v1';

/**
 * A handy helper function to prepare our filter data before sending it to the backend.
 * It does two things:
 * 1. Removes any filters that are empty or set to 'All'.
 * 2. Translates frontend-friendly names (like startDate) to the backend's expected format (start_date).
 */
const cleanAndMapFilters = (filters) => {
  const mapping = {
    startDate: 'start_date',
    endDate: 'end_date',
  };

  const cleaned = {};
  for (const key in filters) {
    const value = filters[key];
    if (value !== 'All' && value !== null && value !== undefined && value !== '') {
      const mappedKey = mapping[key] || key;
      cleaned[mappedKey] = value;
    }
  }
  return cleaned;
};

/**
 * This is our main function for making API calls. It's a generic wrapper around `fetch`
 * that adds error handling and provides some default return values if things go wrong.
 */
const fetchData = async (endpoint, params = {}) => {
    try {
        const queryParams = new URLSearchParams(params).toString();
        const response = await fetch(`${BASE_URL}/${endpoint}?${queryParams}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Failed to fetch from ${endpoint}:`, error);
        // If an API call fails, return a sensible default to prevent the app from crashing.
        if (endpoint.includes('paginated')) return { total_fires: 0, page: 1, limit: params.limit, fires: [] };
        if (endpoint.includes('summary')) return { total_incidents: 0, total_acres: 0, avg_acres: 0 };
        return [];
    }
};

// --- Functions for Fetching Core Wildfire Data ---

// Gets a paginated list of fires, applying any active filters.
export const getFires = (filters = {}, page = 1, limit = 2000) => {
    const apiParams = { ...cleanAndMapFilters(filters), page, limit };
    return fetchData('fires', apiParams);
};

// Gets all fires for a specific year, with optional state and cause filters.
export const getFiresByYear = async (year, state = null, cause = null) => {
  try {
    const params = new URLSearchParams();
    if (state && state !== 'All') params.append('state', state);
    if (cause && cause !== 'All') params.append('cause', cause);
    const queryString = params.toString();
    const response = await fetch(`${BASE_URL}/fires/year/${year}${queryString ? `?${queryString}` : ''}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch fires for year ${year}:`, error);
    return [];
  }
};

// --- Functions for Charts and Visualizations ---

// Fetches aggregated data by county for the heatmap.
export const getCountyData = (filters = {}) => {
    return fetchData('aggregate/county', cleanAndMapFilters(filters));
};

// Fetches performance data for the top agencies.
export const getAgencyPerformance = (filters = {}) => {
    return fetchData('performance/agencies', cleanAndMapFilters(filters));
};

// Fetches data for the correlation scatter plot.
export const getCorrelationData = (filters = {}) => {
    return fetchData('statistics/correlation', cleanAndMapFilters(filters));
};

// Fetches data for the diurnal (24-hour) chart.
export const getDiurnalData = (filters = {}) => {
    return fetchData('temporal/diurnal', cleanAndMapFilters(filters));
};

// Fetches data for the weekly summary chart.
export const getWeeklySummaryData = (filters = {}) => {
    return fetchData('temporal/weekly-summary', cleanAndMapFilters(filters));
};

// Fetches data for the fire duration distribution chart.
export const getDurationDistributionData = (filters = {}) => {
    return fetchData('summary/containment-duration-distribution', cleanAndMapFilters(filters));
};

// Fetches data for the size class by cause chart.
export const getSizeClassByCauseData = (filters = {}) => {
    return fetchData('summary/size-class-by-cause', cleanAndMapFilters(filters));
};

// Fetches data for the filterable radial cause chart.
export const getCauseSummary = (filters = {}) => {
    return fetchData('summary/causes', cleanAndMapFilters(filters));
};

// Fetches monthly fire counts, used in the yearly trend heatmap.
export const getMonthlyCounts = (state = null) => {
  const params = {};
  if (state) {
      params.state = state;
  }
  return fetchData('summary/monthly-frequency', params);
};

// Fetches aggregated data by state for the main US map.
export const getStateData = async (filters = {}) => {
  try {
    const cleaned = cleanAndMapFilters(filters);
    const queryParams = new URLSearchParams(cleaned).toString();
    const response = await fetch(`${BASE_URL}/aggregate/state?${queryParams}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch state data:", error);
    return [];
  }
};

// Fetches the main summary statistics for the dashboard cards.
export const getSummaryStats = async (filters = {}) => {
  try {
    const params = new URLSearchParams();

    if (filters.state && filters.state !== 'All') {
      params.append("state", filters.state);
    }
    if (filters.cause && filters.cause !== 'All') {
      params.append("cause", filters.cause);
    }
    if (filters.queryType === "year" && filters.year && filters.year !== "All") {
      params.append("year", filters.year);
    }
    if (filters.queryType === "dateRange" && filters.startDate && filters.endDate) {
      params.append("start_date", filters.startDate);
      params.append("end_date", filters.endDate);
    }

    const response = await fetch(`${BASE_URL}/statistics/summary?${params.toString()}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch summary stats:", error);
    return {
      range_total_incidents: 0, range_total_acres: 0, range_avg_acres: 0,
      cumulative_total_incidents: 0, cumulative_total_acres: 0, cumulative_avg_acres: 0
    };
  }
};

// --- Functions for Populating Filter Dropdowns ---

// A generic function to get a list of unique values for a given field.
const getUniqueValues = async (field) => {
  try {
    const response = await fetch(`${BASE_URL}/aggregate?group_by=${field}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    return data.map(item => item.group);
  } catch (error) {
    console.error(`Failed to fetch unique values for ${field}:`, error);
    return [];
  }
};

// Specific functions that use the generic one above.
export const getUniqueYears = () => getUniqueValues('FIRE_YEAR');
export const getUniqueStates = () => getUniqueValues('STATE');
export const getUniqueCauses = () => getUniqueValues('STAT_CAUSE_DESCR');


// --- Functions for ML and Geospatial Services ---

// Sends input data to our ML model to get a cause prediction.
export const predictCause = async (inputData) => {
  try {
    const response = await fetch(`${BASE_URL}/predict/cause`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inputData),
    });
    if (!response.ok) {
        const errData = await response.json();
        throw new Error(`HTTP error! status: ${response.status} - ${errData.detail}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Failed to get prediction:", error);
    return [];
  }
};

// Uses a reverse geocoding API to find the state for a given lat/lon.
export const getStateFromCoords = async (lat, lon) => {
  try {
    const response = await fetch(`${BASE_URL}/geospatial/reverse-geocode?lat=${lat}&lon=${lon}`);
    if (!response.ok) { return null; }
    const data = await response.json();
    return data.state;
  } catch (error) {
    console.error("Failed to reverse geocode:", error);
    return null;
  }
};
