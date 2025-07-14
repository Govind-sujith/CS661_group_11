// src/views/AgencyAnalysis.js
import React, { useState, useEffect, useContext } from 'react';
import { getAgencyPerformance } from '../api/apiService';
import { FilterContext } from '../context/FilterContext';
import Plot from 'react-plotly.js';
import {
  Paper,
  Typography,
  CircularProgress,
  Box,
  Grid,
  Divider,
  List,
  ListItem,
  ListItemText,
  Chip
} from '@mui/material';
// We're pulling in some machine learning libraries to do the analysis right here in the browser.
import { kmeans } from 'ml-kmeans';
import tSNE from 'tsne-js';

// This helper function prepares our data for the machine learning models.
// It applies a log transformation to handle skewed data and then normalizes everything
// to a common scale (0 to 1), which helps the algorithms work effectively.
const logAndNormalizeData = (data) => {
  const metrics = ['fire_count', 'avg_fire_size', 'avg_duration', 'complex_fire_count'];
  const logTransformedData = data.map(d => ({
    fire_count: Math.log1p(d.fire_count),
    avg_fire_size: Math.log1p(d.avg_fire_size),
    avg_duration: Math.log1p(d.avg_duration),
    complex_fire_count: Math.log1p(d.complex_fire_count),
  }));

  const normalized = {};
  metrics.forEach(metric => {
    const values = logTransformedData.map(d => d[metric]);
    const min = Math.min(...values);
    const max = Math.max(...values);
    normalized[metric] = max - min === 0 ? values.map(() => 0.5) : values.map(v => (v - min) / (max - min));
  });

  return data.map((d, i) => ({
    ...d,
    normalizedVector: metrics.map(m => normalized[m][i])
  }));
};

