import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import SpriteReward from './SpriteReward';

const BackpackModal = ({ onClose }) => {
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchInventory = async () => {
            try {
                const data = await api.getInventory();
                setInventory(data || []);
            } catch (err) {
                console.error("Failed to load inventory:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchInventory();
    }, []);

    // Group items by name
    const groupedInventory = inventory.reduce((acc, current) => {
        if (!acc[current.item]) {
            acc[current.item] = { name: current.item, count: 0 };
        }
        acc[current.item].count += 1;
        return acc;
    }, {});

    const items = Object.values(groupedInventory);

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex',
            justifyContent: 'center', alignItems: 'center', zIndex: 3000
        }}>
            <div className="nes-container is-rounded is-white" style={{
                backgroundColor: '#212529', color: '#fff', width: '90%', maxWidth: '600px',
                border: '4px solid #F7D51D', maxHeight: '80vh', display: 'flex', flexDirection: 'column'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #555', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                    <h2 style={{ color: '#F7D51D', margin: 0 }}>🎒 Backpack</h2>
                    <button className="nes-btn is-error" onClick={onClose}>X</button>
                </div>

                <div style={{ overflowY: 'auto', flex: 1 }}>
                    {loading ? (
                        <p style={{ textAlign: 'center', color: '#aaa' }}>Loading inventory...</p>
                    ) : items.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem 0', color: '#aaa' }}>
                            <i className="nes-icon is-large star is-empty"></i>
                            <p style={{ marginTop: '1rem' }}>Your backpack is empty.</p>
                            <p style={{ fontSize: '0.8rem' }}>Complete quests and exchange XP for rewards!</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '1rem' }}>
                            {items.map((item, idx) => (
                                <div key={idx} className="nes-container is-rounded" style={{
                                    backgroundColor: '#2a2f35', padding: '0.5rem', textAlign: 'center',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative'
                                }}>
                                    <div style={{
                                        position: 'absolute', top: '-10px', right: '-10px',
                                        backgroundColor: '#e76e55', color: '#fff', borderRadius: '50%',
                                        width: '24px', height: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center',
                                        fontSize: '0.7rem', fontWeight: 'bold', border: '2px solid #212529'
                                    }}>
                                        x{item.count}
                                    </div>
                                    <div style={{ width: '64px', height: '64px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                        <SpriteReward name={item.name} size={64} />
                                    </div>
                                    <p style={{ fontSize: '0.7rem', marginTop: '0.5rem', marginBottom: 0, wordBreak: 'break-word' }}>{item.name}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BackpackModal;