import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { roomService } from '../services/roomService';
import './Explore.css'; // Reusing styles for now

export const RoomDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [room, setRoom] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchRoom = async () => {
            try {
                const data = await roomService.getRoom(id);
                setRoom(data);
            } catch (err) {
                console.error('Error fetching room:', err);
                setError('Room not found or connection error.');
            } finally {
                setLoading(false);
            }
        };
        fetchRoom();
    }, [id]);

    if (loading) return <div className="container" style={{ padding: '100px', textAlign: 'center' }}>Loading room details...</div>;
    if (error) return <div className="container" style={{ padding: '100px', textAlign: 'center' }}><div className="alert alert-error">{error}</div><button className="btn btn-secondary" onClick={() => navigate('/explore')}>Back to Explore</button></div>;
    if (!room) return null;

    return (
        <div className="room-details-page container" style={{ padding: '40px 20px' }}>
            <button className="btn btn-secondary" style={{ marginBottom: '20px' }} onClick={() => navigate(-1)}>← Back</button>
            <div className="card" style={{ overflow: 'hidden' }}>
                <div className="room-images-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px', maxHeight: '400px', background: '#eee' }}>
                    {room.images && room.images.length > 0 ? (
                        <img src={room.images[0]} alt={room.title} style={{ width: '100%', height: '400px', objectFit: 'cover' }} />
                    ) : (
                        <div style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#333', color: '#666' }}>No Images Available</div>
                    )}
                </div>
                <div style={{ padding: '30px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                        <div>
                            <h1 style={{ margin: '0 0 10px 0' }}>{room.title}</h1>
                            <p style={{ fontSize: '1.2rem', color: '#aaa' }}>📍 {room.location}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>₹{room.price.toLocaleString()}</div>
                            <div style={{ color: '#888' }}>/ month</div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
                        <span className="badge badge-primary">{room.property_type}</span>
                        <span className="badge">{room.tenant_preference}</span>
                    </div>

                    <div style={{ marginBottom: '30px' }}>
                        <h3>Description</h3>
                        <p style={{ lineHeight: '1.6', color: '#ccc' }}>{room.description}</p>
                    </div>

                    <div className="owner-info" style={{ padding: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                        <h3>Contact Information</h3>
                        <p><strong>Phone:</strong> {room.contact_number}</p>
                        {room.profiles && (
                            <p><strong>Posted by:</strong> {room.profiles.full_name}</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
