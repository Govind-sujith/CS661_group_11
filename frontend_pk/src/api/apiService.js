// src/api/apiService.js (THE FINAL, ROBUST, AND CORRECT VERSION)
const BASE_URL = 'http://localhost:8000/api/v1';

/**
 * A reusable helper function to clean the filters object.
 * It removes any keys that are 'All', null, or undefined.
 * This ensures we only send meaningful filters to the API.
 */
const cleanFilters = (filters) => {
  const cleaned = { ...filters };
  for (const key in cleaned) {
    if (cleaned[key] === 'All' || cleaned[key] === null || cleaned[key] === undefined) {
      delete cleaned[key];
    }
  }
  return cleaned;
};

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


export const getFires = async (filters = {}, page = 1, limit = 2000) => {
  try {
    const cleaned = cleanFilters(filters);
    const params = { ...cleaned, page, limit };
    const queryParams = new URLSearchParams(params).toString();
    const response = await fetch(`${BASE_URL}/fires?${queryParams}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch fire data:", error);
    return { total_fires: 0, page: 1, limit, fires: [] };
  }
};

export const getCountyData = async (filters = {}) => {
  try {
    const cleaned = cleanFilters(filters);
    const queryParams = new URLSearchParams(cleaned).toString();
    const response = await fetch(`${BASE_URL}/aggregate/county?${queryParams}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch county data:", error);
    return [];
  }
};

export const getTemporalData = async (filters = {}) => {
  try {
    const cleaned = cleanFilters(filters);
    const queryParams = new URLSearchParams(cleaned).toString();
    const response = await fetch(`${BASE_URL}/temporal/diurnal?${queryParams}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch temporal data:", error);
    return [];
  }
};

export const getAgencyPerformance = async (filters = {}) => {
  try {
    const cleaned = cleanFilters(filters);
    const queryParams = new URLSearchParams(cleaned).toString();
    const response = await fetch(`${BASE_URL}/performance/agencies?${queryParams}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch agency data:", error);
    return [];
  }
};

export const getWeeklyCadence = async (filters = {}) => {
  try {
    const cleaned = cleanFilters(filters);
    const queryParams = new URLSearchParams(cleaned).toString();
    const response = await fetch(`${BASE_URL}/temporal/weekly?${queryParams}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch weekly data:", error);
    return [];
  }
};

export const getCorrelationData = async (filters = {}) => {
  try {
    // This endpoint on the backend doesn't accept filters, but we keep the
    // structure consistent for robustness.
    const cleaned = cleanFilters(filters);
    const queryParams = new URLSearchParams(cleaned).toString();
    const response = await fetch(`${BASE_URL}/statistics/correlation?${queryParams}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch correlation data:", error);
    return [];
  }
};

export const getSummaryStats = async (filters = {}) => {
  try {
    const cleaned = cleanFilters(filters);
    const queryParams = new URLSearchParams(cleaned).toString();
    const response = await fetch(`${BASE_URL}/statistics/summary?${queryParams}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch summary stats:", error);
    return { total_incidents: 0, total_acres: 0, avg_acres: 0 };
  }
};

// Functions for dropdowns don't need cleaning
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

export const getUniqueYears = () => getUniqueValues('FIRE_YEAR');
export const getUniqueStates = () => getUniqueValues('STATE');
export const getUniqueCauses = () => getUniqueValues('STAT_CAUSE_DESCR');

// Predictive model doesn't use filters
export const predictCause = async (inputData) => {
  try {
    const response = await fetch(`${BASE_URL}/predict/cause`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(inputData),
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Failed to get prediction:", error);
    return [];
  }
};

