// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { FilterProvider } from './context/FilterContext';
import NationalOverview from './views/NationalOverview';
import TemporalAnalysis from './views/TemporalAnalysis';
import AgencyAnalysis from './views/AgencyAnalysis';
// --- NEW: Import the Forecaster view ---
import CauseForecaster from './views/CauseForecaster';
import { AppBar, Toolbar, Typography, Button } from '@mui/material';
import MultivariateAnalysis from './views/MultivariateAnalysis'; // <-- Import the new view


function App() {
  return (
    <FilterProvider>
      <Router>
        <div className="flex flex-col h-screen bg-slate-100">
          <AppBar position="static" color="primary" elevation={1}>
            <Toolbar>
              <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                Wildfire Analytics Platform
              </Typography>
              <nav>
                <Button component={Link} to="/" sx={{ color: 'white' }}>Overview</Button>
                <Button component={Link} to="/temporal" sx={{ color: 'white' }}>Temporal</Button>
                <Button component={Link} to="/agency" sx={{ color: 'white' }}>Agencies</Button>
                {/* --- NEW: Add the Forecaster link --- */}
                <Button component={Link} to="/forecaster" sx={{ color: 'white' }}>Forecaster</Button>
                <Button component={Link} to="/multivariate" sx={{ color: 'white' }}>Multivariate Analysis</Button>

              </nav>
            </Toolbar>
          </AppBar>

          <main className="flex-grow overflow-auto">
            <Routes>
              <Route path="/" element={<NationalOverview />} />
              <Route path="/temporal" element={<TemporalAnalysis />} />
              <Route path="/agency" element={<AgencyAnalysis />} />
              {/* --- NEW: Add the Forecaster route --- */}
              <Route path="/forecaster" element={<CauseForecaster />} />
              <Route path="/multivariate" element={<MultivariateAnalysis />} />

            </Routes>
          </main>
        </div>
      </Router>
    </FilterProvider>
  );
}
export default App;