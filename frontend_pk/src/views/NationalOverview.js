// src/views/NationalOverview.js (FINAL, OPTIMIZED VERSION)
import React, { useState, useEffect, useContext, useRef, useMemo, useCallback } from 'react'; // <-- Import useCallback
import DeckGL from '@deck.gl/react';
import { Map as ReactMap } from 'react-map-gl';
import { ScatterplotLayer, GeoJsonLayer, TextLayer } from '@deck.gl/layers';
import useSupercluster from 'use-supercluster';
import 'mapbox-gl/dist/mapbox-gl.css';
import { scaleSqrt } from 'd3-scale';

import { getFires, getCountyData } from '../api/apiService';
import { FilterContext } from '../context/FilterContext';
import FilterPanel from '../components/FilterPanel';
import InfoPanel from '../components/InfoPanel';
import SummaryStatsPanel from '../components/SummaryStatsPanel';
import { Button, CircularProgress, Typography, Paper, Box } from '@mui/material';
import WebMercatorViewport from 'viewport-mercator-project';


const MAPTILER_KEY = 'YCA6QDwr0dSmGdZEBnzv';
const ANALYTICS_DATA_LIMIT = 50000;
const INITIAL_VIEW_STATE = { longitude: -98.5795, latitude: 39.8283, zoom: 3.5, pitch: 30, bearing: 0 };
const STATE_BOUNDS = {
  // States
  Alabama:         [[-88.473227, 30.223334], [-84.88907,  35.008028]],
  Alaska:          [[-179.148909, 51.214183], [-129.9795,  71.365162]],
  Arizona:         [[-114.81651,  31.332177], [-109.045223, 37.000232]],
  Arkansas:        [[-94.617919,  33.004106], [-89.644395,  36.4996]],
  California:      [[-124.482003, 32.528832], [-114.131211, 42.009518]],
  Colorado:        [[-109.060253, 36.992426], [-102.041524, 41.00066]],
  Connecticut:     [[-73.727775,  40.980144], [-71.786994,  42.050587]],
  Delaware:        [[-75.789,     38.451012], [-75.048939,  39.839007]],
  Florida:         [[-87.634938,  24.396308], [-79.974307,  31.000968]],
  Georgia:         [[-85.605165,  30.356467], [-80.839729,  35.000659]],
  Hawaii:          [[-178.335438, 18.910361], [-154.806773, 28.402123]],
  Idaho:           [[-117.243027, 41.988057], [-111.043564, 49.001146]],
  Illinois:        [[-91.513079,  36.970298], [-87.019935,  42.508481]],
  Indiana:         [[-88.09776,   37.771742], [-84.784579,  41.761985]],
  Iowa:            [[-96.639704,  40.375501], [-90.140061,  43.501196]],
  Kansas:          [[-102.051744, 36.993016], [-94.588413,  40.003162]],
  Kentucky:        [[-89.571509,  36.497129], [-81.964971,  39.147458]],
  Louisiana:       [[-94.043147,  28.921241], [-88.817017,  33.019457]],
  Maine:           [[-71.083924,  43.059425], [-66.949895,  47.459686]],
  Maryland:        [[-79.487651,  37.911717], [-75.048939,  39.723043]],
  Massachusetts:   [[-73.508142,  41.237964], [-69.928393,  42.886589]],
  Michigan:        [[-90.418135,  41.696118], [-82.413474,  48.2388]],
  Minnesota:       [[-97.239209,  43.499356], [-89.491739,  49.384358]],
  Mississippi:     [[-91.655009,  30.173943], [-88.09776,   35.008028]],
  Missouri:        [[-95.774704,  35.995683], [-89.098843,  40.61364]],
  Montana:         [[-116.050003, 44.358221], [-104.039138, 49.001146]],
  Nebraska:        [[-104.053514, 40.002833], [-95.30829,   43.001708]],
  Nevada:          [[-120.005746, 35.001857], [-114.039648, 42.002207]],
  New_Hampshire:   [[-72.557247,  42.696825], [-70.610621,  45.305476]],
  New_Jersey:      [[-75.55961,   38.928519], [-73.893979,  41.357423]],
  New_Mexico:      [[-109.050173, 31.332177], [-103.001964, 37.000232]],
  New_York:        [[-79.762152,  40.495992], [-71.856214,  45.01585]],
  North_Carolina:  [[-84.321869,  33.842316], [-75.459534,  36.588117]],
  North_Dakota:    [[-104.0489,   45.93505],  [-96.554507,  49.000574]],
  Ohio:            [[-84.820159,  38.403202], [-80.518693,  41.977523]],
  Oklahoma:        [[-103.002565, 33.615833], [-94.430662,  37.002206]],
  Oregon:          [[-124.566244, 41.991794], [-116.463504, 46.292035]],
  Pennsylvania:    [[-80.51989,   39.7198],   [-74.689516,  42.26986]],
  Rhode_Island:    [[-71.858226,  41.146339], [-71.12057,   42.018798]],
  South_Carolina:  [[-83.35391,   32.0346],   [-78.54203,   35.215402]],
  South_Dakota:    [[-104.057698, 42.479635], [-96.436589,  45.94545]],
  Tennessee:       [[-90.310298,  34.982972], [-81.6469,    36.678118]],
  Texas:           [[-106.645646, 25.837377], [-93.508292,  36.500704]],
  Utah:            [[-114.052962, 36.997968], [-109.041058, 42.001567]],
  Vermont:         [[-73.43774,   42.726402], [-71.510225,  45.016659]],
  Virginia:        [[-83.675395,  36.540739], [-75.242266,  39.466012]],
  Washington:      [[-124.848974, 45.543541], [-116.916071, 49.002494]],
  West_Virginia:   [[-82.644739,  37.201483], [-77.719519,  40.638801]],
  Wisconsin:       [[-92.888114,  42.491983], [-86.805415,  47.080621]],
  Wyoming:         [[-111.056888, 40.994746], [-104.05216,   45.005904]],

  // District of Columbia
  DC:              [[-77.119759,  38.791645], [-76.909393,  38.995548]],

  // Territories
  Puerto_Rico:           [[-67.942,    17.883],    [-65.218,     18.520]],
  Guam:                  [[144.618,    13.352],    [144.973,     13.64]],
  U_S_Virgin_Islands:    [[-64.95,     17.7],      [-64.56,       18.5]],
  Northern_Mariana_Is:   [[145.584,    14.08],     [146.16,       15.25]],
};

