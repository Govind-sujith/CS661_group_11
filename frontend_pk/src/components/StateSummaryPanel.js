// src/components/StateSummaryPanel.js
import React, { useState, useEffect, useContext } from 'react';
// We need to import the specific API function to get our state data.
import { getStateSummary } from '../api/apiService';
import { FilterContext } from '../context/FilterContext';
import { Paper, Typography, Box, CircularProgress, List, ListItem, ListItemText } from '@mui/material';

// This component displays a simple list of states and the number of fires in each.
function StateSummaryPanel() {
  // Setting up local state to hold the summary data and track loading status.
  const [summaryData, setSummaryData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  // We need access to the global filters to know which year is selected.
  const { filters } = useContext(FilterContext);

  // This `useEffect` hook re-runs whenever the global 'filters' object changes.
  useEffect(() => {
    setIsLoading(true); // Show the spinner while we fetch new data.
    const apiFilters = {};
    // We only want to pass the year filter to this specific API endpoint.
    if (filters.year && filters.year !== 'All') {
      apiFilters.year = filters.year;
    }
    
    // Call the API with the selected year.
    getStateSummary(apiFilters).then(data => {
      // Once the data arrives, we store it in our state and hide the spinner.
      setSummaryData(data);
      setIsLoading(false);
    });
  }, [filters]); // This dependency array tells React to re-run the effect when 'filters' changes.

  return (
    <Paper elevation={3} sx={{ p: 2 }}>
      <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
        Fires by State/Territory
      </Typography>
      {/* We'll show a loading spinner while fetching, otherwise we show the list. */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}><CircularProgress /></Box>
      ) : (
        // A simple list to display the state-by-state fire counts.
        <List dense={true} sx={{ maxHeight: 200, overflow: 'auto', mt: 1 }}>
          {summaryData.map(item => (
            <ListItem key={item.group} disableGutters>
              <ListItemText 
                primary={item.group} 
                secondary={`${item.count.toLocaleString()} fires`} 
              />
            </ListItem>
          ))}
        </List>
      )}
    </Paper>
  );
}

export default StateSummaryPanel;
