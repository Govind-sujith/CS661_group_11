// src/components/DateRangeOnlyPanel.js
import React, { useContext } from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { FilterContext } from '../context/FilterContext';

// A handy map to show full state names instead of just the abbreviations.
const STATE_ABBREVIATIONS = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  DC: 'DC', PR: 'Puerto Rico', GU: 'Guam', VI: 'U.S. Virgin Islands', MP: 'Northern Mariana Is'
};

// This component provides a simple filter panel with just date pickers and a state selector.
const DateRangeOnlyPanel = () => {
  // We get the current filters and the function to update them from our global context.
  const { filters, setFilters } = useContext(FilterContext);

  // Handles changes to the start and end date fields.
  const handleDateChange = (e) => {
    const { name, value } = e.target;
    // A little validation to make sure the date range is logical.
    if (name === 'startDate' && value > filters.endDate) return;
    if (name === 'endDate' && value < filters.startDate) return;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  // Handles changes to the state dropdown.
  const handleStateChange = (e) => {
    setFilters(prev => ({ ...prev, state: e.target.value }));
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'row', gap: 2, alignItems: 'center', padding: '10px 20px' }}>
      <TextField
        name="startDate"
        label="From"
        type="date"
        size="small"
        value={filters.startDate}
        onChange={handleDateChange}
        inputProps={{ min: '1992-01-01', max: '2015-12-31' }}
      />
      <TextField
        name="endDate"
        label="To"
        type="date"
        size="small"
        value={filters.endDate}
        onChange={handleDateChange}
        inputProps={{ min: '1992-01-01', max: '2015-12-31' }}
      />
      {/* This is just a placeholder for now. */}
      <FormControl size="small">
        <InputLabel>State</InputLabel>
        <Select
          value={filters.state}
          label="State"
          onChange={handleStateChange}
        >
          <MenuItem value="All">All</MenuItem>
        </Select>
      </FormControl>
      {/* If a state is selected on the map, this text will show which one. */}
      {filters.state !== 'All' && (
        <Box sx={{ fontSize: '12px', color: 'gray', ml: 1 }}>
          Selected on map: {filters.state}
        </Box>
      )}
    </Box>
  );
};

export default DateRangeOnlyPanel;
