import { useContext, useEffect, useState } from 'react';
import {
 LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { getMonthlyCounts } from '../api/apiService';
import { FilterContext } from '../context/FilterContext';
import { Typography, Box, CircularProgress } from '@mui/material';

// A helper function to determine the season for a given month index (0-11).
const monthToSeason = (monthIndex) => {
 if ([2, 3, 4].includes(monthIndex)) return 'Spring';  // March, April, May
 if ([5, 6, 7].includes(monthIndex)) return 'Summer';  // June, July, August
 if ([8, 9, 10].includes(monthIndex)) return 'Fall';   // September, October, November
 return 'Winter';                                      // December, January, February
};

// This function takes the raw monthly data from our backend and transforms it
// into a format that's ready for our seasonal line chart.
const processBackendData = (rawData) => {
 const result = rawData.map(entry => {
   const seasonal = {
     year: entry.year,
     Spring: 0,
     Summer: 0,
     Fall: 0,
     Winter: 0
   };

   // We loop through the 12 monthly counts and add them to the correct season.
   entry.monthly_counts.forEach((count, i) => {
     const season = monthToSeason(i);
     seasonal[season] += count;
   });

   return seasonal;
 });

 // We'll sort the final data by year to make sure the line chart is drawn correctly.
 return result.sort((a, b) => a.year - b.year);
};

// This component renders a line chart showing the number of fires per season over the years.
const SeasonalTrendsLineChart = () => {
 const { filters } = useContext(FilterContext);
 const [seasonalData, setSeasonalData] = useState([]);
 const [isLoading, setIsLoading] = useState(true);

 // This effect fetches and processes the data whenever the state filter changes.
 useEffect(() => {
   const fetchData = async () => {
     setIsLoading(true);
     // If 'All' is selected, we don't pass a state filter to the API.
     const stateFilter = filters.state === 'All' ? null : filters.state;

     try {
       const rawData = await getMonthlyCounts(stateFilter);
       const processed = processBackendData(rawData);
       setSeasonalData(processed);
     } catch (error) {
       console.error('Error fetching monthly wildfire data:', error);
     } finally {
       setIsLoading(false); // We're done loading, whether it succeeded or failed.
     }
   };

   fetchData();
 }, [filters.state]); // This dependency array ensures the effect re-runs when the state filter changes.

 // If we're still loading, we'll just show a spinner.
 if (isLoading) {
    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress />
        </Box>
    );
 }

 // If there's no data for the selected filter, we'll show a message.
 if (seasonalData.length === 0) {
    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Typography>No seasonal data available for the selected filter.</Typography>
        </Box>
    );
 }

 // This is the main render method for the chart.
 return (
   <>
     <Typography variant="h6" align="center" gutterBottom>
       Seasonal Wildfire Trends {filters.state !== 'All' ? `(${filters.state})` : '(All States)'}
     </Typography>

     <ResponsiveContainer width="100%" height="90%">
       <LineChart data={seasonalData}>
         <CartesianGrid strokeDasharray="3 3" />
         <XAxis dataKey="year" />
         <YAxis allowDecimals={false} />
         <Tooltip />
         <Legend />
         {/* Each <Line> component corresponds to a season. */}
         <Line type="linear" dataKey="Spring" stroke="#00ffcc" dot={true} strokeWidth={2} />
         <Line type="linear" dataKey="Summer" stroke="#ff6600" dot={true} strokeWidth={2} />
         <Line type="linear" dataKey="Fall" stroke="#ffcc00" dot={true} strokeWidth={2} />
         <Line type="linear" dataKey="Winter" stroke="#3399ff" dot={true} strokeWidth={2} />
       </LineChart>
     </ResponsiveContainer>
   </>
 );
};

export default SeasonalTrendsLineChart;
