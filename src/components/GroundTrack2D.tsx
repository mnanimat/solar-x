import React, { useMemo } from 'react';
import type { CelestialBodyId, GroundNetworkOption, OrbitOption } from '../engine/missionCatalog';

interface GroundTrack2DProps {
  orbit: OrbitOption;
  groundNetwork: GroundNetworkOption;
  subSatLatDeg?: number;
  subSatLonDeg?: number;
  inGroundPass?: boolean;
  activeStationName?: string | null;
  elapsedDays?: number;
  compact?: boolean;
}

function projectLon(lon: number, width: number): number {
  return ((lon + 180) / 360) * width;
}

function projectLat(lat: number, height: number): number {
  return ((90 - lat) / 180) * height;
}

// Simplified vector continental silhouettes for equirectangular ground track
const EARTH_CONTINENTS = [
  // North America
  'M 55 38 L 95 28 L 135 32 L 145 55 L 122 88 L 106 105 L 88 98 L 76 74 L 54 62 Z',
  // South America
  'M 116 112 L 148 118 L 160 144 L 142 184 L 126 196 L 118 158 Z',
  // Europe
  'M 225 38 L 266 30 L 278 52 L 252 68 L 228 65 Z',
  // Africa
  'M 224 78 L 268 76 L 288 106 L 272 158 L 248 164 L 234 128 L 218 102 Z',
  // Asia
  'M 272 30 L 388 26 L 424 52 L 408 88 L 368 108 L 330 104 L 296 86 L 275 58 Z',
  // Australia
  'M 378 134 L 420 132 L 428 162 L 392 168 L 376 152 Z',
  // Antarctica strip
  'M 20 198 L 460 198 L 460 218 L 20 218 Z',
];

