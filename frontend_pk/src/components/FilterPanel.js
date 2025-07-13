// src/components/FilterPanel.js
import React, { useState, useEffect, useContext } from 'react';
import { FilterContext } from '../context/FilterContext';
import { getUniqueStates, getUniqueCauses } from '../api/apiService';
import {
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Typography,
  Box,
  CircularProgress,
  TextField,
  Divider
} from '@mui/material';

function FilterPanel() {
  const { filters, setFilters } = useContext(FilterContext);

  const [states, setStates] = useState([]);
  const [causes, setCauses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadFilterOptions = async () => {
      setIsLoading(true);
      const [stateData, causeData] = await Promise.all([
        getUniqueStates(),
        getUniqueCauses()
      ]);

      setStates(['All', ...stateData.sort()]);
      setCauses(['All', ...causeData.sort()]);
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

  const handleDateChange = (event) => {
    const { name, value } = event.target;
    setFilters({
      ...filters,
      [name]: value,
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

        {/* Date Range Filter */}
        <Box>
          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
            Date Range
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              name="startDate"
              label="Start Date"
              type="date"
              value={filters.startDate || ''}
              onChange={handleDateChange}
              InputLabelProps={{
                shrink: true,
              }}
              inputProps={{
                max: '2015-12-31'
              }}
              fullWidth
              size="small"
            />
            <TextField
              name="endDate"
              label="End Date"
              type="date"
              value={filters.endDate || ''}
              onChange={handleDateChange}
              InputLabelProps={{
                shrink: true,
              }}
              inputProps={{
                min: filters.startDate || '1992-01-01',
                max: '2015-12-31'
              }}
              fullWidth
              size="small"
            />
          </Box>
        </Box>

        <Divider />

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

        {/* Cause FormControl */}
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