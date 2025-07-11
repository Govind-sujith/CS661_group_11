// src/components/SummaryStatsPanel.js
import React, { useState, useEffect, useContext } from 'react';
import { getSummaryStats } from '../api/apiService';
import { FilterContext } from '../context/FilterContext';
import { Paper, Typography, Box, CircularProgress, Divider } from '@mui/material';

function SummaryStatsPanel() {
  const [stats, setStats] = useState({ total_incidents: 0, total_acres: 0, avg_acres: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const { filters } = useContext(FilterContext);

  useEffect(() => {
    setIsLoading(true);
    getSummaryStats(filters).then(data => {
      setStats(data);
      setIsLoading(false);
    });
  }, [filters]);

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
      <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
        Summary
      </Typography>
      <Typography variant="caption" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
        Showing results {renderFilterText()}
      </Typography>
      <Divider sx={{ my: 1 }} />
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}><CircularProgress size={24} /></Box>
      ) : (
        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Box>
            <Typography variant="h5">{stats.total_incidents.toLocaleString()}</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>Total Incidents</Typography>
          </Box>
          <Box sx={{ mt: 2 }}>
            <Typography variant="h5">{stats.total_acres.toLocaleString(undefined, {maximumFractionDigits: 0})}</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>Total Acres Burned</Typography>
          </Box>
        </Box>
      )}
    </Paper>
  );
}

export default SummaryStatsPanel;