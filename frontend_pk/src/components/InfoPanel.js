import React from 'react';
import { Paper, Typography, Box, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

function InfoPanel({ selectedObject, viewMode, onClose }) {
  if (!selectedObject) return null;

  // --- Fire point (individual fire) ---
  const renderPointData = () => {
    const { cause, fire_year, fire_size, state, fire_name, county, agency } = selectedObject;
    return (
      <>
        <Typography variant="h6" gutterBottom>{fire_name || 'Fire Details'}</Typography>
        <Typography variant="body2"><strong>Cause:</strong> {cause}</Typography>
        <Typography variant="body2"><strong>Year:</strong> {fire_year}</Typography>
        <Typography variant="body2"><strong>Location:</strong> {county ? `${county}, ` : ''}{state}</Typography>
        <Typography variant="body2"><strong>Agency:</strong> {agency}</Typography>
        <Typography variant="body2"><strong>Size:</strong> {fire_size.toLocaleString()} acres</Typography>
      </>
    );
  };

  // --- County heatmap ---
  // --- REPLACED the renderHeatmapData function with this ---
  const renderHeatmapData = () => {
    const name = selectedObject.properties.NAME;
    const fips = selectedObject.id; // The FIPS code is the top-level id
    const count = selectedObject.fire_count; // Now we read it directly

    return (
      <>
        <Typography variant="h6" gutterBottom>County Details</Typography>
        <Typography variant="body2"><strong>County:</strong> {name}</Typography>
        <Typography variant="body2"><strong>FIPS Code:</strong> {fips}</Typography>
        <Typography variant="body2"><strong>Total Fires:</strong> {count.toLocaleString()}</Typography>
      </>
    );
  };

  // --- Clustered point ---
  const renderClusteredData = () => {
    // This now shows the same rich detail as a regular point
    const { cause, fire_year, fire_size, state, fire_name, county, agency } = selectedObject;
    return (
      <>
        <Typography variant="h6" gutterBottom>{fire_name || 'Fire Details'}</Typography>
        <Typography variant="body2"><strong>Cause:</strong> {cause}</Typography>
        <Typography variant="body2"><strong>Year:</strong> {fire_year}</Typography>
        <Typography variant="body2"><strong>Location:</strong> {county ? `${county}, ` : ''}{state}</Typography>
        <Typography variant="body2"><strong>Agency:</strong> {agency}</Typography>
        <Typography variant="body2"><strong>Size:</strong> {fire_size.toLocaleString()} acres</Typography>
      </>
    );
  };

  return (
    <Paper elevation={4} className="absolute top-4 right-4 z-20 w-80 p-4 rounded-lg">
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
          Information
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>
      <hr className="my-2" />
      
      {/* Decide based on view mode */}
      {viewMode === 'points' && renderPointData()}
      {viewMode === 'heatmap' && renderHeatmapData()}
      {viewMode === 'clustered' && renderClusteredData()}
    </Paper>
  );
}

export default InfoPanel;
