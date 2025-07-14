import React, { useState, useEffect, useContext } from 'react';
import {
  getDiurnalData,
  getWeeklySummaryData,
  getDurationDistributionData,
  getSizeClassByCauseData
} from '../api/apiService';
import { FilterContext } from '../context/FilterContext';
import Plot from 'react-plotly.js';
import { Paper, Typography, CircularProgress, Box, Grid } from '@mui/material';
import { cleanDataForCharts } from '../utils/dataUtils';
// This component brings together several of our other charting components.
import DisasterRadialD3 from './DisasterRadialD3';
import SeasonalTrendsLineChart from './SeasonalTrendsLineChart';
import StateHeatMap from './StateHeatMap';

// This component acts as a main dashboard, arranging several different data
// visualizations into a grid layout.
function TemporalAnalysis() {
  // We need to manage the state for each of the Plotly charts on this page.
  const [diurnalChart, setDiurnalChart] = useState({ data: [], layout: {} });
  const [weeklyChart, setWeeklyChart] = useState({ data: [], layout: {} });
  const [durationChart, setDurationChart] = useState({ data: [], layout: {} });
  const [sizeClassChart, setSizeClassChart] = useState({ data: [], layout: {} });
  const [isLoading, setIsLoading] = useState(true);
  // We get the global filters to pass them to our data fetching functions.
  const { filters } = useContext(FilterContext);

  // This is a little utility effect to prevent users from accidentally
  // zooming the whole browser page, which can mess up the chart layouts.
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && (e.key === '+' || e.key === '-' || e.key === '=')) {
        e.preventDefault();
        document.body.style.zoom = '100%';
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // This is the main data fetching effect. It runs whenever the filters change.
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      // We can fetch the data for all our charts at the same time for better performance.
      const [
        diurnalRawData,
        weeklyRawData,
        durationRawData,
        sizeClassRawData
      ] = await Promise.all([
        getDiurnalData(filters),
        getWeeklySummaryData(filters),
        getDurationDistributionData(filters),
        getSizeClassByCauseData(filters)
      ]);

      // --- Process Diurnal (24-hour) Data ---
      const diurnalCleaned = cleanDataForCharts(diurnalRawData, ['hour', 'fire_count']);
      if (diurnalCleaned.length > 0) {
        const hours = diurnalCleaned.map(d => d.hour);
        const fireCounts = diurnalCleaned.map(d => d.fire_count);
        setDiurnalChart({
          data: [{
            theta: hours.map(h => h * 15), // Convert hour to degrees for the polar chart.
            r: fireCounts,
            type: 'barpolar',
            marker: { color: 'rgba(255, 140, 0, 0.8)' }
          }],
          layout: {
            title: {text:'Fire Count by Hour of Day (radial)'},
            font: { family: 'system-ui, sans-serif' },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            polar: {
              radialaxis: { visible: true, range: [0, Math.max(...fireCounts)] },
              angularaxis: {
                tickvals: [0, 90, 180, 270],
                ticktext: ['12 AM', '6 AM', '12 PM', '6 PM'],
                direction: "clockwise"
              }
            }
          }
        });
      } else {
        setDiurnalChart({ data: [] });
      }

      // --- Process Weekly Data ---
      const weeklyCleaned = cleanDataForCharts(weeklyRawData, ['day_of_week', 'cause', 'count']);
      if (weeklyCleaned.length > 0) {
        const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const causes = [...new Set(weeklyCleaned.map(d => d.cause))].sort();
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
          layout: {
            title: {text: 'Weekly Fire Cadence by Cause Category'},
            barmode: 'stack', // Stack the bars for different causes.
            xaxis: { categoryorder: 'array', categoryarray: daysOrder },
            font: { family: 'system-ui, sans-serif' },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)'
          }
        });
      } else {
        setWeeklyChart({ data: [] });
      }

      // --- Process Duration Data ---
      const durationCleaned = cleanDataForCharts(durationRawData, ['duration_bin', 'fire_count']);
      if (durationCleaned.length > 0) {
        setDurationChart({
          data: [{
            x: durationCleaned.map(d => d.duration_bin),
            y: durationCleaned.map(d => d.fire_count),
            type: 'scatter',
            mode: 'lines+markers',
            fill: 'tozeroy', // Fill the area under the line.
            fillcolor: 'rgba(34, 197, 94, 0.3)',
            line: { shape: 'spline', color: '#22c55e', width: 3 }
          }],
          layout: {
            title: {text:'Fires by Containment Duration (Y-Log Scale)'},
            xaxis: { title: 'Duration (Days)', type: 'category' },
            yaxis: { title: 'Number of Fires (Log Scale)', type: 'log' }, // Use a log scale for the y-axis.
            font: { family: 'system-ui, sans-serif' },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)'
          }
        });
      } else {
        setDurationChart({ data: [] });
      }

      // --- Process Size Class Data ---
      const sizeClassCleaned = cleanDataForCharts(sizeClassRawData, ['size_class', 'cause', 'fire_count']);
      if (sizeClassCleaned.length > 0) {
        const dataMap = {};
        sizeClassCleaned.forEach(item => {
          if (!dataMap[item.size_class]) dataMap[item.size_class] = {};
          dataMap[item.size_class][item.cause] = item.fire_count;
        });
        const sizeClasses = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
        const causes = [...new Set(sizeClassCleaned.map(d => d.cause))].sort();
        const traces = causes.map(cause => ({
          y: sizeClasses,
          x: sizeClasses.map(sc => (dataMap[sc] && dataMap[sc][cause]) || 0),
          name: cause,
          type: 'bar',
          orientation: 'h' // Horizontal bars.
        }));
        setSizeClassChart({
          data: traces,
          layout: {
            title: {text:'Fires by Size Class and Top Causes'},
            barmode: 'stack',
            yaxis: { title: 'Fire Size Class', type: 'category' },
            xaxis: { title: 'Fire Count' },
            font: { family: 'system-ui, sans-serif' },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)'
          }
        });
      } else {
        setSizeClassChart({ data: [] });
      }

      setIsLoading(false);
    };

    loadData();
  }, [filters]);

  // A helper function to render a Plotly chart, including loading and empty states.
  const renderPlotlyChart = (chartState, title) => {
    if (isLoading) {
      return (
        <Box className="flex items-center justify-center h-full">
          <CircularProgress /> <Typography sx={{ ml: 2 }}>Loading {title}...</Typography>
        </Box>
      );
    }
    if (!chartState.data || chartState.data.length === 0) {
      return (
        <Box className="flex items-center justify-center h-full">
          <Typography variant="h6" className="text-slate-500">No data available for {title}.</Typography>
        </Box>
      );
    }
    return (
      <Plot
        data={chartState.data}
        layout={chartState.layout}
        useResizeHandler={true}
        style={{ width: '100%', height: '100%' }}
      />
    );
  };

