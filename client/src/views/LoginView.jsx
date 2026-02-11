import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';
import './LoginView.css';

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

    return (
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', position: 'relative' }}>
            {/* Background & Intro */}
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

            <h1 className="main-title" style={{ position: 'relative', zIndex: 2 }}>Task Master</h1>

            <div className="nes-container with-title is-centered" style={{ width: '400px', backgroundColor: '#fff', position: 'relative', zIndex: 2 }}>
                <p className="title">{isRegister ? 'New Game' : 'Continue'}</p>

                {error && <span className="nes-text is-error">{error}</span>}

                <form onSubmit={handleSubmit}>
                    <div className="nes-field">
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

                    <div className="nes-field">
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
                        <>
                            <div style={{ margin: '1rem 0' }}>
                                <label>
                                    <input type="checkbox" className="nes-checkbox" checked={isGrandmaster} onChange={e => setIsGrandmaster(e.target.checked)} />
                                    <span>I am the Grandmaster (Admin)</span>
                                </label>
                            </div>

                            {!isGrandmaster && (
                                <div className="nes-field">
                                    <label htmlFor="class">Select Class</label>
                                    <div className="nes-select">
                                        <select required id="class" value={userClass} onChange={e => setUserClass(e.target.value)}>
                                            <option value="Warrior">Warrior (High Priority Bonus)</option>
                                            <option value="Mage">Mage (Freeze Deadlines)</option>
                                            <option value="Rogue">Rogue (Bug Smash Bonus)</option>
                                            <option value="Cleric">Cleric (XP Bonus)</option>
                                        </select>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    <div style={{ marginTop: '20px' }}>
                        <button type="submit" className={`nes-btn ${isRegister ? 'is-primary' : 'is-success'}`}>
                            {isRegister ? 'Start Adventure' : 'Login'}
                        </button>
                    </div>
                </form>

                <div style={{ marginTop: '20px' }}>
                    <button type="button" className="nes-btn" onClick={() => setIsRegister(!isRegister)}>
                        {isRegister ? 'Have an account? Login' : 'Create Hero'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LoginView;