// This component performs a fairly complex analysis on agency performance data.
function AgencyAnalysis() {
  const [plotData, setPlotData] = useState([]);
  const [layout, setLayout] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { filters } = useContext(FilterContext);
  const [clusterProfiles, setClusterProfiles] = useState([]);

  const clusterColors = ['#1f77b4', '#ff7f0e', '#2ca02c'];

  // This is where all the data fetching and processing happens. It re-runs when filters change.
  useEffect(() => {
    const loadAndProcessData = async () => {
      setIsLoading(true);
      setError(null);
      setClusterProfiles([]);
      try {
        const rawData = await getAgencyPerformance(filters);

        // We need to make sure our data is clean before we try to analyze it.
        const requiredKeys = ['fire_count', 'avg_fire_size', 'avg_duration', 'complex_fire_count'];
        const cleanedData = rawData.filter(d =>
          requiredKeys.every(key => d[key] !== null && d[key] !== undefined)
        );

        // The analysis needs a minimum amount of data to work properly.
        if (!cleanedData || cleanedData.length < 4) {
          setError('Not enough agency data available for the selected filters to perform clustering.');
          setPlotData([]);
          setIsLoading(false);
          return;
        }

        // Step 1: Normalize the data.
        const normalizedAgencies = logAndNormalizeData(cleanedData);
        const highDimData = normalizedAgencies.map(d => d.normalizedVector);

        // Step 2: Run K-Means to group agencies into 3 clusters.
        const clusters = kmeans(highDimData, 3, { initialization: 'kmeans++' });
        const clusterAssignments = clusters.clusters;

        // Step 3: Use t-SNE to reduce the complex, multi-dimensional data down to a 2D plot.
        const tsne = new tSNE({
          epsilon: 10,
          perplexity: Math.min(5, cleanedData.length - 1),
          dim: 2
        });
        tsne.init({ data: highDimData, type: 'dense' });
        tsne.run();
        const tsneOutput = tsne.getOutputScaled();

        // Sometimes t-SNE can fail if the data is too uniform. We'll catch that here.
        const hasInvalidTsneOutput = tsneOutput.some(coords => coords.some(c => isNaN(c)));
        if (hasInvalidTsneOutput) {
          throw new Error("Analysis failed: The filtered data is too uniform or sparse for dimensionality reduction.");
        }

        // Combine all our results into a final data structure for plotting.
        const finalData = cleanedData.map((agency, i) => ({
          ...agency,
          x: tsneOutput[i][0],
          y: tsneOutput[i][1],
          cluster: clusterAssignments[i]
        }));

        // Now, let's create some descriptive profiles for each cluster.
        const profiles = [];
        for (let i = 0; i < 3; i++) {
          const clusterPoints = finalData.filter(d => d.cluster === i);
          if (clusterPoints.length > 0) {
            const avgFireCount = clusterPoints.reduce((sum, d) => sum + d.fire_count, 0) / clusterPoints.length;
            const avgFireSize = clusterPoints.reduce((sum, d) => sum + d.avg_fire_size, 0) / clusterPoints.length;
            const topAgencies = clusterPoints.sort((a, b) => b.fire_count - a.fire_count).slice(0, 3).map(d => d.agency_name);

            // Give each profile a descriptive name based on its characteristics.
            let profileName = "Balanced Responders";
            if (avgFireCount > (rawData.reduce((s, d) => s + d.fire_count, 0) / rawData.length) * 1.5) {
              profileName = "High Volume Specialists";
            } else if (avgFireSize > (rawData.reduce((s, d) => s + d.avg_fire_size, 0) / rawData.length) * 1.5) {
              profileName = "Large Incident Command";
            }

            profiles.push({
              id: i,
              name: profileName,
              agencies: topAgencies,
              avgFireSize,
              color: clusterColors[i]
            });
          }
        }
        setClusterProfiles(profiles);

        // Prepare the data traces for our Plotly chart.
        const maxFireCount = Math.max(...finalData.map(d => d.fire_count));
        const traces = [];
        for (let i = 0; i < 3; i++) {
          const clusterPoints = finalData.filter(d => d.cluster === i);
          if (clusterPoints.length > 0) {
            traces.push({
              x: clusterPoints.map(d => d.x),
              y: clusterPoints.map(d => d.y),
              text: clusterPoints.map(d =>
                `<b>${d.agency_name}</b><br>Fires: ${d.fire_count.toLocaleString()}<br>Avg Size: ${d.avg_fire_size.toFixed(0)} acres`
              ),
              hoverinfo: 'text',
              mode: 'markers',
              type: 'scatter',
              name: `Profile ${i + 1}: ${profiles.find(p => p.id === i)?.name || ''}`,
              marker: {
                size: clusterPoints.map(d => d.fire_count), // Marker size represents the number of fires.
                sizemode: 'area',
                sizeref: 2.0 * maxFireCount / (60 ** 2),
                sizemin: 6,
                color: clusterColors[i],
                opacity: 0.8,
                line: { width: 1, color: 'white' }
              }
            });
          }
        }
        setPlotData(traces);

        // Set up the layout and appearance of the Plotly chart.
        setLayout({
          title: 'Agency Performance Profiling (via t-SNE & K-Means)',
          xaxis: { title: 't-SNE Dimension 1', showticklabels: false, zeroline: false },
          yaxis: { title: 't-SNE Dimension 2', showticklabels: false, zeroline: false },
          dragmode: 'lasso',
          hovermode: 'closest',
          showlegend: true,
          font: { family: 'system-ui, sans-serif' },
          legend: { orientation: 'h', x: 0, y: -0.15 },
          margin: { t: 40, r: 30, l: 30, b: 110 },
          paper_bgcolor: 'rgba(0,0,0,0)',
          plot_bgcolor: 'rgba(0,0,0,0)'
        });

      } catch (err) {
        console.error("Failed to process agency data:", err);
        setError(err.message || "An error occurred while analyzing the data.");
      } finally {
        setIsLoading(false);
      }
    };

    loadAndProcessData();
  }, [filters]);

  return (
    <div className="p-4 sm:p-8">
      <Grid container spacing={4} alignItems="stretch">
        {/* Main chart panel on the left */}
        <Grid item xs={12} md={9}>
          <Paper elevation={3} className="p-4 rounded-lg shadow-lg h-full flex flex-col">
            {isLoading ? (
              <Box className="flex items-center justify-center h-full">
                <CircularProgress /> <Typography sx={{ ml: 2 }}>Analyzing Agency Data...</Typography>
              </Box>
            ) : error ? (
              <Box className="flex items-center justify-center h-full">
                <Typography variant="h6" className="text-slate-500">{error}</Typography>
              </Box>
            ) : (
              <>
                <Plot
                  data={plotData}
                  layout={layout}
                  useResizeHandler={true}
                  style={{ width: '100%', height: '100%', minHeight: '60vh' }}
                />
                <Typography
                  variant="caption"
                  align="center"
                  sx={{ color: 'text.secondary', mt: 1 }}
                >
                  Clusters based on normalized fire count, size, duration, and complexity.
                </Typography>
              </>
            )}
          </Paper>
        </Grid>

        {/* Informational panels on the right */}
        <Grid item xs={12} md={3}>
          <Paper elevation={3} className="p-4 rounded-lg shadow-lg h-full">
            <Typography variant="h6" gutterBottom>Automated Analysis</Typography>
            <Divider sx={{ my: 1 }} />
            <Typography variant="body1" paragraph>
              This chart uses <b>t-SNE</b> and <b>K-Means clustering</b> to automatically group agencies into distinct performance profiles, identified by color.
            </Typography>
            <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
              This visualization helps uncover hidden similarities and categorizes agencies based on their real-world operational footprint.
            </Typography>
          </Paper>

          {/* This panel shows the details of the discovered profiles. */}
          {!isLoading && !error && clusterProfiles.length > 0 && (
            <Paper elevation={3} className="p-4 mt-4 rounded-lg shadow-lg h-full">
              <Typography variant="h6" gutterBottom>Discovered Profiles</Typography>
              <Divider sx={{ my: 1 }} />
              <List>
                {clusterProfiles.map(profile => (
                  <ListItem key={profile.id} alignItems="flex-start" sx={{ flexDirection: 'column', borderLeft: `4px solid ${profile.color}`, pl: 2, mb: 2 }}>
                    <ListItemText
                      primary={
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                          {`Profile ${profile.id + 1}: ${profile.name}`}
                        </Typography>
                      }
                      secondary={`Avg. Fire Size: ${profile.avgFireSize.toFixed(0)} acres`}
                    />
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption" sx={{ fontWeight: 'bold' }}>Key Agencies:</Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                        {profile.agencies.map(agency => (
                          <Chip key={agency} label={agency} size="small" />
                        ))}
                      </Box>
                    </Box>
                  </ListItem>
                ))}
              </List>
            </Paper>
          )}
        </Grid>
      </Grid>
    </div>
  );
}

export default AgencyAnalysis;
