import DeckGL from '@deck.gl/react';
import maplibregl from 'maplibre-gl';
import Map from 'react-map-gl/maplibre';
import { useState, useEffect } from 'react';
import { ScatterplotLayer } from '@deck.gl/layers';

import Box from '@mui/material/Box';

import { CONFIG } from 'src/config-global';
import { DashboardContent } from 'src/layouts/dashboard';

const INITIAL_VIEW_STATE = {
  longitude: -100,
  latitude: 37,
  zoom: 4,
  pitch: 0,
  bearing: 0,
};

const MAP_BOUNDS: [[number, number], [number, number]] = [
  [-170, 15],
  [-50, 72],
];

type Fire = {
  lon: number;
  lat: number;
  fire_size: number;
  cause: string;
  agency: string;
  fire_year: number;
  state: string;
};

export default function WildfireMapPage() {
  const [year, setYear] = useState(2004);
  const [day, setDay] = useState(183);
  const [fires, setFires] = useState<Fire[]>([]);
  const [hoverInfo, setHoverInfo] = useState<{x: number; y: number; object: Fire} | null>(null);

  useEffect(() => {
    const fetchFires = async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/v1/fires/active?year=${year}&day=${day}`);
        const data = await res.json();
        setFires(data);
      } catch (err) {
        console.error('Error fetching fires:', err);
      }
    };
    fetchFires();
  }, [year, day]);

  const layers = [
    new ScatterplotLayer({
      id: 'scatter',
      data: fires,
      getPosition: (d: Fire) => [d.lon, d.lat],
      getRadius: (d: Fire) => Math.sqrt(d.fire_size) * 30,
      getFillColor: [255, 69, 0, 160],
      radiusMinPixels: 2,
      pickable: true,
      onHover: (info: any) => setHoverInfo(info.object ? { ...info, x: info.x, y: info.y } : null),
    }),
  ];

  return (
    <>
      <title>{`Wildfire Map - ${CONFIG.appName}`}</title>
      <DashboardContent disablePadding>
        <Box sx={{ position: 'relative', height: 600 }}>
          <DeckGL
            initialViewState={INITIAL_VIEW_STATE}
            controller={{ dragPan: true, doubleClickZoom: true }}
            layers={layers}
          >
            <Map
              mapLib={maplibregl}
              mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
            />
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
                  boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
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

          <div
            style={{
              position: 'absolute',
              top: 10,
              left: 10,
              zIndex: 20,
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              padding: '10px 15px',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
              fontSize: '14px',
            }}
          >
            <label>
              <strong>Year:</strong>
              <select
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value, 10))}
                style={{ marginLeft: '8px' }}
              >
                {[...Array(2016 - 1992)].map((_, i) => {
                  const y = 1992 + i;
                  return (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  );
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
                onChange={(e) => setDay(parseInt(e.target.value, 10))}
                style={{ width: '250px', display: 'block', marginTop: '6px' }}
              />
            </label>
          </div>
        </Box>
      </DashboardContent>
    </>
  );
}
