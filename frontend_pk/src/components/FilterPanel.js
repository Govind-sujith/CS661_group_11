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

// This component is our main filter sidebar. It controls all the user-selectable
// options for querying the wildfire data.
function FilterPanel() {
  // We grab the global filter state and the function to update it from our context.
  const { filters, setFilters } = useContext(FilterContext);

  // Setting up local state to hold the options for our dropdown menus.
  const [states, setStates] = useState([]);
  const [causes, setCauses] = useState([]);
  // The years are static, so we can generate them once and store them.
  const [years] = useState(() => {
    const yearRange = [];
    for (let year = 2015; year >= 1992; year--) {
      yearRange.push(year);
    }
    return ['All', ...yearRange];
  });
  const [isLoading, setIsLoading] = useState(true);

  // This effect runs once when the component first loads.
  // Its job is to fetch all the unique options for the dropdowns from our API.
  useEffect(() => {
    const loadFilterOptions = async () => {
      setIsLoading(true);
      // We can fetch states and causes at the same time for efficiency.
      const [stateData, causeData] = await Promise.all([
        getUniqueStates(),
        getUniqueCauses()
      ]);

      // Once we have the data, we add 'All' to the top and sort the rest alphabetically.
      setStates(['All', ...stateData.sort()]);
      setCauses(['All', ...causeData.sort()]);
      setIsLoading(false); // Loading is done!
    };

    loadFilterOptions();
  }, []); // The empty array [] means this effect will only run one time.

  // A general handler for our dropdown menus (Year, State, Cause).
  const handleChange = (event) => {
    setFilters({
      ...filters,
      [event.target.name]: event.target.value,
    });
  };

  // A specific handler for the date input fields.
  const handleDateChange = (event) => {
    const { name, value } = event.target;
    setFilters({
      ...filters,
      [name]: value,
    });
  };

  // This handles the toggle between searching by 'Year' and 'Date Range'.
  const handleQueryTypeChange = (event, newQueryType) => {
    if (newQueryType !== null) { // The user must select one.
      setFilters({
        ...filters,
        queryType: newQueryType,
        // When the user switches, we clear out the values for the other type
        // to avoid sending conflicting filters to the backend.
        ...(newQueryType === 'year' ? {
          startDate: '',
          endDate: ''
        } : {
          year: 'All'
        })
      });
    }
  };

  // We make sure the query type always has a default value.
  const currentQueryType = filters.queryType || 'year';

  // While the dropdown options are loading, we show a spinner.
  if (isLoading) {
    return (
      <Paper elevation={3} style={{ padding: '1.5rem', borderRadius: '8px', textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body2" sx={{ mt: 2 }}>Loading Filters...</Typography>
      </Paper>
    );
  }

  // This is the main JSX for rendering the filter panel.
  return (
    <Paper elevation={3} style={{ padding: '1.5rem', borderRadius: '8px' }}>
      <Typography variant="h6" gutterBottom>Filters</Typography>
      <Box className="space-y-6 mt-4">

        {/* The toggle buttons for choosing the query type. */}
        <Box>
          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
            Query Type
          </Typography>
          <ToggleButtonGroup
            value={currentQueryType}
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

        {/* Here we conditionally render either the Date Range pickers or the Year dropdown. */}
        {currentQueryType === 'dateRange' ? (
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
          // The dropdown for selecting a single year.
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

        {/* The dropdown for selecting a state. */}
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

        {/* The dropdown for selecting a fire cause. */}
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
