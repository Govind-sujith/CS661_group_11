// src/components/StateSummaryPanel.js
import React, { useState, useEffect, useContext } from 'react';
import { getStateSummary } from '../api/apiService';
import { FilterContext } from '../context/FilterContext';
import { Paper, Typography, Box, CircularProgress, List, ListItem, ListItemText } from '@mui/material';

function StateSummaryPanel() {
  const [summaryData, setSummaryData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { filters } = useContext(FilterContext);

  useEffect(() => {
    setIsLoading(true);
    const apiFilters = {};
    if (filters.year && filters.year !== 'All') apiFilters.year = filters.year;
    
    getStateSummary(apiFilters).then(data => {
      setSummaryData(data);
      setIsLoading(false);
    });
  }, [filters]);

  return (
    <Paper elevation={3} sx={{ p: 2 }}>
      <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
        Fires by State/Territory
      </Typography>
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}><CircularProgress /></Box>
      ) : (
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