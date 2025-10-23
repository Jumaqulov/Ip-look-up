import React, { useState } from 'react';
import axios from 'axios';
import { FaSearchLocation, FaFlag, FaMapMarkerAlt, FaNetworkWired, FaBuilding, FaClock, FaHashtag, FaGlobe, FaMapPin, FaGlobeEurope } from 'react-icons/fa';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Spinner } from 'react-bootstrap';
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

export default function Home() {
    const [ip, setIp] = useState('');
    const [data, setData] = useState(null);
    const [position, setPosition] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleSearch = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`https://ipwho.is/${ip}`);
            setData(res.data);
            if (res.data.success && res.data.latitude && res.data.longitude) {
                setPosition([res.data.latitude, res.data.longitude]);
            } else {
                setPosition(null);
            }
        } catch (err) {
            console.error(err);
            setData(null);
            setPosition(null);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container py-5">
            {/* IP input va button */}
            <div className="text-center mb-4">
                <h2 className="mb-4">IP Lookup</h2>
                <div className="d-flex flex-column flex-md-row justify-content-center gap-2">
                    <input
                        type="text"
                        placeholder="IP address kiriting"
                        className="form-control w-100 w-md-50"
                        value={ip}
                        onChange={(e) => setIp(e.target.value)}
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

            {/* Jadval */}
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
                                    <img
                                        src={data.flag?.img}
                                        alt={data.country}
                                        style={{ width: 25, marginRight: 5, verticalAlign: 'middle', borderRadius: '3px' }}
                                    />
                                    {data.country}
                                </td>
                                <td>{data.city}</td>
                                <td>{data.region || '-'}</td>
                                <td>{data.postal || '-'}</td>
                                <td>{data.connection?.asn || '-'}</td>
                                <td>{data.connection?.org}</td>
                                <td>{data.connection?.asn}</td>
                                <td>{data.timezone?.id}</td>
                                <td>{data.latitude}, {data.longitude}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}

            {/* Map */}
            {position && (
                <div className="mb-5" style={{ height: '400px' }}>
                    <MapContainer center={position} zoom={10} style={{ height: '100%', width: '100%' }}>
                        <MapUpdater position={position} />
                        <TileLayer
                            attribution='&copy; OpenStreetMap contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <Marker position={position}>
                            <Popup>{data.city}, {data.country}</Popup>
                        </Marker>
                    </MapContainer>
                </div>
            )}
        </div>
    );
}
