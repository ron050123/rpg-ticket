import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';
import SpriteHero from '../components/SpriteHero';
import './LoginView.css';

const HERO_CLASSES = [
    { name: 'Warrior', perk: '1.5× DMG on HIGH priority', color: '#e74c3c', glow: 'rgba(231, 76, 60, 0.5)', emoji: '⚔️' },
    { name: 'Mage', perk: 'Arcane mastery', color: '#9b59b6', glow: 'rgba(155, 89, 182, 0.5)', emoji: '🔮' },
    { name: 'Rogue', perk: '2× DMG on BUG fixes', color: '#27ae60', glow: 'rgba(39, 174, 96, 0.5)', emoji: '🗡️' },
    { name: 'Cleric', perk: '1.2× XP on all quests', color: '#f1c40f', glow: 'rgba(241, 196, 15, 0.5)', emoji: '✨' }
];

const GRANDMASTER = { name: 'Grandmaster', perk: 'Manage all quests & heroes', color: '#FFD700', glow: 'rgba(255, 215, 0, 0.6)', emoji: '👑' };

const LoginView = () => {
    const [isRegister, setIsRegister] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [userClass, setUserClass] = useState('Warrior');
    const [isGrandmaster, setIsGrandmaster] = useState(false);
    const [error, setError] = useState('');

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            let data;
            if (isRegister) {
                const role = isGrandmaster ? 'ADMIN' : 'USER';
                const finalClass = isGrandmaster ? 'Grandmaster' : userClass;
                data = await api.register({ username, password, class: finalClass, role });
            } else {
                data = await api.login({ username, password });
            }
            login(data.user, data.token);
            navigate('/dashboard');
        } catch (err) {
            setError(err.message || 'An error occurred');
        }
    };

    const selectedHero = isGrandmaster ? GRANDMASTER : HERO_CLASSES.find(h => h.name === userClass) || HERO_CLASSES[0];

    return (
        <div className="login-page">
            {/* Background */}
            <div className="login-bg">
                <div className="pixel-cloud cloud-1"></div>
                <div className="pixel-cloud cloud-2"></div>
                <div className="pixel-cloud cloud-3"></div>
                <div className="pixel-cloud cloud-4"></div>
            </div>

            {/* Intro overlay */}
            <div className="intro-overlay">
                <div className="intro-content">
                    <h1 className="intro-title">TASK MASTER</h1>
                    <p style={{ marginTop: '1rem', fontSize: '1.2rem', animation: 'titleFloat 2s infinite' }}>Loading...</p>
                </div>
            </div>

            {/* Main content */}
            <div className="login-center">
                <h1 className="main-title">Task Master</h1>

                <div className="login-box">
                    {/* Title bar */}
                    <div className="login-box-title">
                        {isRegister ? '⚔️ Create Your Hero' : '🏰 Continue Quest'}
                    </div>

                    {error && <div className="login-error">{error}</div>}

                    <div className={`login-body ${isRegister ? 'expanded' : ''}`}>
                        {/* Left side: Form fields */}
                        <form onSubmit={handleSubmit} className="login-fields">
                            <div className="field-group">
                                <label htmlFor="username">Username</label>
                                <input
                                    type="text"
                                    id="username"
                                    className="nes-input"
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="field-group">
                                <label htmlFor="password">Password</label>
                                <input
                                    type="password"
                                    id="password"
                                    className="nes-input"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                />
                            </div>

                            {/* Selected hero preview */}
                            {isRegister && (
                                <div className="selected-hero-preview" style={{
                                    borderColor: selectedHero.color,
                                    boxShadow: `0 0 20px ${selectedHero.glow}`
                                }}>
                                    <SpriteHero heroClass={selectedHero.name} active={true} size={80} />
                                    <div className="preview-name" style={{ color: selectedHero.color }}>
                                        {selectedHero.emoji} {selectedHero.name}
                                    </div>
                                    <div className="preview-perk">{selectedHero.perk}</div>
                                </div>
                            )}

                            <button type="submit" className={`nes-btn ${isRegister ? 'is-primary' : 'is-success'}`} style={{ width: '100%', marginTop: '1rem' }}>
                                {isRegister ? '⚔️ Start Adventure' : '🏰 Login'}
                            </button>
                        </form>

                        {/* Right side: Class selection (only when registering) */}
                        {isRegister && (
                            <div className="class-panel">
                                <label className="class-panel-title">Choose Your Class</label>

                                <div className="hero-grid">
                                    {HERO_CLASSES.map(hero => {
                                        const isSelected = userClass === hero.name && !isGrandmaster;
                                        return (
                                            <div
                                                key={hero.name}
                                                className={`hero-card ${isSelected ? 'selected' : ''}`}
                                                onClick={() => { setUserClass(hero.name); setIsGrandmaster(false); }}
                                                style={{ '--hero-color': hero.color, '--hero-glow': hero.glow }}
                                            >
                                                <div className="hero-card-sprite">
                                                    <SpriteHero heroClass={hero.name} active={isSelected} size={56} />
                                                </div>
                                                <div className="hero-card-name">{hero.emoji} {hero.name}</div>
                                                <div className="hero-card-perk">{hero.perk}</div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div
                                    className={`hero-card grandmaster-card ${isGrandmaster ? 'selected' : ''}`}
                                    onClick={() => setIsGrandmaster(!isGrandmaster)}
                                    style={{ '--hero-color': GRANDMASTER.color, '--hero-glow': GRANDMASTER.glow, marginTop: '0.75rem' }}
                                >
                                    <div className="hero-card-sprite-sm">
                                        <SpriteHero heroClass="Grandmaster" active={isGrandmaster} size={44} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div className="hero-card-name">{GRANDMASTER.emoji} {GRANDMASTER.name}</div>
                                        <div className="hero-card-perk">{GRANDMASTER.perk}</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Toggle button — OUTSIDE the form to avoid validation */}
                    <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                        <button type="button" className="nes-btn" onClick={() => { setIsRegister(!isRegister); setIsGrandmaster(false); }} style={{ fontSize: '0.75rem' }}>
                            {isRegister ? 'Have an account? Login' : 'Create Hero'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginView;