// Add this state abbreviation mapping at the top of your component (after the STATE_BOUNDS constant):

const STATE_ABBREVIATIONS = {
  'AL': 'Alabama',
  'AK': 'Alaska',
  'AZ': 'Arizona',
  'AR': 'Arkansas',
  'CA': 'California',
  'CO': 'Colorado',
  'CT': 'Connecticut',
  'DE': 'Delaware',
  'FL': 'Florida',
  'GA': 'Georgia',
  'HI': 'Hawaii',
  'ID': 'Idaho',
  'IL': 'Illinois',
  'IN': 'Indiana',
  'IA': 'Iowa',
  'KS': 'Kansas',
  'KY': 'Kentucky',
  'LA': 'Louisiana',
  'ME': 'Maine',
  'MD': 'Maryland',
  'MA': 'Massachusetts',
  'MI': 'Michigan',
  'MN': 'Minnesota',
  'MS': 'Mississippi',
  'MO': 'Missouri',
  'MT': 'Montana',
  'NE': 'Nebraska',
  'NV': 'Nevada',
  'NH': 'New_Hampshire',
  'NJ': 'New_Jersey',
  'NM': 'New_Mexico',
  'NY': 'New_York',
  'NC': 'North_Carolina',
  'ND': 'North_Dakota',
  'OH': 'Ohio',
  'OK': 'Oklahoma',
  'OR': 'Oregon',
  'PA': 'Pennsylvania',
  'RI': 'Rhode_Island',
  'SC': 'South_Carolina',
  'SD': 'South_Dakota',
  'TN': 'Tennessee',
  'TX': 'Texas',
  'UT': 'Utah',
  'VT': 'Vermont',
  'VA': 'Virginia',
  'WA': 'Washington',
  'WV': 'West_Virginia',
  'WI': 'Wisconsin',
  'WY': 'Wyoming',
  'DC': 'DC',
  'PR': 'Puerto_Rico',
  'GU': 'Guam',
  'VI': 'U_S_Virgin_Islands',
  'MP': 'Northern_Mariana_Is'
};


