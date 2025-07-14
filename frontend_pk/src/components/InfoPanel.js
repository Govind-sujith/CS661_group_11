import React from 'react';
import { Paper, Typography, Box, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

// This component is the little pop-up panel that shows details about whatever is clicked on the map.
function InfoPanel({ selectedObject, viewMode, onClose }) {
  // If nothing is selected, we don't show the panel at all.
  if (!selectedObject) return null;

  // This function decides how to display data for a single, individual fire point.
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

  // This function handles displaying info when a county is clicked in the heatmap view.
  const renderHeatmapData = () => {
    const name = selectedObject.properties.NAME;
    const fips = selectedObject.id;
    const count = selectedObject.fire_count;

    return (
      <>
        <Typography variant="h6" gutterBottom>County Details</Typography>
        <Typography variant="body2"><strong>County:</strong> {name}</Typography>
        <Typography variant="body2"><strong>FIPS Code:</strong> {fips}</Typography>
        <Typography variant="body2"><strong>Total Fires:</strong> {count.toLocaleString()}</Typography>
      </>
    );
  };

  // And this one handles displaying info for a clustered point, which represents multiple fires.
  const renderClusteredData = () => {
    // For a cluster, we'll just show the details of one of the fires within it.
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
        {/* The little 'x' button to close the panel. */}
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>
      <hr className="my-2" />
      
      {/* Based on the current map view, we'll render the appropriate details. */}
      {viewMode === 'points' && renderPointData()}
      {viewMode === 'heatmap' && renderHeatmapData()}
      {viewMode === 'clustered' && renderClusteredData()}
    </Paper>
  );
}

export default InfoPanel;
