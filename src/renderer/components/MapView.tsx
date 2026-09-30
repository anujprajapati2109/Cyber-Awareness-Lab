import L from "leaflet";
import { useEffect, useRef } from "react";
import type { LocationGrant } from "../../shared/types";

export function MapView({ location }: { location?: LocationGrant }) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current || !location) return;
    const map = L.map(ref.current, { zoomControl: true }).setView([location.latitude, location.longitude], 15);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);
    L.circle([location.latitude, location.longitude], {
      radius: location.accuracy,
      color: "#25f39b",
      fillColor: "#25f39b",
      fillOpacity: 0.12
    }).addTo(map);
    L.marker([location.latitude, location.longitude]).addTo(map);
    return () => {
      map.remove();
    };
  }, [location]);

  if (!location) {
    return <div className="flex h-72 items-center justify-center rounded-md border border-white/10 bg-black/30 text-slate-400">Location not granted</div>;
  }
  return <div ref={ref} className="h-72 overflow-hidden rounded-md border border-cyber/20" />;
}