const radiusScale = scaleSqrt().domain([0, 5000]).range([5, 50]);

function NationalOverview() {
  // --- STATE MANAGEMENT ---
  const [pointData, setPointData] = useState([]);
  const [mapReady, setMapReady] = useState(false);
  const [analyticsData, setAnalyticsData] = useState([]);
  const [countyShapes, setCountyShapes] = useState(null);
  const [countyFireCounts, setCountyFireCounts] = useState(null);
  const [totalFires, setTotalFires] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isPointsLoading, setIsPointsLoading] = useState(true);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(true);
  const { filters } = useContext(FilterContext);
  const [viewMode, setViewMode] = useState('points');
  const [selectedObject, setSelectedObject] = useState(null);
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
  const mapRef = useRef();
  
  // --- DATA FETCHING ---
  useEffect(() => {
    fetch('/geojson-counties-fips.json')
      .then(res => res.json())
      .then(shapes => setCountyShapes(shapes));
  }, []);

  useEffect(() => {
    if (viewMode !== 'points') return;
    setIsPointsLoading(true);
    const apiFilters = {};
    if (filters.year && filters.year !== 'All') apiFilters.year = filters.year;
    if (filters.state && filters.state !== 'All') apiFilters.state = filters.state;
    if (filters.cause && filters.cause !== 'All') apiFilters.cause = filters.cause;

    getFires(apiFilters, currentPage).then(data => {
      if (currentPage === 1) {
        setPointData(data.fires || []);
      } else {
        setPointData(prevData => [...prevData, ...(data.fires || [])]);
      }
      setTotalFires(data.total_fires || 0);
      setIsPointsLoading(false);
    });
  }, [filters, currentPage, viewMode]);

  // Replace this section in your useEffect that handles state zooming:

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    const { offsetWidth: width, offsetHeight: height } = mapRef.current.getMap().getContainer();

    console.log('=== STATE ZOOM DEBUG ===');
    console.log('filters.state:', filters.state);

    if (filters.state && filters.state !== 'All') {
      // Convert abbreviation to full state name
      const fullStateName = STATE_ABBREVIATIONS[filters.state];
      console.log('Full state name:', fullStateName);
      
      if (fullStateName && STATE_BOUNDS[fullStateName]) {
        const bounds = STATE_BOUNDS[fullStateName];
        console.log('Found bounds:', bounds);
        
        const viewport = new WebMercatorViewport({ width, height });
        const { longitude, latitude, zoom } = viewport.fitBounds(bounds, { padding: 40 });

        console.log('Calculated viewport:', { longitude, latitude, zoom });

        setViewState(vs => ({
          ...vs,
          longitude,
          latitude,
          zoom,
          transitionDuration: 500,
        }));
      } else {
        console.log('No bounds found for state:', filters.state);
      }
    } else if (filters.state === 'All') {
      console.log('Resetting to initial view');
      setViewState(vs => ({
        ...vs,
        ...INITIAL_VIEW_STATE,
        transitionDuration: 500,
      }));
    }
  }, [filters.state, mapReady]);
  
