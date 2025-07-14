// src/context/FilterContext.js
import React, { createContext, useState } from 'react';

// This is the starting point for our filters. When the app first loads,
// these are the default values that will be used.
const initialFilters = {
  queryType: 'year',
  year: 'All',
  state: 'All',
  cause: 'All',
  startDate: '',
  endDate: '',
};

// Here we create the actual context. This object will be used by other
// components to access the shared filter data.
export const FilterContext = createContext();

// This is the provider component. We'll wrap our entire application with this,
// which makes the filter state available to any component that needs it.
export const FilterProvider = ({ children }) => {
  const [filters, setFilters] = useState(initialFilters);

  return (
    <FilterContext.Provider value={{ filters, setFilters }}>
      {children}
    </FilterContext.Provider>
  );
};
