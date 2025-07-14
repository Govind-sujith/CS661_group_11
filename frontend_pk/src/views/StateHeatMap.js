// src/views/StateHeatMap.js
import React, {
  useState, useEffect, useContext, useRef, useCallback
} from 'react';
import DeckGL from '@deck.gl/react';
import { Map as ReactMap } from 'react-map-gl';
import { GeoJsonLayer } from '@deck.gl/layers';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Box, Typography, CircularProgress } from '@mui/material';
import { FilterContext } from '../context/FilterContext';
import { interpolateYlOrRd } from 'd3-scale-chromatic';
import { color as d3Color } from 'd3-color';
import WebMercatorViewport from 'viewport-mercator-project';
import InfoPanel from '../components/InfoPanel';
import { getStateData } from '../api/apiService';
import * as turf from '@turf/turf';
import DateRangeOnlyPanel from '../components/DateRangeOnlyPanel';

// --- Constants and Configuration ---
const MAPTILER_KEY = 'YCA6QDwr0dSmGdZEBnzv';
// This is the default view of the map when the page first loads.
const INITIAL_VIEW_STATE = {
  longitude: -98.5795,
  latitude: 39.8283,
  zoom: 2,
  pitch: 0,
  bearing: 0
};

// This component renders a heatmap of the US, where each state is colored
// based on the number of fires within the selected date range.
function StateHeatMap() {
  const { filters, setFilters } = useContext(FilterContext);
  // --- State Management ---
  // Here we keep track of all the dynamic pieces of this component.
  const [stateGeo, setStateGeo] = useState(null); // The GeoJSON shapes for the states.
  const [fireCounts, setFireCounts] = useState(new Map()); // A map of state abbreviations to their fire counts.
  const [minCount, setMinCount] = useState(0); // The minimum fire count, for our color scale.
  const [maxCount, setMaxCount] = useState(1); // The maximum fire count, for our color scale.
  const [loading, setLoading] = useState(false); // Whether we are currently fetching data.
  const mapRef = useRef(); // A direct reference to the map instance.
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE); // The current camera position of the map.
  const [selectedObject, setSelectedObject] = useState(null); // The currently clicked-on state.

  // This effect fetches the GeoJSON file with the state boundaries when the component first loads.
  useEffect(() => {
    fetch('/geojson-states-complete.json')
      .then(res => res.json())
      .then(data => setStateGeo(data));
  }, []); // The empty array [] means this effect only runs once.

  // This effect re-fetches the fire count data whenever the filters change.
  useEffect(() => {
    setLoading(true);
    setSelectedObject(null);
    getStateData(filters)
      .then(data => {
        const map = new Map();
        data.forEach(d => map.set(d.group, d.count));
        const values = Array.from(map.values());
        // We calculate the min and max to set up our color scale correctly.
        setMinCount(values.length ? Math.min(...values) : 0);
        setMaxCount(values.length ? Math.max(...values) : 1);
        setFireCounts(map);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching state fire data:', err);
        setLoading(false);
      });
  }, [filters]);

  // This effect handles zooming the map to the currently selected state.
  useEffect(() => {
    if (!mapRef.current || !stateGeo || !filters.state || filters.state === 'All') return;
    const stateFeature = stateGeo.features.find(f => f.properties.abbr === filters.state);
    if (stateFeature) {
      try {
        // We use the turf library to calculate the bounding box of the state.
        const bbox = turf.bbox(stateFeature);
        const { width, height } = mapRef.current.getMap().getContainer();
        const viewport = new WebMercatorViewport({ width, height });
        // Then we fit the map's viewport to that bounding box.
        const { longitude, latitude, zoom } = viewport.fitBounds(
          [[bbox[0], bbox[1]], [bbox[2], bbox[3]]],
          { padding: 40 }
        );
        setViewState(vs => ({ ...vs, longitude, latitude, zoom, transitionDuration: 1000 }));
      } catch (err) {
        console.error('Error computing bbox:', err);
      }
    }
  }, [filters.state, stateGeo]);

  // This function determines the color of a state based on its fire count.
  const getColor = useCallback((count) => {
    if (!count) return [230, 230, 230, 80]; // A light grey for states with no data.
    // We normalize the count to a 0-1 range to work with the D3 color interpolator.
    const t = maxCount === minCount ? 1 : (count - minCount) / (maxCount - minCount);
    const c = d3Color(interpolateYlOrRd(t));
    return [c.r, c.g, c.b, 200];
  }, [minCount, maxCount]);

  // Here we define the Deck.gl layer that will render our state heatmap.
  const layers = stateGeo && !loading ? [
    new GeoJsonLayer({
      id: 'state-layer',
      data: stateGeo,
      pickable: true,
      stroked: true,
      filled: true,
      getFillColor: f => {
        const abbr = f.properties.abbr;
        const count = fireCounts.get(abbr) || 0;
        return getColor(count);
      },
      getLineColor: [255, 255, 255, 40],
      lineWidthMinPixels: 1,
      // When a state is clicked, we update the info panel and set the global state filter.
      onClick: info => {
        if (info?.object) {
          const abbr = info.object.properties.abbr;
          info.object.fire_count = fireCounts.get(abbr) || 0;
          setSelectedObject(info.object);
          setFilters(prev => ({ ...prev, state: abbr }));
        }
      }
    })
  ] : [];

  // This is the main render method for the component.
  return (
    <Box sx={{ height: '100vh', width: '100%', overflow: 'hidden' }}>
      <DateRangeOnlyPanel />
      <Box sx={{ height: 'calc(100% - 60px)', width: '100%', position: 'relative' }}>
        {/* We'll show a loading spinner while the data is being fetched. */}
        {loading || !stateGeo ? (
          <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CircularProgress />
          </Box>
        ) : (
          <DeckGL
            viewState={viewState}
            onViewStateChange={e => setViewState(e.viewState)}
            controller
            layers={layers}
          >
            <ReactMap
              ref={mapRef}
              mapboxAccessToken={MAPTILER_KEY}
              mapStyle={`https://api.maptiler.com/maps/dataviz-light/style.json?key=${MAPTILER_KEY}`}
            />
          </DeckGL>
        )}

        {/* The info panel will show details for the currently selected state. */}
        {selectedObject && (
          <Box sx={{ position: 'absolute', bottom: 40, right: 30, zIndex: 10, width: '300px' }}>
            <InfoPanel
              selectedObject={selectedObject}
              viewMode="state"
              onClose={() => setSelectedObject(null)}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default StateHeatMap;
