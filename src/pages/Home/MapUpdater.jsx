import { useMap } from 'react-leaflet';
import { useEffect } from 'react';

function MapUpdater({ position }) {
    const map = useMap();
    useEffect(() => {
        if (position) {
            map.setView(position, map.getZoom());
        }
    }, [position, map]);
    return null;
}

export default MapUpdater