export const GroundTrack2D: React.FC<GroundTrack2DProps> = ({
  orbit,
  groundNetwork,
  subSatLatDeg = 18.4,
  subSatLonDeg = -42.0,
  inGroundPass = false,
  activeStationName = null,
  elapsedDays = 0,
  compact = false,
}) => {
  const width = 480;
  const height = 220;
  const body: CelestialBodyId = orbit.targetBody;

  const trackSegments = useMemo(() => {
    const incRad = (orbit.inclinationDeg * Math.PI) / 180;
    const nodalShift = elapsedDays * 22.5;
    const segments: string[] = [];
    let currentPath = '';
    let prevLon: number | null = null;

    for (let deg = 0; deg <= 360; deg += 5) {
      const a = (deg * Math.PI) / 180;
      const lat = (Math.asin(Math.sin(incRad) * Math.sin(a)) * 180) / Math.PI;
      const shifted = deg - nodalShift + 180;
      const lon = ((((shifted % 360) + 360) % 360) - 180);
      const x = projectLon(lon, width);
      const y = projectLat(lat, height);

      if (prevLon !== null && Math.abs(lon - prevLon) > 120) {
        if (currentPath) segments.push(currentPath);
        currentPath = `M ${x.toFixed(1)} ${y.toFixed(1)}`;
      } else {
        currentPath += currentPath ? ` L ${x.toFixed(1)} ${y.toFixed(1)}` : `M ${x.toFixed(1)} ${y.toFixed(1)}`;
      }
      prevLon = lon;
    }
    if (currentPath) segments.push(currentPath);
    return segments;
  }, [orbit.inclinationDeg, elapsedDays]);

  const satX = projectLon(subSatLonDeg, width);
  const satY = projectLat(subSatLatDeg, height);

  const bgPalette: Record<CelestialBodyId, { ocean: string; land: string; stroke: string; label: string }> = {
    earth: { ocean: '#081221', land: '#172940', stroke: '#28456A', label: 'EARTH EQUIRECTANGULAR TRACK' },
    moon: { ocean: '#11141B', land: '#252B37', stroke: '#3D4759', label: 'LUNAR SOUTH-POLE NRHO TRACE' },
    mars: { ocean: '#1E110E', land: '#472318', stroke: '#6E3826', label: 'MARS AREOGRAPHIC TRACE' },
    europa: { ocean: '#0D1722', land: '#1F364C', stroke: '#3E678A', label: 'EUROPA ICE-SHELL FLYBY TRACE' },
  };
  const palette = bgPalette[body];

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div className="flex items-center justify-between text-[11px] font-mono-tabular text-slate-400">
        <span className="uppercase tracking-wider text-cyan-300/90 font-medium">{palette.label}</span>
        <span>
          LAT {subSatLatDeg >= 0 ? '+' : ''}
          {subSatLatDeg.toFixed(1)}° · LON {subSatLonDeg >= 0 ? '+' : ''}
          {subSatLonDeg.toFixed(1)}°
        </span>
      </div>

      <div className="relative rounded-lg border border-slate-800/90 bg-[#070B13] overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className={`w-full ${compact ? 'h-32' : 'h-44'} block`}
          aria-label="2D Orbital Ground Track Map"
        >
          <rect x={0} y={0} width={width} height={height} fill={palette.ocean} />

          {/* Night-side solar shadow band */}
          <rect
            x={(width * ((0.55 + elapsedDays * 0.03) % 1)) % width}
            y={0}
            width={width * 0.36}
            height={height}
            fill="#02050A"
            opacity={0.42}
          />

          {/* Lat/Lon Grid */}
          {[-60, -30, 0, 30, 60].map((lat) => (
            <line
              key={`lat-${lat}`}
              x1={0}
              y1={projectLat(lat, height)}
              x2={width}
              y2={projectLat(lat, height)}
              stroke="#1E293B"
              strokeWidth={lat === 0 ? 1 : 0.6}
              strokeDasharray={lat === 0 ? undefined : '3 4'}
            />
          ))}
          {[-120, -60, 0, 60, 120].map((lon) => (
            <line
              key={`lon-${lon}`}
              x1={projectLon(lon, width)}
              y1={0}
              x2={projectLon(lon, width)}
              y2={height}
              stroke="#1E293B"
              strokeWidth={0.6}
              strokeDasharray="3 4"
            />
          ))}

          {/* Surface Features */}
          {body === 'earth' &&
            EARTH_CONTINENTS.map((d, idx) => (
              <path key={idx} d={d} fill={palette.land} stroke={palette.stroke} strokeWidth={0.9} />
            ))}

          {body === 'moon' && (
            <g opacity={0.7}>
              <circle cx={140} cy={80} r={28} fill={palette.land} stroke={palette.stroke} />
              <circle cx={310} cy={125} r={38} fill={palette.land} stroke={palette.stroke} />
              <circle cx={230} cy={180} r={24} fill="#162133" stroke="#38BDF8" strokeDasharray="2 2" />
              <text x={230} y={183} textAnchor="middle" fill="#7DD3FC" fontSize={8} fontFamily="monospace">
                SOUTH POLE PSR
              </text>
            </g>
          )}

          {body === 'mars' && (
            <g opacity={0.7}>
              <path d="M 80 105 Q 170 96 255 112" stroke="#9A4E33" strokeWidth={5} fill="none" />
              <circle cx={115} cy={72} r={18} fill={palette.land} stroke="#C26D4A" />
              <ellipse cx={330} cy={135} rx={52} ry={28} fill={palette.land} stroke={palette.stroke} />
            </g>
          )}

          {body === 'europa' && (
            <g opacity={0.65}>
              <path d="M 15 45 L 445 145 M 40 165 L 420 55 M 160 15 L 290 205" stroke="#5389B5" strokeWidth={1.3} />
              <circle cx={240} cy={110} r={44} fill="none" stroke="#38BDF8" strokeDasharray="4 4" />
            </g>
          )}

          {/* Orbital Ground Track Path */}
          {trackSegments.map((d, i) => (
            <path
              key={i}
              d={d}
              fill="none"
              stroke="#38BDF8"
              strokeWidth={1.6}
              strokeOpacity={0.78}
              strokeDasharray="4 2"
            />
          ))}

          {/* Ground Stations (for Earth or Deep Space Earth Link indicator) */}
          {body === 'earth' &&
            groundNetwork.stationCoords.map((st) => {
              const sx = projectLon(st.lon, width);
              const sy = projectLat(st.lat, height);
              const isActive = activeStationName === st.name && inGroundPass;
              return (
                <g key={st.name}>
                  <circle
                    cx={sx}
                    cy={sy}
                    r={isActive ? 28 : 22}
                    fill={isActive ? '#10B981' : '#F59E0B'}
                    fillOpacity={isActive ? 0.16 : 0.08}
                    stroke={isActive ? '#34D399' : '#F59E0B'}
                    strokeOpacity={isActive ? 0.85 : 0.45}
                    strokeWidth={1}
                  />
                  <circle cx={sx} cy={sy} r={3} fill={isActive ? '#34D399' : '#FBBF24'} />
                  <text
                    x={sx + 5}
                    y={sy - 5}
                    fill={isActive ? '#6EE7B7' : '#CBD5E1'}
                    fontSize={8.5}
                    fontFamily="monospace"
                  >
                    {st.name}
                  </text>
                  {isActive && (
                    <line
                      x1={sx}
                      y1={sy}
                      x2={satX}
                      y2={satY}
                      stroke="#34D399"
                      strokeWidth={1.4}
                      strokeDasharray="3 2"
                    />
                  )}
                </g>
              );
            })}

          {/* Sub-Satellite Marker */}
          <circle cx={satX} cy={satY} r={10} fill="#38BDF8" fillOpacity={0.22} />
          <circle cx={satX} cy={satY} r={4} fill="#38BDF8" stroke="#081221" strokeWidth={1.2} />
        </svg>
      </div>
    </div>
  );
};
