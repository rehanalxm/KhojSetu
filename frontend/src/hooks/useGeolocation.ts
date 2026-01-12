import { useState, useCallback } from 'react';

interface GeolocationState {
    loaded: boolean;
    coordinates: { lat: number; lng: number } | null;
    error?: { code: number; message: string };
}

export const useGeolocation = () => {
    const [location, setLocation] = useState<GeolocationState>({
        loaded: false,
        coordinates: null,
    });

    const onSuccess = useCallback((location: GeolocationPosition) => {
        setLocation({
            loaded: true,
            coordinates: {
                lat: location.coords.latitude,
                lng: location.coords.longitude,
            },
        });
    }, []);

    const onError = useCallback((error: GeolocationPositionError) => {
        setLocation({
            loaded: true,
            coordinates: null,
            error: {
                code: error.code,
                message: error.message,
            },
        });
    }, []);

    const getCurrentLocation = useCallback(() => {
        if (!("geolocation" in navigator)) {
            onError({
                code: 0,
                message: "Geolocation not supported",
            } as GeolocationPositionError);
            return;
        }

        navigator.geolocation.getCurrentPosition(onSuccess, onError);
    }, [onSuccess, onError]);

    const reverseGeocode = useCallback(async (lat: number, lng: number) => {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=en`
            );
            const data = await response.json();
            return {
                address: data.display_name,
                city: data.address.city || data.address.town || data.address.village || data.address.suburb || '',
                state: data.address.state || '',
                country: data.address.country || '',
            };
        } catch (error) {
            console.error("Reverse geocoding failed:", error);
            return null;
        }
    }, []);

    return { location, getCurrentLocation, reverseGeocode };
};
