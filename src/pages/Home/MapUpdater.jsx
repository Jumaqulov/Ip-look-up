import { useMap } from 'react-leaflet';
import { useEffect } from 'react';

function MapUpdater({ position }) {
    const map = useMap();

    useEffect(() => {
        if (position) {
            map.flyTo(position, 13, {
                animate: true,
                duration: 1.15,
            });
        }
    }, [position, map]);

    return null;
}

export default MapUpdater
