// src/api/apiService.js (THE FINAL, ROBUST, AND CORRECT VERSION)
const BASE_URL = 'http://localhost:8000/api/v1';

/**
 * A reusable helper function to clean and map the filters object.
 * 1. It removes any keys that are 'All', null, or undefined.
 * 2. It maps frontend camelCase names (startDate) to backend snake_case names (start_date).
 * This ensures all API calls send the correct parameters.
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
        if (endpoint.includes('paginated')) return { total_fires: 0, page: 1, limit: params.limit, fires: [] };
        if (endpoint.includes('summary')) return { total_incidents: 0, total_acres: 0, avg_acres: 0 };
        return [];
    }
};


export const getFires = (filters = {}, page = 1, limit = 2000) => {
    const apiParams = { ...cleanAndMapFilters(filters), page, limit };
    return fetchData('fires', apiParams);
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

export const getCountyData = (filters = {}) => {
    return fetchData('aggregate/county', cleanAndMapFilters(filters));
};

export const getAgencyPerformance = (filters = {}) => {
    return fetchData('performance/agencies', cleanAndMapFilters(filters));
};

export const getCorrelationData = (filters = {}) => {
    return fetchData('statistics/correlation', cleanAndMapFilters(filters));
};

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
      range_total_incidents: 0,
      range_total_acres: 0,
      range_avg_acres: 0,
      cumulative_total_incidents: 0,
      cumulative_total_acres: 0,
      cumulative_avg_acres: 0
    };
  }
};


// --- Functions for the Temporal Analysis View ---

export const getDiurnalData = (filters = {}) => {
    return fetchData('temporal/diurnal', cleanAndMapFilters(filters));
};

export const getWeeklySummaryData = (filters = {}) => {
    return fetchData('temporal/weekly-summary', cleanAndMapFilters(filters));
};

export const getDurationDistributionData = (filters = {}) => {
    return fetchData('summary/containment-duration-distribution', cleanAndMapFilters(filters));
};

export const getSizeClassByCauseData = (filters = {}) => {
    return fetchData('summary/size-class-by-cause', cleanAndMapFilters(filters));
};

// --- Function for the filterable radial chart ---
export const getCauseSummary = (filters = {}) => {
    return fetchData('summary/causes', cleanAndMapFilters(filters));
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
// Add this new function to src/api/apiService.js

export const getMonthlyCounts = (state = null) => {
  const params = {};
  if (state) {
      params.state = state;
  }
  // This function calls the existing /summary/monthly-frequency endpoint
  return fetchData('summary/monthly-frequency', params);
};

export const getStateData = async (filters = {}) => {
  try {
    const cleaned = cleanAndMapFilters(filters); // remove null/undefined
    const queryParams = new URLSearchParams(cleaned).toString();
    const response = await fetch(`${BASE_URL}/aggregate/state?${queryParams}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch state data:", error);
    return [];
  }
};
