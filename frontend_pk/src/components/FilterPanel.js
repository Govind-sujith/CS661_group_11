// src/components/FilterPanel.js (The Final Upgraded Version)
import React, { useState, useEffect, useContext } from 'react';
import { FilterContext } from '../context/FilterContext';
import { getUniqueYears, getUniqueStates, getUniqueCauses } from '../api/apiService';
import { Select, MenuItem, FormControl, InputLabel, Paper, Typography, Box, CircularProgress } from '@mui/material';

function FilterPanel() {
  const { filters, setFilters } = useContext(FilterContext);

  const [years, setYears] = useState([]);
  const [states, setStates] = useState([]);
  const [causes, setCauses] = useState([]); // <-- NEW
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadFilterOptions = async () => {
      setIsLoading(true);
      const [yearData, stateData, causeData] = await Promise.all([
        getUniqueYears(),
        getUniqueStates(),
        getUniqueCauses() // <-- Fetch the new data
      ]);

      setYears(['All', ...yearData.sort((a, b) => b - a)]);
      setStates(['All', ...stateData.sort()]);
      setCauses(['All', ...causeData.sort()]); // <-- Set the new data
      
      setIsLoading(false);
    };

    loadFilterOptions();
  }, []);

  const handleChange = (event) => {
    setFilters({
      ...filters,
      [event.target.name]: event.target.value,
    });
  };

  if (isLoading) {
    return (
      <Paper elevation={3} style={{ padding: '1.5rem', borderRadius: '8px', textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body2" sx={{ mt: 2 }}>Loading Filters...</Typography>
      </Paper>
    );
  }

  return (
    <Paper elevation={3} style={{ padding: '1.5rem', borderRadius: '8px' }}>
      <Typography variant="h6" gutterBottom>Filters</Typography>
      <Box className="space-y-6 mt-4">
        {/* Year FormControl */}
        <FormControl fullWidth>
          <InputLabel id="year-select-label">Year</InputLabel>
          <Select
            labelId="year-select-label"
            name="year"
            value={filters.year}
            label="Year"
            onChange={handleChange}
          >
            {years.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
          </Select>
        </FormControl>
        
        {/* State FormControl */}
        <FormControl fullWidth>
          <InputLabel id="state-select-label">State</InputLabel>
          <Select
            labelId="state-select-label"
            name="state"
            value={filters.state}
            label="State"
            onChange={handleChange}
          >
            {states.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </Select>
        </FormControl>
        
        {/* --- NEW: Cause FormControl --- */}
        <FormControl fullWidth>
          <InputLabel id="cause-select-label">Cause</InputLabel>
          <Select
            labelId="cause-select-label"
            name="cause"
            value={filters.cause || 'All'}
            label="Cause"
            onChange={handleChange}
          >
            {causes.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
          </Select>
        </FormControl>

      </Box>
    </Paper>
  );
}

export default FilterPanel;
