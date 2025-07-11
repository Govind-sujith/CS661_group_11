// src/views/AgencyAnalysis.js (The new Bubble Chart version)
import React, { useState, useEffect, useContext } from 'react';
import { getAgencyPerformance } from '../api/apiService';
import { FilterContext } from '../context/FilterContext';
import Plot from 'react-plotly.js';
import { Paper, Typography, CircularProgress, Box, Grid } from '@mui/material';
import { cleanDataForCharts } from '../utils/dataUtils';

function AgencyAnalysis() {
  const [chartData, setChartData] = useState([]);
  const [layout, setLayout] = useState({});
  const [insights, setInsights] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const { filters } = useContext(FilterContext);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      // Pass filters directly to the API
      const rawData = await getAgencyPerformance(filters);
      const cleanedData = cleanDataForCharts(rawData, ['agency_name', 'fire_count', 'avg_fire_size', 'complex_fire_count']);

      if (cleanedData.length > 0) {
        // Find the agency that handles the most complex fires
        const topComplexAgency = [...cleanedData].sort((a, b) => b.complex_fire_count - a.complex_fire_count)[0];
        setInsights({ topComplexAgency: topComplexAgency.agency_name });

        setChartData([{
          x: cleanedData.map(d => d.fire_count),
          y: cleanedData.map(d => d.avg_fire_size),
          text: cleanedData.map(d => d.agency_name), // Text to show on hover
          mode: 'markers',
          marker: {
            size: cleanedData.map(d => d.complex_fire_count),
            // A scaling factor to make bubbles look good
            sizeref: 2.0 * Math.max(...cleanedData.map(d => d.complex_fire_count)) / (40**2),
            sizemin: 4,
            color: cleanedData.map(d => d.complex_fire_count),
            colorscale: 'Oranges',
            showscale: true,
            colorbar: { title: 'Complex Fires' }
          }
        }]);
        
        setLayout({
          title: 'Agency Workload & Specialization',
          xaxis: { title: 'Total Fires Handled (Volume)' },
          yaxis: { title: 'Average Fire Size (Acres)' },
          hovermode: 'closest',
          font: { family: 'system-ui, sans-serif' }
        });
      } else {
        setChartData([]);
      }
      setIsLoading(false);
    };
    loadData();
  }, [filters]); // <-- Dependency on filters is correctly added

  return (
    <div className="p-8">
      <Grid container spacing={4} alignItems="stretch">
        <Grid item xs={12} md={9}>
          <Paper elevation={3} className="p-4 rounded-lg shadow-lg h-full">
            {isLoading ? (
              <Box className="flex items-center justify-center h-full">
                <CircularProgress /> <Typography sx={{ml: 2}}>Loading Chart Data...</Typography>
              </Box>
            ) : chartData.length === 0 ? (
              <Box className="flex items-center justify-center h-full">
                <Typography variant="h6" className="text-slate-500">No agency data available for the selected filters.</Typography>
              </Box>
            ) : (
              <Plot data={chartData} layout={layout} useResizeHandler={true} style={{ width: '100%', height: '100%', minHeight: '60vh' }} />
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={3}>
          <Paper elevation={3} className="p-4 rounded-lg shadow-lg h-full">
            <Typography variant="h6" gutterBottom>Analysis</Typography>
            <Typography variant="body1" paragraph>
              This chart reveals agency specialization. The bubble size represents the number of large, complex fires an agency manages.
            </Typography>
            {!isLoading && insights.topComplexAgency && (
              <Typography variant="body1" paragraph>
                <strong>Key Insight:</strong> The <strong>{insights.topComplexAgency}</strong> is consistently tasked with handling the most complex, multi-fire incidents, indicating a specialized role in wildfire management.
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </div>
  );
}

export default AgencyAnalysis;
