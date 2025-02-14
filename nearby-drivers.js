import React, { useState, useEffect } from 'react';
import { MapPin, Star, Route, Car, Phone } from 'lucide-react';

export default function NearbyDrivers() {
  const [drivers, setDrivers] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Get user location
    const getUserLocation = () => {
      if (!navigator.geolocation) {
        setError('المتصفح لا يدعم تحديد الموقع');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          setError('فشل في تحديد موقعك');
        }
      );
    };

    getUserLocation();
  }, []);

  useEffect(() => {
    if (!userLocation) return;

    const driversRef = window.firebase.database().ref('drivers');
    
    driversRef.on('value', (snapshot) => {
      const driversData = snapshot.val();
      if (!driversData) {
        setLoading(false);
        return;
      }

      // Calculate distance and filter nearby drivers
      const nearbyDriversList = Object.entries(driversData)
        .map(([id, driver]) => ({
          id,
          ...driver,
          distance: calculateDistance(
            userLocation.lat,
            userLocation.lng,
            driver.coordinates?.lat || 0,
            driver.coordinates?.lng || 0
          )
        }))
        .filter(driver => driver.distance <= 10) // Only show drivers within 10km
        .sort((a, b) => a.distance - b.distance);

      setDrivers(nearbyDriversList);
      setLoading(false);
    });

    return () => driversRef.off();
  }, [userLocation]);

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return +(R * c).toFixed(1);
  };

  const deg2rad = (deg) => deg * (Math.PI/180);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-white">جاري البحث عن السائقين في منطقتك...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <h1 className="text-2xl font-bold text-yellow-400 mb-6 text-center">
        السائقين في منطقتك
      </h1>
      
      {drivers.length === 0 ? (
        <div className="text-center text-white">
          لا يوجد سائقين في منطقتك حالياً
        </div>
      ) : (
        <div className="grid gap-4">
          {drivers.map((driver) => (
            <div 
              key={driver.id} 
              className="bg-gray-800 rounded-lg overflow-hidden shadow-lg border border-yellow-400"
            >
              <div className="p-4">
                <div className="flex items-center gap-4">
                  <img 
                    src={driver.imageUrl || '/default-avatar.png'} 
                    alt={driver.name}
                    className="w-16 h-16 rounded-full border-2 border-yellow-400 object-cover"
                  />
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white">{driver.name}</h3>
                    <div className="flex items-center gap-2 text-gray-300">
                      <Star className="w-4 h-4 text-yellow-400" />
                      <span>{driver.rating?.toFixed(1) || '5.0'}</span>
                      <span className="mx-2">•</span>
                      <Route className="w-4 h-4 text-yellow-400" />
                      <span>{driver.trips || 0} رحلة</span>
                    </div>
                  </div>
                  <div className="text-right text-white">
                    <div className="text-lg font-bold text-yellow-400">{driver.distance} كم</div>
                    <div className="text-sm text-gray-400">يبعد عنك</div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-gray-300">
                    <Car className="w-4 h-4 text-yellow-400" />
                    <span>{driver.carType} - {driver.carModel}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-300">
                    <MapPin className="w-4 h-4 text-yellow-400" />
                    <span>{driver.location}</span>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <button 
                    onClick={() => window.openChatWindow(driver.id)}
                    className="flex-1 bg-yellow-400 text-black py-2 rounded-lg font-bold hover:bg-yellow-500 transition-colors"
                  >
                    مراسلة
                  </button>
                  <button 
                    onClick={() => window.bookDriver(driver.id)}
                    className="flex-1 border-2 border-yellow-400 text-yellow-400 py-2 rounded-lg font-bold hover:bg-yellow-400 hover:text-black transition-colors"
                  >
                    حجز
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}