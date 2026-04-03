'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import type { Listing } from 'db';

// Fix for default icon path issue with Webpack/Next.js
const defaultIconPrototype = L.Icon.Default.prototype as L.Icon.Default & {
  _getIconUrl?: string;
};

delete defaultIconPrototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Extended Listing type with optional coordinates
interface ListingWithCoordinates extends Omit<Listing, 'latitude' | 'longitude'> {
  latitude: number | null;
  longitude: number | null;
}

interface ListingsMapProps {
  listings: ListingWithCoordinates[];
}

export function ListingsMap({ listings }: ListingsMapProps) {
  // Filter listings that have coordinates
  const listingsWithCoords = listings.filter(
    (listing): listing is ListingWithCoordinates & { latitude: number; longitude: number } =>
      listing.latitude !== null && listing.longitude !== null
  );

  // Calculate initial center (e.g., based on the first listing or a default)
  const initialCenter: L.LatLngExpression = listingsWithCoords.length > 0 && listingsWithCoords[0]
    ? [listingsWithCoords[0].latitude, listingsWithCoords[0].longitude]
    : [51.505, -0.09]; // Default center (London)
  const initialZoom = listingsWithCoords.length > 0 ? 13 : 5; // Adjust zoom based on data

  if (typeof window === 'undefined') {
    // Avoid rendering Leaflet components on the server
    return null;
  }

  return (
    <MapContainer
      center={initialCenter}
      zoom={initialZoom}
      scrollWheelZoom={false}
      style={{ height: '500px', width: '100%' }} // Adjust height as needed
      className="rounded-md z-0" // z-index needed for some UI libraries
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {listingsWithCoords.map((listing) => (
        <Marker
          key={listing.id}
          position={[listing.latitude, listing.longitude]}
        >
          <Popup>
            <strong>{listing.address}</strong><br />
            {listing.price ? `$${listing.price}` : 'Price not available'}<br />
            {/* Add link to listing page or more details */}
            <a href={listing.url || '#'} target="_blank" rel="noopener noreferrer">View Listing</a>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}