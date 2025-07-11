// src/views/TemporalAnalysis.js (The new Two-Chart Dashboard version)
import React, { useState, useEffect, useContext } from 'react';
import { getTemporalData, getWeeklyCadence } from '../api/apiService';
import { FilterContext } from '../context/FilterContext';
import Plot from 'react-plotly.js';
import { Paper, Typography, CircularProgress, Box, Grid } from '@mui/material';
import { cleanDataForCharts } from '../utils/dataUtils';

function TemporalAnalysis() {
  const [polarChart, setPolarChart] = useState({ data: [], layout: {} });
  const [weeklyChart, setWeeklyChart] = useState({ data: [], layout: {} });
  const [isLoading, setIsLoading] = useState(true);
  const { filters } = useContext(FilterContext);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      // Pass filters directly to the API
      const [polarRawData, weeklyRawData] = await Promise.all([
        getTemporalData(filters),
        getWeeklyCadence(filters)
      ]);

      // --- Process Polar Chart Data ---
      const polarCleaned = cleanDataForCharts(polarRawData, ['hour', 'fire_count']);
      if (polarCleaned.length > 0) {
        const hours = polarCleaned.map(d => d.hour);
        const fireCounts = polarCleaned.map(d => d.fire_count);

        setPolarChart({
            data: [{
                theta: hours.map(h => h * 15),
                r: fireCounts,
                type: 'barpolar',
                marker: { color: 'rgba(255, 140, 0, 0.7)' }
            }],
            layout: {
                title: 'Fire Count by Hour of Discovery',
                font: { family: 'system-ui, sans-serif', size: 12 },
                polar: {
                    radialaxis: { visible: true, range: [0, Math.max(...fireCounts)] },
                    angularaxis: {
                        tickvals: [0, 45, 90, 135, 180, 225, 270, 315],
                        ticktext: ['12 AM', '3 AM', '6 AM', '9 AM', '12 PM', '3 PM', '6 PM', '9 PM']
                    }
                }
            }
        });
      } else {
        setPolarChart({ data: [] });
      }
      
      // --- Process Weekly Cadence Chart Data ---
      const weeklyCleaned = cleanDataForCharts(weeklyRawData, ['day_of_week', 'cause', 'count']);
      if (weeklyCleaned.length > 0) {
        const daysOrder = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const causes = [...new Set(weeklyCleaned.map(d => d.cause))];
        const traces = causes.map(cause => ({
          x: daysOrder,
          y: daysOrder.map(day => {
            const item = weeklyCleaned.find(d => d.day_of_week === day && d.cause === cause);
            return item ? item.count : 0;
          }),
          name: cause,
          type: 'bar'
        }));
        
        setWeeklyChart({
          data: traces,
          layout: { title: 'Weekly Fire Cadence by Cause', barmode: 'stack', xaxis: { categoryorder: 'array', categoryarray: daysOrder }, font: { family: 'system-ui, sans-serif' } }
        });
      } else {
        setWeeklyChart({ data: [] });
      }
      setIsLoading(false);
    };
    loadData();
  }, [filters]); // <-- Dependency on filters is correctly added

  return (
    <div className="p-8">
      <Grid container spacing={4}>
        <Grid item xs={12} lg={6}>
          <Paper elevation={3} className="p-4 rounded-lg shadow-lg h-full min-h-[60vh]">
            {isLoading ? (
              <Box className="flex items-center justify-center h-full">
                <CircularProgress /> <Typography sx={{ml: 2}}>Loading Charts...</Typography>
              </Box>
            ) : polarChart.data.length === 0 ? (
               <Box className="flex items-center justify-center h-full">
                <Typography variant="h6" className="text-slate-500">No 24-hour data available.</Typography>
              </Box>
            ) : (
              <Plot data={polarChart.data} layout={polarChart.layout} useResizeHandler={true} style={{ width: '100%', height: '100%' }} />
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} lg={6}>
          <Paper elevation={3} className="p-4 rounded-lg shadow-lg h-full min-h-[60vh]">
            {isLoading ? (
              <Box className="flex items-center justify-center h-full">
                <CircularProgress /> <Typography sx={{ml: 2}}>Loading Charts...</Typography>
              </Box>
            ) : weeklyChart.data.length === 0 ? (
              <Box className="flex items-center justify-center h-full">
                <Typography variant="h6" className="text-slate-500">No weekly data available.</Typography>
              </Box>
            ) : (
              <>
                <Plot data={weeklyChart.data} layout={weeklyChart.layout} useResizeHandler={true} style={{ width: '100%', height: '85%' }} />
                <Typography variant="body2" sx={{p: 2, fontStyle: 'italic', color: 'text.secondary'}}>
                  This chart reveals the human impact on fires. Natural causes like Lightning are steady, while human-related causes spike on weekends.
                </Typography>
              </>
            )}
          </Paper>
        </Grid>
      </Grid>
    </div>
  );
}
export default TemporalAnalysis;
