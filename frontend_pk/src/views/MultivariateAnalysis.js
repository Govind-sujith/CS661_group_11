// src/views/MultivariateAnalysis.js (FINAL, CORRECTED VERSION)
import React, { useState, useEffect, useContext } from 'react';
import { getCorrelationData } from '../api/apiService';
import { FilterContext } from '../context/FilterContext';
import { cleanDataForCharts } from '../utils/dataUtils';
import Plot from 'react-plotly.js';
import { CircularProgress, Paper, Typography, Box } from '@mui/material';

function MultivariateAnalysis() {
  const [plotData, setPlotData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [colorLegend, setColorLegend] = useState([]);
  const [sampleSize, setSampleSize] = useState(0); // <-- NEW STATE
  const { filters } = useContext(FilterContext);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const response = await getCorrelationData(filters); // <-- API now returns an object
      
      setSampleSize(response.sample_size); // <-- Store the sample size
      const data = cleanDataForCharts(response.data, ['fire_size', 'discovery_doy', 'fire_duration_days', 'cause']); // Use the 'data' key

      // Step 1: Count causes and sort by frequency
      const causeCount = {};
      data.forEach(d => {
        causeCount[d.cause] = (causeCount[d.cause] || 0) + 1;
      });

      const sortedCauses = Object.entries(causeCount)
        .sort((a, b) => b[1] - a[1])
        .map(entry => entry[0]);

      const topCauses = sortedCauses.slice(0, 7);

      // Step 2: Assign colors to top causes
      const colorPalette = [
        '#1f77b4', '#ff7f0e', '#2ca02c',
        '#d62728', '#9467bd', '#8c564b', '#e377c2'
      ];
      const colorMap = {};
      topCauses.forEach((cause, i) => {
        colorMap[cause] = colorPalette[i];
      });

      // Step 3: Color and hover data for each point
      const colors = data.map(d =>
        colorMap[d.cause] || '#bbbbbb'
      );

      const hoverText = data.map(d =>
        `${d.cause}`
      );

      // Step 4: Set Plotly trace
      const dimensions = [
        { label: 'Fire Size (acres)', values: data.map(d => d.fire_size) },
        { label: 'Day of Year', values: data.map(d => d.discovery_doy) },
        { label: 'Duration (days)', values: data.map(d => d.fire_duration_days) }
      ];

      const splomTrace = {
        type: 'splom',
        dimensions,
        marker: {
          color: colors,
          size: 5,
          line: { color: 'white', width: 0.5 }
        },
        text: hoverText,
        hoverinfo: 'text'
      };

      setPlotData([splomTrace]);

      // Step 5: Set legend items
      const legend = topCauses.map((cause, i) => ({
        cause,
        color: colorPalette[i]
      }));
      setColorLegend(legend);
      
      setIsLoading(false);
    };

    loadData();
  }, [filters]);

  // Determine the correct message to display
  const descriptionText = sampleSize === 5000 
    ? `(Based on a random sample of 5,000 fires)`
    : `(Showing all ${sampleSize.toLocaleString()} fires matching the selected filters)`;

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">Multivariate Analysis (SPLOM)</h2>
      <p className="mb-6 text-slate-600">
        This Scatterplot Matrix helps discover relationships between different fire characteristics. Each small chart plots two variables against each other.
        Color indicates the <strong>cause</strong> of the fire. {descriptionText}
      </p>

      {/* 🟢 Legend */}
      <Box className="flex flex-wrap gap-4 mb-4">
        {colorLegend.map(item => (
          <Box key={item.cause} className="flex items-center gap-2">
            <div style={{
              width: 16,
              height: 16,
              backgroundColor: item.color,
              borderRadius: 4
            }} />
            <Typography variant="body2">{item.cause}</Typography>
          </Box>
        ))}
        {colorLegend.length > 0 && (
          <Box className="flex items-center gap-2">
            <div style={{
              width: 16,
              height: 16,
              backgroundColor: '#bbbbbb',
              borderRadius: 4
            }} />
            <Typography variant="body2">Other</Typography>
          </Box>
        )}
      </Box>

      <Paper elevation={3} className="bg-white p-4 rounded-lg shadow h-[75vh]">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>Loading Analysis Data...</Typography>
          </div>
        ) : (
          <Plot
            data={plotData}
            layout={{ title: 'Correlation between Fire Metrics' }}
            useResizeHandler={true}
            style={{ width: '100%', height: '100%' }}
          />
        )}
      </Paper>
    </div>
  );
}
export default MultivariateAnalysis;
