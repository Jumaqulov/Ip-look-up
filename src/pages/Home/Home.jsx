import React, { useState } from 'react';
import axios from 'axios';
import {
    FaSearchLocation,
    FaFlag,
    FaMapMarkerAlt,
    FaNetworkWired,
    FaBuilding,
    FaClock,
    FaHashtag,
    FaGlobe,
    FaMapPin,
    FaGlobeEurope,
} from 'react-icons/fa';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Alert, Spinner } from 'react-bootstrap';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import MapUpdater from './MapUpdater';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

function countryCodeToEmoji(countryCode) {
    if (!countryCode || countryCode.length !== 2) {
        return '';
    }

    return countryCode
        .toUpperCase()
        .split('')
        .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
        .join('');
}

export default function Home() {
    const [ip, setIp] = useState('');
    const [data, setData] = useState(null);
    const [position, setPosition] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSearch = async () => {
        const query = ip.trim();

        if (!query) {
            setError('IP manzil kiriting.');
            setData(null);
            setPosition(null);
            return;
        }

        setLoading(true);
        setError('');

        try {
            const res = await axios.get(`https://ipapi.co/${query}/json/`);

            if (res.data.error) {
                setData(null);
                setPosition(null);
                setError(res.data.reason || 'Bu IP bo\'yicha ma\'lumot topilmadi.');
                return;
            }

            setData(res.data);

            if (res.data.latitude !== undefined && res.data.longitude !== undefined) {
                setPosition([res.data.latitude, res.data.longitude]);
            } else {
                setPosition(null);
            }
        } catch (err) {
            console.error(err);
            setData(null);
            setPosition(null);
            setError('So\'rov bajarilmadi. Boshqa public IP bilan qayta urinib ko\'ring.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container py-5">
            <div className="text-center mb-4">
                <h2 className="mb-4">IP Lookup</h2>
                <div className="d-flex flex-column flex-md-row justify-content-center gap-2">
                    <input
                        type="text"
                        placeholder="IP address kiriting"
                        className="form-control w-100 w-md-50"
                        value={ip}
                        onChange={(e) => setIp(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                handleSearch();
                            }
                        }}
                    />
                    <button
                        className="btn btn-primary d-flex align-items-center justify-content-center"
                        onClick={handleSearch}
                        disabled={loading}
                        style={{ minWidth: 110 }}
                    >
                        {loading ? (
                            <>
                                <Spinner
                                    animation="border"
                                    size="sm"
                                    role="status"
                                    className="me-2"
                                />
                                Yuklanmoqda...
                            </>
                        ) : (
                            <>
                                <FaSearchLocation className="me-2" />
                                Qidirish
                            </>
                        )}
                    </button>
                </div>
            </div>

            {error && (
                <Alert variant="warning" className="mb-4">
                    {error}
                </Alert>
            )}

            {data && (
                <div className="table-responsive mb-5 mt-4">
                    <table className="table table-bordered table-hover text-center align-middle">
                        <thead className="table-dark">
                            <tr>
                                <th><FaHashtag /> IP</th>
                                <th><FaFlag /> Mamlakat</th>
                                <th><FaMapMarkerAlt /> Shahar</th>
                                <th><FaMapPin /> Region</th>
                                <th><FaGlobe /> Postal</th>
                                <th><FaNetworkWired /> Provider</th>
                                <th><FaBuilding /> Org</th>
                                <th><FaHashtag /> ASN</th>
                                <th><FaClock /> Timezone</th>
                                <th><FaGlobeEurope /> Koordinata</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>{data.ip}</td>
                                <td>
                                    <span style={{ marginRight: 6 }}>{countryCodeToEmoji(data.country_code)}</span>
                                    {data.country_name}
                                </td>
                                <td>{data.city}</td>
                                <td>{data.region || '-'}</td>
                                <td>{data.postal || '-'}</td>
                                <td>{data.network || '-'}</td>
                                <td>{data.org || '-'}</td>
                                <td>{data.asn || '-'}</td>
                                <td>{data.timezone || '-'}</td>
                                <td>{data.latitude}, {data.longitude}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}

            {position && (
                <div className="mb-5" style={{ height: '400px' }}>
                    <MapContainer center={position} zoom={10} style={{ height: '100%', width: '100%' }}>
                        <MapUpdater position={position} />
                        <TileLayer
                            attribution="&copy; OpenStreetMap contributors"
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <Marker position={position}>
                            <Popup>{data.city}, {data.country_name}</Popup>
                        </Marker>
                    </MapContainer>
                </div>
            )}
        </div>
    );
}
