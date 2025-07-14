// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { FilterProvider } from './context/FilterContext';
import NationalOverview from './views/NationalOverview';
import TemporalAnalysis from './views/TemporalAnalysis';
import AgencyAnalysis from './views/AgencyAnalysis';
import Prediction from './views/Prediction';
import { AppBar, Toolbar, Typography, Button } from '@mui/material';

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
                <Button component={Link} to="/analysis" sx={{ color: 'white' }}>Analysis</Button>
                <Button component={Link} to="/Prediction" sx={{ color: 'white' }}>Prediction</Button> {/* Added Misc */}
                <Button component={Link} to="/agency" sx={{ color: 'white' }}>Agencies(beta)</Button> 

              </nav>
            </Toolbar>
          </AppBar>

          <main className="flex-grow overflow-auto">
            <Routes>
              <Route path="/" element={<NationalOverview />} />
              <Route path="/Analysis" element={<TemporalAnalysis/>} />
              <Route path="/agency" element={<AgencyAnalysis />} />
              <Route path="/Prediction" element={<Prediction />} />
              {/* <Route path="/misc" element={<MiscAnalysis />} /> {/* Added Misc */}
            </Routes>
          </main>
        </div>
      </Router>
    </FilterProvider>
  );
}

export default App;
