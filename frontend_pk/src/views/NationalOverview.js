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

const MAPTILER_KEY = 'YCA6QDwr0dSmGdZEBnzv';
const ANALYTICS_DATA_LIMIT = 50000;
const INITIAL_VIEW_STATE = { longitude: -98.5795, latitude: 39.8283, zoom: 3.5, pitch: 30, bearing: 0 };

const radiusScale = scaleSqrt().domain([0, 5000]).range([5, 50]);

function NationalOverview() {
  // --- STATE MANAGEMENT ---
  const [pointData, setPointData] = useState([]);
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
          />
        </DeckGL>
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
