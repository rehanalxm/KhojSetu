import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useGeolocation } from '../hooks/useGeolocation';
import { PostService } from '../services/PostService';
import type { Post } from '../types/categories';
import { Flag, MessageCircle, Trash2 } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import type { User } from '../types/auth';

// Custom Icons for LOST and FOUND
const lostIcon = new Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const foundIcon = new Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const userIcon = new Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

function LocationMarker() {
    const { location } = useGeolocation();
    const map = useMap();

    useEffect(() => {
        if (location.coordinates) {
            map.flyTo([location.coordinates.lat, location.coordinates.lng], 13);
        }
    }, [location, map]);

    return location.coordinates === null ? null : (
        <Marker position={[location.coordinates.lat, location.coordinates.lng]} icon={userIcon}>
            <Popup>You are here</Popup>
        </Marker>
    );
}

interface LiveMapProps {
    currentUser: User | null;
    onContact?: (post: Post) => void;
    onDelete?: (postId: number) => void;
}

export default function LiveMap({ currentUser, onContact, onDelete }: LiveMapProps) {
    const { theme } = useTheme();
    const [posts, setPosts] = useState<Post[]>([]);

    useEffect(() => {
        const loadPosts = async () => {
            const allPosts = await PostService.getAllPosts();
            setPosts(allPosts);
        };
        loadPosts();
    }, []);

    const position: [number, number] = [51.505, -0.09];

    return (
        <div className="h-full w-full relative z-0">
            <MapContainer
                center={position}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
                className="z-0 bg-surface"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    url={theme === 'dark'
                        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                        : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    }
                />

                <LocationMarker />

                {posts.map(post => {
                    const isOwner = currentUser && (String(post.userId) === String(currentUser.id));
                    return (
                        <Marker
                            key={post.id}
                            position={[post.location.lat, post.location.lng]}
                            icon={post.type === 'LOST' ? lostIcon : foundIcon}
                        >
                            <Popup className="custom-popup">
                                <div className="min-w-[200px]">
                                    {post.imageUrl && (
                                        <div className="h-24 w-full mb-2 rounded-lg overflow-hidden relative">
                                            <img src={post.imageUrl} className="w-full h-full object-cover" />
                                            <span className={`absolute top-1 left-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${post.type === 'LOST' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
                                                }`}>
                                                {post.type}
                                            </span>
                                        </div>
                                    )}
                                    <h3 className="font-bold text-gray-900 dark:text-gray-100">{post.title}</h3>
                                    <p className="text-xs text-muted mb-2 truncate">{post.description}</p>
                                    <div className="flex gap-2">
                                        {!isOwner ? (
                                            <button
                                                onClick={() => onContact?.(post)}
                                                className="flex-1 px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1 hover:opacity-90 transition"
                                            >
                                                <MessageCircle className="w-3 h-3" /> Contact
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => onDelete?.(post.id)}
                                                className="flex-1 px-3 py-1.5 bg-red-500 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1 hover:bg-red-600 transition"
                                            >
                                                <Trash2 className="w-3 h-3" /> Delete
                                            </button>
                                        )}
                                        <button className="px-2 py-1.5 bg-red-100 dark:bg-red-900/40 text-red-600 rounded-lg" title="Report">
                                            <Flag className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>
        </div>
    );
}
