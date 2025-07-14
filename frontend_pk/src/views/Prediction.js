import React, { useState } from 'react';
import Map, { Marker } from 'react-map-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  Typography, TextField, Button, Alert, Paper, Box
} from '@mui/material';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  Legend, CartesianGrid, LabelList, Cell
} from 'recharts';

// We need our API helper functions to talk to the backend.
import { getStateFromCoords, predictCause } from '../api/apiService';

// API key for our map tiles.
const MAPTILER_KEY = 'YCA6QDwr0dSmGdZEBnzv';

// This component provides an interactive tool for users to predict wildfire causes
// based on location, date, and fire size.
function Prediction() {
  // --- State Management ---
  // Here we keep track of all the dynamic pieces of this component.
  const [selectedPoint, setSelectedPoint] = useState(null); // The lat/lon the user clicks on the map.
  const [stateCode, setStateCode] = useState(null); // The state abbreviation for the selected point.
  const [date, setDate] = useState(''); // The date of the hypothetical fire.
  const [fireSize, setFireSize] = useState(''); // The size of the hypothetical fire.
  const [causeData, setCauseData] = useState([]); // The prediction results from the API.
  const [error, setError] = useState(''); // Any error messages we need to show the user.

  // Defines the geographical boundaries of the USA to constrain map clicks.
  const usaBounds = [
    [-179.15, 17.54], // Southwest corner
    [-66.95, 71.55],  // Northeast corner
  ];

  // A helper function to convert full state names to their two-letter abbreviations.
  const getStateAbbreviation = (stateNameOrCode) => {
    const states = {
      'ALABAMA': 'AL', 'ALASKA': 'AK', 'ARIZONA': 'AZ', 'ARKANSAS': 'AR',
      'CALIFORNIA': 'CA', 'COLORADO': 'CO', 'CONNECTICUT': 'CT', 'DELAWARE': 'DE',
      'FLORIDA': 'FL', 'GEORGIA': 'GA', 'HAWAII': 'HI', 'IDAHO': 'ID',
      'ILLINOIS': 'IL', 'INDIANA': 'IN', 'IOWA': 'IA', 'KANSAS': 'KS',
      'KENTUCKY': 'KY', 'LOUISIANA': 'LA', 'MAINE': 'ME', 'MARYLAND': 'MD',
      'MASSACHUSETTS': 'MA', 'MICHIGAN': 'MI', 'MINNESOTA': 'MN', 'MISSISSIPPI': 'MS',
      'MISSOURI': 'MO', 'MONTANA': 'MT', 'NEBRASKA': 'NE', 'NEVADA': 'NV',
      'NEW HAMPSHIRE': 'NH', 'NEW JERSEY': 'NJ', 'NEW MEXICO': 'NM', 'NEW YORK': 'NY',
      'NORTH CAROLINA': 'NC', 'NORTH DAKOTA': 'ND', 'OHIO': 'OH', 'OKLAHOMA': 'OK',
      'OREGON': 'OR', 'PENNSYLVANIA': 'PA', 'RHODE ISLAND': 'RI', 'SOUTH CAROLINA': 'SC',
      'SOUTH DAKOTA': 'SD', 'TENNESSEE': 'TN', 'TEXAS': 'TX', 'UTAH': 'UT',
      'VERMONT': 'VT', 'VIRGINIA': 'VA', 'WASHINGTON': 'WA', 'WEST VIRGINIA': 'WV',
      'WISCONSIN': 'WI', 'WYOMING': 'WY'
    };
    const upper = stateNameOrCode.trim().toUpperCase();
    return states[upper] || upper;
  };

  // This function is triggered when the user clicks on the map.
  const handleMapClick = async (event) => {
    const { lngLat } = event;
    // We check if the click is within the defined boundaries of the USA.
    if (
      lngLat.lng >= usaBounds[0][0] && lngLat.lng <= usaBounds[1][0] &&
      lngLat.lat >= usaBounds[0][1] && lngLat.lat <= usaBounds[1][1]
    ) {
      // If it's a valid point, we update our state and fetch the state code.
      setSelectedPoint({ longitude: lngLat.lng, latitude: lngLat.lat });
      setError('');
      setStateCode(null);
      setCauseData([]);
      const state = await getStateFromCoords(lngLat.lat, lngLat.lng);
      setStateCode(state ? getStateAbbreviation(state) : 'N/A');
    } else {
      // If the click is outside the US, we show an error.
      setError('Please select a point within the USA boundaries.');
      setSelectedPoint(null);
      setStateCode(null);
    }
  };

  // This function is called when the user clicks the "Predict" button.
  const handlePredict = async () => {
    // First, we do some basic validation to make sure all inputs are filled.
    if (!selectedPoint || !date || !fireSize || !stateCode || stateCode === 'N/A') {
      setError('Please provide all inputs and select a valid point.');
      setCauseData([]);
      return;
    }

    // We build the payload object in the exact format the backend API expects.
    const payload = {
      LATITUDE: selectedPoint.latitude,
      LONGITUDE: selectedPoint.longitude,
      FIRE_SIZE: parseFloat(fireSize),
      STATE: stateCode,
      date,
      OWNER_CODE: 1, // Using default values for these as they are not user inputs.
      NWCG_REPORTING_AGENCY: 7
    };

    // Call the API and handle the results.
    const results = await predictCause(payload);
    if (results && results.length > 0) {
      const sorted = results.sort((a, b) => b.probability - a.probability);
      setCauseData(sorted);
      setError('');
    } else {
      setError('No prediction data returned.');
    }
  };

  // This is the main render method for the component.
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '60% 40%' },
        height: 'calc(100vh - 64px)',
        width: '100%',
        p: 2,
        gap: 2,
        boxSizing: 'border-box',
        backgroundColor: '#f5f5f5'
      }}
    >
      {/* The map section on the left. */}
      <Paper elevation={3} sx={{ position: 'relative', width: '100%', height: '100%', borderRadius: 2, overflow: 'hidden' }}>
        <Map
          initialViewState={{ longitude: -98.5795, latitude: 39.8283, zoom: 3.5 }}
          mapStyle={`https://api.maptiler.com/maps/streets/style.json?key=${MAPTILER_KEY}`}
          onClick={handleMapClick}
          maxBounds={usaBounds}
          maxZoom={10}
          style={{ width: '100%', height: '100%' }}
        >
          {/* We'll place a marker on the map where the user clicked. */}
          {selectedPoint && (
            <Marker
              longitude={selectedPoint.longitude}
              latitude={selectedPoint.latitude}
              color="red"
            />
          )}
        </Map>

        {/* The input panel that sits on top of the map. */}
        <Paper elevation={4} sx={{ position: 'absolute', bottom: 20, left: 20, width: { xs: 'calc(100% - 40px)', sm: 350 }, p: 2, backgroundColor: 'white', borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom>Fire Cause Prediction</Typography>

          {selectedPoint ? (
            <Box mb={2}>
              <Typography variant="body2"><strong>Latitude:</strong> {selectedPoint.latitude.toFixed(5)}</Typography>
              <Typography variant="body2"><strong>Longitude:</strong> {selectedPoint.longitude.toFixed(5)}</Typography>
              <Typography variant="body2"><strong>State:</strong> {stateCode || 'Fetching...'}</Typography>
            </Box>
          ) : (
            <Alert severity="info" sx={{ mb: 2 }}>
              Click on the map to select a point
            </Alert>
          )}

          <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={2} mb={2}>
            <TextField
              type="date"
              label="Date"
              InputLabelProps={{ shrink: true }}
              fullWidth
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <TextField
              type="number"
              label="Fire Size (acres)"
              fullWidth
              value={fireSize}
              onChange={(e) => setFireSize(e.target.value)}
            />
          </Box>

          <Button
            variant="contained"
            color="primary"
            fullWidth
            onClick={handlePredict}
            sx={{ mb: 2 }}
          >
            Predict Fire Cause
          </Button>

          {error && <Alert severity="error">{error}</Alert>}
        </Paper>
      </Paper>

      {/* The results panel on the right. */}
      <Box
        sx={{
          overflowY: 'auto',
          p: 2,
          borderRadius: 2,
          backgroundColor: 'white',
          boxShadow: 3,
          height: '100%',
        }}
      >
        {/* We only show the chart if we have prediction data. */}
        {causeData.length > 0 ? (
          <>
            <Typography variant="h6" gutterBottom>
              Top Predicted Fire Causes
            </Typography>
            <Typography variant="body2" gutterBottom sx={{ mb: 2 }}>
              Based on your selected location, date, and fire size, the following causes are predicted with their respective likelihoods.
            </Typography>

            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={causeData}
                layout="vertical" // A vertical layout is often easier to read for ranked lists.
                margin={{ top: 10, right: 40, left: 0, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={true} />
                <XAxis
                  type="number"
                  domain={[0, 1]} // Probabilities range from 0 to 1.
                  tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} // Format ticks as percentages.
                  ticks={[0, 0.25, 0.5, 0.75, 1]}
                  label={{ value: "", position: "insideBottom", offset: -5 }}
                />
                <YAxis
                  type="category"
                  dataKey="cause"
                  width={140}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  formatter={(value) => `${(value * 100).toFixed(2)}%`}
                  labelFormatter={(label) => `Cause: ${label}`}
                />
                <Legend />
                <Bar dataKey="probability" barSize={18} radius={[10, 10, 10, 10]}>
                  {/* We'll color the top prediction differently to make it stand out. */}
                  {causeData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index === 0 ? "#ef5350" : "#42a5f5"}
                    />
                  ))}
                  <LabelList
                    dataKey="probability"
                    position="right"
                    formatter={(v) => `${(v * 100).toFixed(1)}%`}
                    style={{ fontSize: '12px' }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            <Typography
              variant="body2"
              sx={{ mt: 2, fontWeight: 500, color: 'text.secondary' }}
            >
              Highest likelihood: <strong style={{ color: '#d32f2f' }}>{causeData[0].cause}</strong>
            </Typography>
          </>
        ) : (
          <Typography variant="body2" color="textSecondary">
            Prediction results will appear here after input.
          </Typography>
        )}
      </Box>
    </Box>
  );
}

export default Prediction;
