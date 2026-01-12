import { useLiveLocations } from "@/hooks/use-locations";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

export default function LiveMap() {
  const { data: locations, isLoading } = useLiveLocations();
  const activeLocations = (locations as any[]) || [];
  const defaultCenter: [number, number] = [40.7128, -74.006];

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[50vh]"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Live Field Map</h1>
          <p className="text-muted-foreground">Real-time location of active team members.</p>
        </div>
        <div className="bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">{activeLocations.length} Active</div>
      </div>

      <div className="flex-1 rounded-2xl overflow-hidden border">
        <MapContainer center={activeLocations[0]?.location ? [activeLocations[0].location.lat, activeLocations[0].location.lng] : defaultCenter} zoom={13} style={{ height: "100%", width: "100%" }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {activeLocations.map((item: any) => (
            <Marker key={item.user.id} position={[item.location.lat, item.location.lng]}>
              <Popup><div className="font-semibold">{item.user.firstName} {item.user.lastName}</div></Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
