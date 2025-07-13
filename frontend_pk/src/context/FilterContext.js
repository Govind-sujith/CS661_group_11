// src/context/FilterContext.js (FIXED)
import React, { createContext, useState } from 'react';

// The initial state of our filters
const initialFilters = {
  year: 'All',
  state: 'All',
  cause: 'All',
  startDate: '', // Changed from start_date to startDate
  endDate: '',   // Changed from end_date to endDate
};

// Create the context object
export const FilterContext = createContext();

// Create the provider component that will wrap our app
export const FilterProvider = ({ children }) => {
  const [filters, setFilters] = useState(initialFilters);

  return (
    <FilterContext.Provider value={{ filters, setFilters }}>
      {children}
    </FilterContext.Provider>
  );
};