useEffect(() => {
    setIsAnalyticsLoading(true);
    setSelectedObject(null);
    const apiFilters = {};
    if (filters.year && filters.year !== 'All') apiFilters.year = filters.year;
    if (filters.state && filters.state !== 'All') apiFilters.state = filters.state;
    if (filters.cause && filters.cause !== 'All') apiFilters.cause = filters.cause;

    const analyticsPromise = getFires(apiFilters, 1, ANALYTICS_DATA_LIMIT).then(data => {
      setAnalyticsData(data.fires || []);
    });

    const countyPromise = getCountyData(apiFilters).then(fireCounts => {
      const fireCountsMap = new Map(fireCounts.map(d => [String(d.group), d.count]));
      setCountyFireCounts(fireCountsMap);
    });

    Promise.all([analyticsPromise, countyPromise]).then(() => {
      setIsAnalyticsLoading(false);
    });
    
    setCurrentPage(1);
    setPointData([]);
  }, [filters]);
  
  // --- CLUSTERING LOGIC ---
  const pointsToCluster = useMemo(() => analyticsData.map(fire => ({
    type: "Feature",
    properties: { cluster: false, fireId: fire.fod_id, ...fire },
    geometry: { type: "Point", coordinates: [fire.lon, fire.lat] }
  })), [analyticsData]);

  const bounds = mapRef.current ? mapRef.current.getMap().getBounds().toArray().flat() : null;
  
  const { clusters, supercluster } = useSupercluster({ 
      points: pointsToCluster, 
      bounds, 
      zoom: viewState.zoom, 
      options: { radius: 75, maxZoom: 20 }
  });

  // --- CLICK HANDLER (STABILIZED WITH useCallback) ---
  const handleLayerClick = useCallback((info) => {
    if (!info.object) return;

    if (viewMode === 'points') {
      setSelectedObject(info.object);
    } else if (viewMode === 'heatmap') {
      const fips_key = String(info.object.id).padStart(5, '0');
      const count = countyFireCounts?.get(fips_key) || 0;
      
      const panelInfo = {
        id: info.object.id,
        properties: { NAME: info.object.properties.NAME },
        fire_count: count
      };
      setSelectedObject(panelInfo);
    } else if (viewMode === 'clustered') {
      const { cluster, fireId } = info.object.properties;
      if (cluster) {
        const expansionZoom = Math.min(supercluster.getClusterExpansionZoom(info.object.id), 20);
        setViewState(currentViewState => ({
          ...currentViewState,
          longitude: info.object.geometry.coordinates[0],
          latitude: info.object.geometry.coordinates[1],
          zoom: expansionZoom,
        }));
      } else {
        const fireObject = analyticsData.find(f => f.fod_id === fireId);
        setSelectedObject(fireObject);
      }
    }
  }, [viewMode, countyFireCounts, supercluster, analyticsData]);
  
  // --- COLOR GETTER ---
  const getColor = (count) => {
    if (count > 5000) return [139, 0, 0, 200];
    if (count > 1000) return [255, 0, 0, 180];
    if (count > 500) return [255, 140, 0, 160];
    if (count > 100) return [255, 215, 0, 140];
    if (count > 10) return [255, 250, 205, 120];
    return [70, 130, 180, 50];
  };

const heatmapLegend = [
  { label: '5000+ fires', color: 'rgb(139, 0, 0)' },
  { label: '1001–5000 fires', color: 'rgb(255, 0, 0)' },
  { label: '501–1000 fires', color: 'rgb(255, 140, 0)' },
  { label: '101–500 fires', color: 'rgb(255, 215, 0)' },
  { label: '11–100 fires', color: 'rgb(255, 250, 205)' },
  { label: '1–10 fires', color: 'rgb(70, 130, 180)' }
];

