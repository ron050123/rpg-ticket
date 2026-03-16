import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';
import CustomHero from '../components/CustomHero';
import AvatarCreator from '../components/AvatarCreator';
import './LoginView.css';

const LoginView = () => {
    const [isRegister, setIsRegister] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);
    const [appearance, setAppearance] = useState({
        head: 'knight_helm',
        body: 'plate_armor',
        weapon: 'broadsword'
    });
    const [error, setError] = useState('');

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            let data;
            if (isRegister) {
                const role = isAdmin ? 'ADMIN' : 'USER';
                // If admin, maybe force a specific look or let them keep it. We'll let them keep it but add a crown if we want.
                const finalApp = isAdmin ? { ...appearance, head: 'kings_crown' } : appearance;
                data = await api.register({ username, password, appearance: finalApp, role });
            } else {
                data = await api.login({ username, password });
            }
            login(data.user, data.token);
            navigate('/dashboard');
        } catch (err) {
            setError(err.message || 'An error occurred');
        }
    };

    return (
        <div className="login-page">
            <div className="login-bg">
                <div className="pixel-cloud cloud-1"></div>
                <div className="pixel-cloud cloud-2"></div>
                <div className="pixel-cloud cloud-3"></div>
                <div className="pixel-cloud cloud-4"></div>
            </div>

            <div className="intro-overlay">
                <div className="intro-content">
                    <h1 className="intro-title">TASK MASTER</h1>
                    <p style={{ marginTop: '1rem', fontSize: '1.2rem', animation: 'titleFloat 2s infinite' }}>Loading...</p>
                </div>
            </div>

            <div className="login-center">
                <h1 className="main-title">Task Master</h1>

                <div className="login-box" style={{ maxWidth: isRegister ? '900px' : '400px' }}>
                    <div className="login-box-title">
                        {isRegister ? '⚔️ Create Your Hero' : '🏰 Continue Quest'}
                    </div>

                    {error && <div className="login-error">{error}</div>}

                    <div className={`login-body ${isRegister ? 'expanded' : ''}`} style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                        <form onSubmit={handleSubmit} className="login-fields" style={{ flex: '1', minWidth: '300px' }}>
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

                            {isRegister && (
                                <div style={{ marginTop: '1rem' }}>
                                    <label>
                                        <input 
                                            type="checkbox" 
                                            className="nes-checkbox" 
                                            checked={isAdmin} 
                                            onChange={e => setIsAdmin(e.target.checked)} 
                                        />
                                        <span>Register as Admin (Grandmaster)</span>
                                    </label>
                                </div>
                            )}

                            <button type="submit" className={`nes-btn ${isRegister ? 'is-primary' : 'is-success'}`} style={{ width: '100%', marginTop: '1rem' }}>
                                {isRegister ? '⚔️ Start Adventure' : '🏰 Login'}
                            </button>
                        </form>

                        {isRegister && (
                            <div style={{ flex: '1', minWidth: '350px' }}>
                                <AvatarCreator appearance={appearance} onChange={setAppearance} />
                            </div>
                        )}
                    </div>

                    <div className="login-footer">
                        <button type="button" className="nes-btn" onClick={() => { setIsRegister(!isRegister); setIsAdmin(false); }} style={{ fontSize: '0.75rem' }}>
                            {isRegister ? 'Already have a hero? Login' : 'New here? Create a hero'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginView;
