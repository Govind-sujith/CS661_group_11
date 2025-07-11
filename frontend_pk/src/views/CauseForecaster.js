// src/views/CauseForecaster.js
import React, { useState } from 'react';
import { predictCause } from '../api/apiService';
import Plot from 'react-plotly.js';
import { Select, MenuItem, FormControl, InputLabel, Button, Paper, Grid, Typography, CircularProgress } from '@mui/material';

// These values should match the ones used to train the model
const states = ['CA', 'TX', 'FL', 'ID', 'MT', 'AZ', 'OR', 'GA'];
const ownerCodes = [5, 13, 14, 15]; // USFS, STATE OR PRIVATE, etc.
const sizeClasses = ['A', 'B', 'C', 'G'];

function CauseForecaster() {
  const [formData, setFormData] = useState({
    state: 'CA',
    owner_code: 5,
    discovery_doy: 180, // Day of year (e.g., mid-year)
    fire_size_class: 'A',
  });
  const [prediction, setPrediction] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (event) => {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });
  };

  const handlePredict = async () => {
    setIsLoading(true);
    const result = await predictCause(formData);
    setPrediction(result);
    setIsLoading(false);
  };

  const predictionData = {
    y: prediction.map(p => p.cause).reverse(),
    x: prediction.map(p => p.probability * 100).reverse(),
    type: 'bar',
    orientation: 'h',
    marker: { color: 'rgba(245, 158, 11, 0.9)' }
  };

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">Interactive Cause Forecaster</h2>
      <p className="mb-6 text-slate-600">Select the characteristics of a hypothetical fire to predict its most likely cause using our trained model.</p>

      <Grid container spacing={4}>
        <Grid item xs={12} md={4}>
          <Paper elevation={3} className="p-6 space-y-6 rounded-lg">
            <Typography variant="h6">Fire Characteristics</Typography>
            <FormControl fullWidth>
              <InputLabel>State</InputLabel>
              <Select name="state" value={formData.state} label="State" onChange={handleChange}>
                {states.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Owner Code</InputLabel>
              <Select name="owner_code" value={formData.owner_code} label="Owner Code" onChange={handleChange}>
                {ownerCodes.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Fire Size Class</InputLabel>
              <Select name="fire_size_class" value={formData.fire_size_class} label="Fire Size Class" onChange={handleChange}>
                {sizeClasses.map(sc => <MenuItem key={sc} value={sc}>{sc}</MenuItem>)}
              </Select>
            </FormControl>
            <Button variant="contained" onClick={handlePredict} disabled={isLoading} fullWidth sx={{ mt: 2, py: 1.5 }}>
              {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Predict Cause'}
            </Button>
          </Paper>
        </Grid>
        <Grid item xs={12} md={8}>
          <Paper elevation={3} className="p-6 h-full rounded-lg">
            <Typography variant="h6" gutterBottom>Prediction Results</Typography>
            {prediction.length > 0 ? (
              <Plot
                data={[predictionData]}
                layout={{
                  title: 'Top Predicted Causes',
                  xaxis: { title: 'Probability (%)', range: [0, 100] },
                  margin: { l: 120, r: 40, t: 80, b: 40 }
                }}
                useResizeHandler={true}
                style={{ width: '100%', height: '90%' }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500">
                Submit characteristics to see a prediction.
              </div>
            )}
          </Paper>
        </Grid>
      </Grid>
    </div>
  );
}
export default CauseForecaster;