function HeatmapLegend() {
  return (
    <Box style={{ position: 'absolute', bottom: 20, right: 20, background: 'rgba(255,255,255,0.9)', padding: '10px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.2)', maxWidth: '180px' }}>
      <Typography variant="subtitle2" gutterBottom>Heatmap Legend</Typography>
      {heatmapLegend.map((item, index) => (
        <Box key={index} display="flex" alignItems="center" gap={1} mb={0.5}>
          <Box width={20} height={20} style={{ backgroundColor: item.color }} />
          <Typography variant="caption">{item.label}</Typography>
        </Box>
      ))}
    </Box>
  );
}

  // --- LAYER CREATION (OPTIMIZED WITH useMemo) ---
  const layers = useMemo(() => {
    const newLayers = [];

    if (viewMode === 'points') {
      newLayers.push(new ScatterplotLayer({
        id: 'scatterplot', data: pointData, getPosition: d => [d.lon, d.lat],
        getFillColor: [255, 140, 0, 150], getRadius: d => radiusScale(d.fire_size),
        radiusMinPixels: 2, pickable: true, onClick: handleLayerClick
      }));
    } 
    else if (viewMode === 'clustered') {
      newLayers.push(
        new ScatterplotLayer({
          id: 'cluster-layer',
          data: clusters,
          getPosition: d => d.geometry.coordinates,
          getFillColor: d => d.properties.cluster ? [5, 150, 105, 150] : [255, 140, 0, 150],
          getRadius: d => d.properties.cluster ? Math.sqrt(d.properties.point_count) * 4 : 5000,
          radiusMinPixels: 5,
          pickable: true,
          onClick: handleLayerClick
        }),
        new TextLayer({
          id: 'cluster-label-layer',
          data: clusters.filter(c => c.properties.cluster),
          getPosition: d => d.geometry.coordinates,
          getText: d => d.properties.point_count.toLocaleString(),
          getSize: 20,
          getColor: [255, 255, 255, 255]
        })
      );
    } 
    else if (viewMode === 'heatmap' && countyShapes && countyFireCounts) {
      newLayers.push(new GeoJsonLayer({
        id: 'county-heatmap', data: countyShapes, filled: true, stroked: true,
        lineWidthMinPixels: 1, getLineColor: [255, 255, 255, 20],
        getFillColor: feature => getColor(countyFireCounts.get(String(feature.id).padStart(5, '0')) || 0),
        pickable: true, onClick: handleLayerClick,
        updateTriggers: { getFillColor: [countyFireCounts] }
      }));
    }
    
    return newLayers;
  }, [pointData, clusters, countyShapes, countyFireCounts, viewMode, handleLayerClick]);

  const hasMoreFires = pointData.length < totalFires;
  const showLoadingOverlay = (viewMode === 'points' && isPointsLoading && currentPage === 1) || (viewMode !== 'points' && isAnalyticsLoading);

  // --- FINAL RENDER ---
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 p-4 h-screen bg-slate-100">
      <div className="lg:col-span-1 flex flex-col gap-4">
        <FilterPanel />
        <Button
          variant="contained"
          fullWidth
          onClick={() => {
            const next = viewMode === 'points' ? 'clustered' : (viewMode === 'clustered' ? 'heatmap' : 'points');
            setViewMode(next);
          }}
        >
          Switch to {viewMode === 'points' ? 'Clustered View' : viewMode === 'clustered' ? 'County Heatmap' : 'Fire Points'}
        </Button>
        <SummaryStatsPanel />
        {viewMode === 'points' && (
          <Paper elevation={3} sx={{ p: 2 }}>
            <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Data View</Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Showing {pointData.length.toLocaleString()} of {totalFires.toLocaleString()} fires
            </Typography>
            {hasMoreFires && (
              <Button
                variant="outlined"
                fullWidth
                sx={{ mt: 2 }}
                onClick={() => setCurrentPage(prev => prev + 1)}
                disabled={isPointsLoading}
              >
                {isPointsLoading ? <CircularProgress size={24} /> : 'Load More Fires'}
              </Button>
            )}
          </Paper>
        )}
      </div>
      <div className="lg:col-span-3 h-full relative rounded-lg overflow-hidden shadow-lg">
        <InfoPanel selectedObject={selectedObject} viewMode={viewMode} onClose={() => setSelectedObject(null)} />
        <DeckGL
          viewState={viewState}
          onViewStateChange={e => setViewState(e.viewState)}
          controller={true}
          layers={layers}
          getTooltip={({ object }) => {
            if (!object) return null;
            if (viewMode === 'points') {
              const name = object.fire_name ? `**${object.fire_name.trim()}**\n` : '';
              const county = object.county ? `${object.county} County\n` : '';
              return `${name}${county}Cause: ${object.cause}\n${object.fire_size.toFixed(2)} acres`;
            }
            if (viewMode === 'heatmap') {
              const fips_key = String(object.id).padStart(5, '0');
              return `${object.properties.NAME} County\nFires: ${(countyFireCounts?.get(fips_key) || 0).toLocaleString()}`;
            }
            if (viewMode === 'clustered') {
              return object.properties.cluster
                ? `${object.properties.point_count.toLocaleString()} fires`
                : `${object.properties.cause}\n${object.properties.fire_size.toFixed(2)} acres`;
            }
          }}
        >
          <ReactMap
            ref={mapRef}
            mapboxAccessToken={MAPTILER_KEY}
            mapStyle={`https://api.maptiler.com/maps/dataviz-dark/style.json?key=${MAPTILER_KEY}`}
            onLoad={() => setMapReady(true)}
          />

        </DeckGL>

        {viewMode === 'heatmap' && <HeatmapLegend />}
        {showLoadingOverlay && (
          <div className="absolute inset-0 bg-slate-900/50 flex flex-col items-center justify-center z-10">
            <CircularProgress color="inherit" style={{ color: 'white' }} />
            <Typography variant="h6" style={{ color: 'white', marginTop: '1rem' }}>
              Loading Data...
            </Typography>
          </div>
        )}
      </div>
    </div>
  );
}

export default NationalOverview;








