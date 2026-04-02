/**
 * UniversalMap — switches between Mapbox GL JS (react-map-gl) and
 * OpenStreetMap/Google (react-leaflet) based on the `provider` prop.
 *
 * The Mapbox implementation is lazily loaded so the mapbox-gl bundle
 * (~700 KB) is only fetched when the admin has actually configured a
 * Mapbox provider.  This keeps the initial page load fast for the
 * default OSM configuration.
 *
 * Map provider and API token are fetched from /api/maps/config (DB-managed)
 * so API keys never appear in the frontend build artifacts.
 */
import { useRef, useEffect, useMemo, useState, lazy, Suspense } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type MapProvider = "osm" | "mapbox" | "google";

/* ── Normalised data types shared by both providers ──────────────────────── */
export interface MapMarkerData {
  id: string;
  lat: number;
  lng: number;
  /** Pre-built SVG/HTML string for the icon body */
  iconHtml: string;
  /** Square pixel size of the icon container */
  iconSize: number;
  /** Optional text label rendered above the marker (rider name / ID) */
  label?: string;
  /** Reduces opacity to 50 % — used for offline-but-recently-active riders */
  dimmed?: boolean;
  onClick?: () => void;
}

export interface MapPolylineData {
  id: string;
  positions: Array<[number, number]>;
  color?: string;
  weight?: number;
  opacity?: number;
  dashArray?: string;
}

interface UniversalMapProps {
  provider: MapProvider;
  /** Mapbox access token / Google Maps API key (fetched from backend) */
  token?: string;
  center: [number, number];
  zoom?: number;
  markers?: MapMarkerData[];
  polylines?: MapPolylineData[];
  style?: React.CSSProperties;
  className?: string;
  /** Extra children passed into the Leaflet MapContainer (e.g. existing overlays) */
  leafletChildren?: React.ReactNode;
}

/* ══════════════════════════════════════════════════════════════════════════
   LEAFLET IMPLEMENTATION
══════════════════════════════════════════════════════════════════════════ */

function makeDivIcon(m: MapMarkerData): L.DivIcon {
  const opacity = m.dimmed ? "0.5" : "1";
  const labelHtml = m.label
    ? `<div style="position:absolute;top:${-(m.iconSize / 2 + 18)}px;left:50%;transform:translateX(-50%);white-space:nowrap;background:rgba(0,0,0,0.75);color:#fff;font-size:10px;font-weight:700;padding:1px 5px;border-radius:4px;pointer-events:none">${m.label}</div>`
    : "";
  return L.divIcon({
    html: `<div style="position:relative;opacity:${opacity}">
      ${labelHtml}
      ${m.iconHtml}
    </div>`,
    className: "",
    iconSize: [m.iconSize, m.iconSize],
    iconAnchor: [m.iconSize / 2, m.iconSize / 2],
  });
}

/** Pans the Leaflet map when the center prop changes programmatically */
function LeafletCenterUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  const prev = useRef<[number, number]>([0, 0]);
  useEffect(() => {
    const [lat, lng] = center;
    const [pLat, pLng] = prev.current;
    if (Math.abs(lat - pLat) > 0.0001 || Math.abs(lng - pLng) > 0.0001) {
      map.setView(center, zoom, { animate: true });
      prev.current = center;
    }
  }, [center, zoom, map]);
  return null;
}

