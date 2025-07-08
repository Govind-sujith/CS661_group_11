import React, { useState, useEffect } from 'react';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer } from '@deck.gl/layers';
import Map from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';

const INITIAL_VIEW_STATE = {
  longitude: -100,
  latitude: 37,
  zoom: 4,
  pitch: 0,
  bearing: 0
};

// Limit to North America bounds (Alaska to Puerto Rico)
const MAP_BOUNDS = [
  [-170, 15], // Southwest (lng, lat)
  [-50, 72]   // Northeast
];

function App() {
  const [year, setYear] = useState(2004);
  const [day, setDay] = useState(183);
  const [fires, setFires] = useState([]);
  const [hoverInfo, setHoverInfo] = useState(null);

  useEffect(() => {
    const fetchFires = async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/v1/fires/active?year=${year}&day=${day}`);
        const data = await res.json();
        setFires(data);
      } catch (err) {
        console.error("Error fetching fires:", err);
      }
    };
    fetchFires();
  }, [year, day]);

  const layers = [
    new ScatterplotLayer({
      id: 'scatter',
      data: fires,
      getPosition: d => [d.lon, d.lat],
      getRadius: d => Math.sqrt(d.fire_size) * 30,
      getFillColor: d => [255, 69, 0, 160],
      radiusMinPixels: 2,
      pickable: true,
      onHover: info => setHoverInfo(info.object ? { ...info, x: info.x, y: info.y } : null)
    })
  ];

  return (
    <div style={{ position: 'relative' }}>
      <DeckGL
        initialViewState={INITIAL_VIEW_STATE}
        controller={{ 
          maxZoom: 10,
          minZoom: 2,
          dragPan: true,
          doubleClickZoom: true,
          bounds: MAP_BOUNDS
        }}
        layers={layers}
        style={{ height: '100vh' }}
      >
        <Map
          mapLib={maplibregl}
          mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
        />

        {/* Tooltip */}
        {hoverInfo && (
          <div
            style={{
              position: 'absolute',
              zIndex: 10,
              pointerEvents: 'none',
              left: hoverInfo.x,
              top: hoverInfo.y,
              background: 'white',
              padding: '6px 10px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '12px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
            }}
          >
            <div><strong>🔥 Fire Size:</strong> {Math.round(hoverInfo.object.fire_size).toLocaleString()} acres</div>
            <div><strong>📍 Cause:</strong> {hoverInfo.object.cause}</div>
            <div><strong>🏛️ Agency:</strong> {hoverInfo.object.agency}</div>
            <div><strong>🗓️ Year:</strong> {hoverInfo.object.fire_year}</div>
            <div><strong>🗺️ State:</strong> {hoverInfo.object.state}</div>
          </div>
        )}
      </DeckGL>

      {/* Controls: slider + year */}
      <div style={{
        position: 'absolute',
        top: 10,
        left: 10,
        zIndex: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: '10px 15px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
        fontSize: '14px'
      }}>
        <label>
          <strong>Year:</strong>
          <select value={year} onChange={e => setYear(parseInt(e.target.value))} style={{ marginLeft: '8px' }}>
            {[...Array(2016 - 1992)].map((_, i) => {
              const y = 1992 + i;
              return <option key={y} value={y}>{y}</option>;
            })}
          </select>
        </label>
        <br />
        <label>
          <strong>Day of Year ({day}):</strong>
          <input
            type="range"
            min="1"
            max="366"
            value={day}
            onChange={e => setDay(parseInt(e.target.value))}
            style={{ width: '250px', display: 'block', marginTop: '6px' }}
          />
        </label>
      </div>
    </div>
  );
}

export default App;
