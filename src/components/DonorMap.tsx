import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons in bundler context
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const donorIcon = L.divIcon({
  className: "",
  html: `<div style="background:hsl(354 78% 47%);width:28px;height:28px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-size:14px;font-weight:bold;">♥</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const hospitalIcon = L.divIcon({
  className: "",
  html: `<div style="background:hsl(220 80% 50%);width:32px;height:32px;border-radius:8px;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-size:16px;font-weight:bold;">+</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

export type MapDonor = {
  id: string;
  name: string;
  blood_type: string;
  city: string;
  latitude: number;
  longitude: number;
};

type Props = {
  center: { lat: number; lng: number };
  donors: MapDonor[];
  radiusKm?: number;
  hospital?: { lat: number; lng: number; label: string } | null;
  height?: string;
};

export const DonorMap = ({ center, donors, radiusKm, hospital, height = "400px" }: Props) => {
  return (
    <div style={{ height }} className="overflow-hidden rounded-lg border border-border shadow-card">
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={12}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {radiusKm && (
          <Circle
            center={[center.lat, center.lng]}
            radius={radiusKm * 1000}
            pathOptions={{
              color: "hsl(354 78% 47%)",
              fillColor: "hsl(354 78% 47%)",
              fillOpacity: 0.08,
              weight: 2,
            }}
          />
        )}
        {hospital && (
          <Marker position={[hospital.lat, hospital.lng]} icon={hospitalIcon}>
            <Popup>
              <strong>{hospital.label}</strong>
              <br /> Hospital
            </Popup>
          </Marker>
        )}
        {donors.map((d) => (
          <Marker key={d.id} position={[d.latitude, d.longitude]} icon={donorIcon}>
            <Popup>
              <strong>{d.name}</strong>
              <br />
              Blood: <strong>{d.blood_type}</strong>
              <br />
              {d.city}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};