function LeafletMap({
  provider,
  token,
  center,
  zoom = 12,
  markers = [],
  polylines = [],
  style,
  className,
  leafletChildren,
}: UniversalMapProps) {
  /* Tile layer URL based on provider */
  const tileUrl = useMemo(() => {
    if (provider === "mapbox" && token) {
      return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token=${token}`;
    }
    if (provider === "google" && token) {
      return `https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&key=${token}`;
    }
    return "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  }, [provider, token]);

  const tileAttrib = useMemo(() => {
    if (provider === "mapbox") return '© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
    if (provider === "google") return "© Google Maps";
    return '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
  }, [provider]);

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={style ?? { width: "100%", height: "100%" }}
      className={className}
      zoomControl={false}
    >
      <TileLayer url={tileUrl} attribution={tileAttrib} maxZoom={19} />
      <LeafletCenterUpdater center={center} zoom={zoom} />

      {markers.map(m => (
        <Marker
          key={m.id}
          position={[m.lat, m.lng]}
          icon={makeDivIcon(m)}
          eventHandlers={{ click: m.onClick ?? (() => {}) }}
        />
      ))}

      {polylines.map(p => (
        <Polyline
          key={p.id}
          positions={p.positions}
          pathOptions={{
            color: p.color ?? "#6366f1",
            weight: p.weight ?? 2.5,
            opacity: p.opacity ?? 0.7,
            dashArray: p.dashArray ?? "6,4",
          }}
        />
      ))}

      {leafletChildren}
    </MapContainer>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   MAPBOX GL JS IMPLEMENTATION — lazily loaded (react-map-gl + mapbox-gl)
   Isolated in a separate module to avoid a static import that would fail
   in `tsc --noEmit` due to the pnpm virtual store symlink layout.
══════════════════════════════════════════════════════════════════════════ */

/* Dynamic import wrapper — only executed when Mapbox is active */
const MapboxMapLazy = lazy(() =>
  /* react-map-gl is installed as a dependency; Vite resolves it correctly */
  import("react-map-gl").then(rgl => {
    const { default: MapGL, Marker: MapboxMarker, Source, Layer, NavigationControl } = rgl;

    function MapboxMapImpl(props: UniversalMapProps) {
      const { token = "", center, zoom = 12, markers = [], polylines = [], style, className } = props;
      const [viewState, setViewState] = useState({
        longitude: center[1],
        latitude: center[0],
        zoom,
      });

      useEffect(() => {
        setViewState(v => ({ ...v, latitude: center[0], longitude: center[1] }));
      /* eslint-disable-next-line react-hooks/exhaustive-deps */
      }, [center[0], center[1]]);

      const polylineGeoJSON = useMemo(() => ({
        type: "FeatureCollection" as const,
        features: polylines.map(p => ({
          type: "Feature" as const,
          id: p.id,
          geometry: {
            type: "LineString" as const,
            coordinates: p.positions.map(([lat, lng]) => [lng, lat]),
          },
          properties: { color: p.color ?? "#6366f1", opacity: p.opacity ?? 0.7, weight: p.weight ?? 2.5 },
        })),
      }), [polylines]);

      return (
        <MapGL
          {...viewState}
          onMove={(e: { viewState: typeof viewState }) => setViewState(e.viewState)}
          mapboxAccessToken={token}
          mapStyle="mapbox://styles/mapbox/streets-v12"
          style={style ?? { width: "100%", height: "100%" }}
          className={className}
        >
          <NavigationControl position="top-right" />

          {polylines.length > 0 && (
            <Source id="polylines" type="geojson" data={polylineGeoJSON}>
              <Layer
                id="polyline-layer"
                type="line"
                paint={{ "line-color": ["get", "color"], "line-opacity": ["get", "opacity"], "line-width": ["get", "weight"] }}
                layout={{ "line-join": "round", "line-cap": "round" }}
              />
            </Source>
          )}

          {markers.map(m => (
            <MapboxMarker
              key={m.id}
              longitude={m.lng}
              latitude={m.lat}
              anchor="center"
              onClick={m.onClick}
            >
              <div style={{ opacity: m.dimmed ? 0.5 : 1, position: "relative", cursor: m.onClick ? "pointer" : "default" }}>
                {m.label && (
                  <div style={{
                    position: "absolute", bottom: "100%", left: "50%",
                    transform: "translateX(-50%)", marginBottom: 4,
                    whiteSpace: "nowrap", background: "rgba(0,0,0,0.75)", color: "#fff",
                    fontSize: 10, fontWeight: 700, padding: "1px 5px", borderRadius: 4, pointerEvents: "none",
                  }}>
                    {m.label}
                  </div>
                )}
                <div dangerouslySetInnerHTML={{ __html: m.iconHtml }} />
              </div>
            </MapboxMarker>
          ))}
        </MapGL>
      );
    }

    /* React.lazy requires a default export */
    return { default: MapboxMapImpl };
  })
);

function MapboxMap(props: UniversalMapProps) {
  return (
    <Suspense fallback={
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8f9fa" }}>
        <div style={{ textAlign: "center", color: "#6b7280", fontSize: 13 }}>
          <div style={{ width: 32, height: 32, border: "4px solid #6366f1", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 8px" }} />
          Loading Mapbox…
        </div>
      </div>
    }>
      <MapboxMapLazy {...props} />
    </Suspense>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   PUBLIC EXPORT — switches between implementations
══════════════════════════════════════════════════════════════════════════ */

export default function UniversalMap(props: UniversalMapProps) {
  if (props.provider === "mapbox" && props.token) {
    return <MapboxMap {...props} />;
  }
  /* OSM and Google both use Leaflet (Google: different tile URL, same API) */
  return <LeafletMap {...props} />;
}
