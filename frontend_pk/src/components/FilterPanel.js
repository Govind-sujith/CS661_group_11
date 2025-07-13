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
  Divider,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';

function FilterPanel() {
  const { filters, setFilters } = useContext(FilterContext);

  const [states, setStates] = useState([]);
  const [causes, setCauses] = useState([]);
  const [years] = useState(() => {
    // Generate years from 1992 to 2015
    const yearRange = [];
    for (let year = 2015; year >= 1992; year--) {
      yearRange.push(year);
    }
    return ['All', ...yearRange];
  });
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

  const handleQueryTypeChange = (event, newQueryType) => {
    if (newQueryType !== null) {
      setFilters({
        ...filters,
        queryType: newQueryType,
        // Clear the opposite filter when switching
        ...(newQueryType === 'year' ? { startDate: '', endDate: '' } : { year: 'All' })
      });
    }
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

        {/* Query Type Toggle */}
        <Box>
          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
            Query Type
          </Typography>
          <ToggleButtonGroup
            value={filters.queryType || 'year'}
            exclusive
            onChange={handleQueryTypeChange}
            aria-label="query type"
            fullWidth
            size="small"
          >
            <ToggleButton value="year" aria-label="year query">
              Year
            </ToggleButton>
            <ToggleButton value="dateRange" aria-label="date range query">
              Date Range
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Divider />

        {/* Conditional Rendering based on Query Type */}
        {filters.queryType === 'dateRange' || (!filters.queryType && filters.startDate) ? (
          // Date Range Filter
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
        ) : (
          // Year Filter
          <FormControl fullWidth>
            <InputLabel id="year-select-label">Year</InputLabel>
            <Select
              labelId="year-select-label"
              name="year"
              value={filters.year || 'All'}
              label="Year"
              onChange={handleChange}
            >
              {years.map(y => (
                <MenuItem key={y} value={y}>
                  {y}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        <Divider />

        {/* State FormControl */}
        <FormControl fullWidth>
          <InputLabel id="state-select-label">State</InputLabel>
          <Select
            labelId="state-select-label"
            name="state"
            value={filters.state || 'All'}
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