// This is the main JSX for the dashboard layout.
return (
  <div className="p-4 sm:p-8 flex justify-center" style={{ backgroundColor: '#fff' }}>
    <div style={{ width: '100%', maxWidth: '1600px', backgroundColor: '#fff' }}>
      <Grid container direction="column" spacing={4}>

        {/* The first row of charts. */}
        <Grid container item spacing={12} justifyContent="center">
          <Grid item xs={12} md={4}>
            <Paper
              className="p-4 rounded-lg shadow-lg h-full"
              style={{
                minHeight: '60vh',
                aspectRatio: '20 / 10',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#fff'
              }}
            >
              <StateHeatMap />
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper
              className="p-4 rounded-lg shadow-lg h-full"
              style={{
                minHeight: '60vh',
                aspectRatio: '10 / 10',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#fff'
              }}
            >
              <DisasterRadialD3 />
            </Paper>
          </Grid>
        </Grid>

        {/* The second row of charts. */}
        <Grid container item spacing={4.7} justifyContent="center">
          <Grid item xs={6} md={8}>
            <Paper
              className="p-4 rounded-lg shadow-lg h-full"
              style={{
                minHeight: '55vh',
                aspectRatio: '10 / 10',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#fff'
              }}
            >
              {renderPlotlyChart(diurnalChart, "Diurnal Cycle")}
            </Paper>
          </Grid>
          <Grid item xs={6} md={8}>
            <Paper
              className="p-4 rounded-lg shadow-lg h-full"
              style={{
                minHeight: '55vh',
                aspectRatio: '24.3 / 10',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#fff'
              }}
            >
              <SeasonalTrendsLineChart />
            </Paper>
          </Grid>
        </Grid>

        {/* The third row of charts. */}
        <Grid container item spacing={2} justifyContent="center">
          <Grid item xs={6} md={5}>
            <Paper
              className="p-4 rounded-lg shadow-lg h-full"
              style={{
                minHeight: '42vh',
                aspectRatio: '15 / 10',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#fff'
              }}
            >
              {renderPlotlyChart(weeklyChart, "Weekly Cadence")}
            </Paper>
          </Grid>
          <Grid item xs={6} md={5}>
            <Paper
              className="p-4 rounded-lg shadow-lg h-full"
              style={{
                minHeight: '42vh',
                aspectRatio: '15 / 10',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#fff'
              }}
            >
              {renderPlotlyChart(durationChart, "Duration Distribution")}
            </Paper>
          </Grid>
          <Grid item xs={6} md={5}>
            <Paper
              className="p-4 rounded-lg shadow-lg h-full"
              style={{
                minHeight: '42vh',
                aspectRatio: '15 / 10',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#fff'
              }}
            >
              {renderPlotlyChart(sizeClassChart, "Size Class by Cause")}
            </Paper>
          </Grid>
        </Grid>

      </Grid>
    </div>
  </div>
);

}

export default TemporalAnalysis;
