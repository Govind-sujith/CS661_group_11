import React, { useState, useEffect, useContext } from 'react';
import { getSummaryStats } from '../api/apiService';
import { FilterContext } from '../context/FilterContext';
import { Paper, Typography, Box, CircularProgress, Divider, Grid } from '@mui/material';

// This component is the main summary card that shows the big numbers like
// total incidents and acres burned.
function SummaryStatsPanel() {
  // We'll set up a state to hold all the stats we get back from the API.
  const [stats, setStats] = useState({
    range_total_incidents: 0,
    range_total_acres: 0,
    range_avg_acres: 0,
    cumulative_total_incidents: 0,
    cumulative_total_acres: 0,
    cumulative_avg_acres: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  // We need to know what the current filters are to fetch the correct stats.
  const { filters } = useContext(FilterContext);

  // This effect will re-run any time the user changes the filters.
  useEffect(() => {
    setIsLoading(true); // Show a spinner while we're fetching.
    // Call the API with the current set of filters.
    getSummaryStats(filters).then(data => {
      // Once the data comes back, update our state and hide the spinner.
      setStats(data);
      setIsLoading(false);
    });
  }, [filters]); // This dependency ensures the effect runs when filters change.

  // A little helper function to build a human-readable sentence
  // describing the currently active filters.
  const renderFilterText = () => {
    let parts = [];
    if (filters.year && filters.year !== 'All') parts.push(`in ${filters.year}`);
    if (filters.state && filters.state !== 'All') parts.push(`in ${filters.state}`);
    if (filters.cause && filters.cause !== 'All') parts.push(`from ${filters.cause}`);
    if (parts.length === 0) return "for all fires.";
    return parts.join(' ');
  };

  return (
    <Paper elevation={3} sx={{ p: 2 }}>
      <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Summary</Typography>
      <Typography variant="caption" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
        Showing results {renderFilterText()}
      </Typography>
      <Divider sx={{ my: 1 }} />

      {/* Show a spinner during the fetch, otherwise show the stats. */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}><CircularProgress size={24} /></Box>
      ) : (
        <Grid container spacing={2}>
          {/* This is the left column for the selected date range. */}
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>Selected Date Range</Typography>
            <Typography variant="h6">{stats.range_total_incidents.toLocaleString()}</Typography>
            <Typography variant="body2">Total Incidents</Typography>
            <Typography variant="h6" sx={{ mt: 1 }}>{stats.range_total_acres.toLocaleString(undefined, { maximumFractionDigits: 0 })}</Typography>
            <Typography variant="body2">Total Acres Burned</Typography>
          </Grid>

          {/* This is the right column for the cumulative stats. */}
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>Cumulative Up to Date</Typography>
            <Typography variant="h6">{stats.cumulative_total_incidents.toLocaleString()}</Typography>
            <Typography variant="body2">Total Incidents</Typography>
            <Typography variant="h6" sx={{ mt: 1 }}>{stats.cumulative_total_acres.toLocaleString(undefined, { maximumFractionDigits: 0 })}</Typography>
            <Typography variant="body2">Total Acres Burned</Typography>
          </Grid>
        </Grid>
      )}
    </Paper>
  );
}

export default SummaryStatsPanel;
