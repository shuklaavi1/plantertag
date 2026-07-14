'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Tree {
  id: number;
  planter_name: string;
  species: string;
  latitude: number;
  longitude: number;
  location?: string;
}

interface LeafletMapInnerProps {
  trees: Tree[];
  center?: [number, number];
  zoom?: number;
}

export default function LeafletMapInner({ trees, center = [23.85412, 84.12345], zoom = 13 }: LeafletMapInnerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Filter trees that have valid non-zero latitude/longitude coordinates
    const mapTrees = trees.filter(t => t.latitude && t.longitude && t.latitude !== 0 && t.longitude !== 0);

    // If a custom center is not provided but we have trees, default center to the first tree's location
    const initialCenter: L.LatLngExpression = 
      mapTrees.length > 0 ? [mapTrees[0].latitude, mapTrees[0].longitude] : center;

    // Initialize leaflet map
    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: zoom,
      scrollWheelZoom: false,
    });
    mapRef.current = map;

    // Load OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    // Add markers for trees
    mapTrees.forEach(tree => {
      const isQila = tree.location === 'Qila Grassland';
      const bgColor = isQila ? 'bg-emerald-600 border-emerald-800' : 'bg-green-800 border-green-950';

      const customIcon = L.divIcon({
        className: 'custom-tree-marker',
        html: `<div class="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center shadow-lg font-mono font-black text-[9px] text-white ${bgColor}">#${tree.id}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -10]
      });

      const marker = L.marker([tree.latitude, tree.longitude], { icon: customIcon }).addTo(map);

      const popupHtml = `
        <div style="font-family: sans-serif; min-width: 140px;" class="p-1">
          <p style="font-weight: 700; margin: 0 0 4px 0; font-size: 13px; color: #022c22;">Tree #${tree.id}</p>
          <p style="margin: 0 0 2px 0; font-size: 11px; color: #4b5563;"><strong>Planter:</strong> ${tree.planter_name}</p>
          <p style="margin: 0 0 2px 0; font-size: 11px; color: #4b5563;"><strong>Species:</strong> ${tree.species.split(' (')[0]}</p>
          <p style="margin: 0 0 6px 0; font-size: 11px; color: #4b5563;"><strong>Zone:</strong> ${tree.location || 'Qila Grassland'}</p>
          <a href="/tree/${tree.id}" style="display: inline-block; font-size: 11px; font-weight: 600; color: #059669; text-decoration: none;">View Timeline →</a>
        </div>
      `;

      marker.bindPopup(popupHtml);
    });

    // Adjust map bounds to fit markers if we have multiple trees
    if (mapTrees.length > 1) {
      const group = L.featureGroup(mapTrees.map(t => L.marker([t.latitude, t.longitude])));
      map.fitBounds(group.getBounds().pad(0.15));
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [trees]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full z-10" />
      {/* Simple Custom Leaflet styles for DivIcon and Popups override */}
      <style jsx global>{`
        .leaflet-div-icon {
          background: transparent !important;
          border: none !important;
        }
        .leaflet-popup-content-wrapper {
          border-radius: 12px !important;
          border: 1px solid #e5e7eb !important;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1) !important;
        }
        .leaflet-popup-tip {
          box-shadow: none !important;
        }
      `}</style>
    </div>
  );
}
