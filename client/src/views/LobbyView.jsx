import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import SpriteHero from '../components/SpriteHero';
import BackpackModal from '../components/BackpackModal';
import LobbyObject from '../components/LobbyObject';
import GuildHallSprite from '../components/GuildHallSprite';

const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5322');

const GUILD_ASSETS = '/assets/craftpix-net-189780-free-top-down-pixel-art-guild-hall-asset-pack/PNG';

// Constants for movement
const SPEED = 5;
const NPC_X = 400;
const NPC_Y = 200;
const INTERACT_RADIUS = 80;
const WALL_HEIGHT = 180;
const WALL_LIMIT = WALL_HEIGHT + 20;

const ENVIRONMENTAL_OBJECTS = [
    // Center rug
    { id: 'rug-center', type: 'rug', x: 400, y: 420 },
    // Quest boards on the wall
    { id: 'board-left', type: 'board', x: 280, y: WALL_HEIGHT },
    { id: 'board-right', type: 'board', x: 520, y: WALL_HEIGHT },
    // Bookshelves along the wall
    { id: 'shelf-left', type: 'bookshelf', x: 100, y: WALL_HEIGHT },
    { id: 'shelf-right', type: 'bookshelf', x: 700, y: WALL_HEIGHT },
    // Plant pots flanking the room
    { id: 'pot-left', type: 'pot', x: 50, y: WALL_HEIGHT },
    { id: 'pot-right', type: 'pot', x: 750, y: WALL_HEIGHT },
    // Barrels in corners
    { id: 'barrel-1', type: 'barrel', x: 80, y: 520 },
    { id: 'barrel-2', type: 'barrel', x: 120, y: 540 },
    // Tables and benches
    { id: 'table-1', type: 'table', x: 650, y: 460 },
    { id: 'bench-1', type: 'bench', x: 650, y: 510 },
    { id: 'table-2', type: 'table', x: 180, y: 350 },
    // Torches (animated fire)
    { id: 'torch-1', type: 'torch', x: 180, y: WALL_HEIGHT - 20 },
    { id: 'torch-2', type: 'torch', x: 620, y: WALL_HEIGHT - 20 },
    // Treasure display
    { id: 'treasure-corner', type: 'treasure', x: 750, y: 560 },
];

// Animated Guildmaster NPC component
const AnimatedGuildmaster = () => {
    const [frame, setFrame] = useState(0);
    const FRAME_W = 48; // 3 tiles wide
    const FRAME_H = 32; // 2 tiles tall
    const TOTAL_FRAMES = 6;

    useEffect(() => {
        const interval = setInterval(() => {
            setFrame(f => (f + 1) % TOTAL_FRAMES);
        }, 200);
        return () => clearInterval(interval);
    }, []);

    return (
        <GuildHallSprite
            sheet="Guildmaster.png"
            sx={frame * FRAME_W}
            sy={0}
            sw={FRAME_W}
            sh={FRAME_H}
            scale={3}
        />
    );
};

// Ambient NPC decorations (Readers, Talking People)
const AmbientNPC = ({ sheet, x, y, frameW = 48, frameH = 48, totalFrames = 12, scale = 2, label }) => {
    const [frame, setFrame] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setFrame(f => (f + 1) % totalFrames);
        }, 200);
        return () => clearInterval(interval);
    }, [totalFrames]);

    return (
        <div style={{
            position: 'absolute',
            left: x,
            top: y,
            transform: 'translate(-50%, -100%)',
            textAlign: 'center',
            zIndex: Math.floor(y),
            pointerEvents: 'none',
        }}>
            {label && (
                <div style={{
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    color: '#aaa',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '0.4rem',
                    marginBottom: '2px',
                    fontFamily: "'Press Start 2P', cursive",
                }}>
                    {label}
                </div>
            )}
            <GuildHallSprite
                sheet={sheet}
                sx={frame * frameW}
                sy={0}
                sw={frameW}
                sh={frameH}
                scale={scale}
            />
        </div>
    );
};

const LobbyView = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    // Player State
    const [players, setPlayers] = useState({});
    const [localPos, setLocalPos] = useState({ x: 400, y: 400 });
    const [isNearNPC, setIsNearNPC] = useState(false);
    const [showQuests, setShowQuests] = useState(false);
    const [showBackpack, setShowBackpack] = useState(false);

    const keys = useRef({ w: false, a: false, s: false, d: false });
    const posRef = useRef(localPos);

    useEffect(() => {
        if (!user) return;

        socket.emit('join_lobby', {
            id: user.id,
            username: user.username,
            appearance: user.appearance
        });

        socket.on('current_players', (currentPlayers) => {
            const others = { ...currentPlayers };
            if (others[socket.id]) {
                const startPos = { x: others[socket.id].x, y: others[socket.id].y };
                setLocalPos(startPos);
                posRef.current = startPos;
                delete others[socket.id];
            }
            setPlayers(others);
        });

        socket.on('player_joined', ({ socketId, player }) => {
            setPlayers(prev => ({ ...prev, [socketId]: player }));
        });

        socket.on('player_moved', ({ socketId, x, y }) => {
            setPlayers(prev => {
                if (!prev[socketId]) return prev;
                return { ...prev, [socketId]: { ...prev[socketId], x, y } };
            });
        });

        socket.on('player_left', (socketId) => {
            setPlayers(prev => {
                const newPlayers = { ...prev };
                delete newPlayers[socketId];
                return newPlayers;
            });
        });

        return () => {
            socket.emit('leave_lobby');
            socket.off('current_players');
            socket.off('player_joined');
            socket.off('player_moved');
            socket.off('player_left');
        };
    }, [user]);

    // Game Loop & Input Handling
    useEffect(() => {
        const handleKeyDown = (e) => {
            const key = e.key.toLowerCase();
            if (['w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright'].includes(key)) {
                if (key === 'arrowup') keys.current.w = true;
                else if (key === 'arrowleft') keys.current.a = true;
                else if (key === 'arrowdown') keys.current.s = true;
                else if (key === 'arrowright') keys.current.d = true;
                else keys.current[key] = true;
            }

            if (key === 'e' && isNearNPC) {
                setShowQuests(true);
            }
            if (key === 'b') {
                setShowBackpack(prev => !prev);
            }
        };

        const handleKeyUp = (e) => {
            const key = e.key.toLowerCase();
            if (['w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright'].includes(key)) {
                if (key === 'arrowup') keys.current.w = false;
                else if (key === 'arrowleft') keys.current.a = false;
                else if (key === 'arrowdown') keys.current.s = false;
                else if (key === 'arrowright') keys.current.d = false;
                else keys.current[key] = false;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        let animationFrameId;
        let lastEmitTime = 0;

        const loop = (time) => {
            let dx = 0;
            let dy = 0;
            if (keys.current.w) dy -= SPEED;
            if (keys.current.s) dy += SPEED;
            if (keys.current.a) dx -= SPEED;
            if (keys.current.d) dx += SPEED;

            if (dx !== 0 || dy !== 0) {
                const newX = Math.max(50, Math.min(window.innerWidth - 50, posRef.current.x + dx));
                const newY = Math.max(WALL_LIMIT, Math.min(window.innerHeight - 50, posRef.current.y + dy));

                posRef.current = { x: newX, y: newY };
                setLocalPos(posRef.current);

                const dist = Math.sqrt(Math.pow(newX - NPC_X, 2) + Math.pow(newY - NPC_Y, 2));
                setIsNearNPC(dist < INTERACT_RADIUS);

                if (time - lastEmitTime > 50) {
                    socket.emit('player_move', { x: newX, y: newY });
                    lastEmitTime = time;
                }
            }

            animationFrameId = requestAnimationFrame(loop);
        };

        animationFrameId = requestAnimationFrame(loop);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            cancelAnimationFrame(animationFrameId);
        };
    }, [isNearNPC]);

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            backgroundColor: '#3a2210',
            overflow: 'hidden',
            fontFamily: "'Press Start 2P', cursive"
        }}>
            {/* GUILD HALL STYLES */}
            <style>{`
                .guild-wall {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: ${WALL_HEIGHT}px;
                    background-image: url('${GUILD_ASSETS}/Walls_interior.png');
                    background-size: ${384 * 3}px ${128 * 3}px;
                    background-repeat: repeat-x;
                    background-position: 0 0;
                    image-rendering: pixelated;
                    border-bottom: 6px solid #1a0f07;
                    z-index: 10;
                }
                .guild-floor {
                    position: absolute;
                    top: ${WALL_HEIGHT}px;
                    left: 0;
                    width: 100%;
                    height: calc(100% - ${WALL_HEIGHT}px);
                    background-color: #6b4226;
                    background-image:
                        repeating-linear-gradient(
                            90deg,
                            transparent,
                            transparent 46px,
                            rgba(0,0,0,0.08) 46px,
                            rgba(0,0,0,0.08) 48px
                        ),
                        repeating-linear-gradient(
                            0deg,
                            transparent,
                            transparent 46px,
                            rgba(0,0,0,0.05) 46px,
                            rgba(0,0,0,0.05) 48px
                        ),
                        linear-gradient(180deg, rgba(0,0,0,0.15) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.1) 100%);
                    z-index: 0;
                }
                .guild-floor::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background:
                        radial-gradient(ellipse at 20% 30%, rgba(255,180,60,0.06) 0%, transparent 50%),
                        radial-gradient(ellipse at 80% 30%, rgba(255,180,60,0.06) 0%, transparent 50%);
                    pointer-events: none;
                }
                @keyframes bounce {
                    0%, 100% { transform: translate(-50%, -100%) translateY(0); }
                    50% { transform: translate(-50%, -100%) translateY(-10px); }
                }
                @keyframes npc-glow {
                    0%, 100% { filter: drop-shadow(0 0 6px rgba(255,200,50,0.3)); }
                    50% { filter: drop-shadow(0 0 12px rgba(255,200,50,0.6)); }
                }
            `}</style>

            <div className="guild-wall" />
            <div className="guild-floor" />

            {/* Top Navigation */}
            <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 1000 }}>
                <button className="nes-btn" onClick={() => navigate('/dashboard')}>
                    ← Exit Hall
                </button>
            </div>

            <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                <div className="nes-container is-rounded is-dark" style={{ padding: '0.5rem', backgroundColor: 'rgba(0,0,0,0.7)' }}>
                    <p style={{ margin: 0, color: '#fff', fontSize: '0.6rem' }}>W A S D - Move</p>
                    <p style={{ margin: 0, color: '#F7D51D', fontSize: '0.6rem' }}>E - Interact</p>
                    <p style={{ margin: 0, color: '#92cc41', fontSize: '0.6rem' }}>B - Backpack</p>
                </div>
                <button className="nes-btn is-warning" onClick={() => setShowBackpack(true)}>🎒 Items</button>
            </div>

            {/* Environmental Objects (real sprites) */}
            {ENVIRONMENTAL_OBJECTS.map(obj => (
                <LobbyObject key={obj.id} type={obj.type} x={obj.x} y={obj.y} size={obj.size} />
            ))}

            {/* Ambient NPCs (decorative) */}
            <AmbientNPC
                sheet="Reader1.png"
                x={160}
                y={380}
                frameW={48}
                frameH={48}
                totalFrames={12}
                scale={2}
                label="Scholar"
            />
            <AmbientNPC
                sheet="Talking_people.png"
                x={580}
                y={350}
                frameW={48}
                frameH={48}
                totalFrames={12}
                scale={2}
                label="Adventurers"
            />

            {/* Quest Master NPC (animated Guildmaster) */}
            <div style={{
                position: 'absolute',
                left: NPC_X,
                top: NPC_Y,
                transform: 'translate(-50%, -100%)',
                textAlign: 'center',
                zIndex: Math.floor(NPC_Y),
                animation: 'npc-glow 3s infinite ease-in-out',
            }}>
                <div style={{
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    color: '#F7D51D',
                    padding: '3px 10px',
                    borderRadius: '4px',
                    fontSize: '0.5rem',
                    marginBottom: '5px',
                    whiteSpace: 'nowrap',
                    border: '1px solid #F7D51D',
                }}>
                    ⚔ Quest Master
                </div>
                <AnimatedGuildmaster />
                {isNearNPC && !showQuests && (
                    <div style={{
                        position: 'absolute', top: '-40px', left: '50%',
                        backgroundColor: '#fff', padding: '5px 10px', border: '2px solid #000',
                        borderRadius: '5px', whiteSpace: 'nowrap', zIndex: 2000,
                        animation: 'bounce 1s infinite', fontSize: '0.6rem'
                    }} className="nes-text is-primary">
                        Press 'E'
                    </div>
                )}
            </div>

            {/* Other Players */}
            {Object.entries(players).map(([sid, p]) => (
                <div key={sid} style={{
                    position: 'absolute',
                    left: p.x,
                    top: p.y,
                    transform: 'translate(-50%, -100%)',
                    textAlign: 'center',
                    transition: 'left 0.1s linear, top 0.1s linear',
                    zIndex: Math.floor(p.y)
                }}>
                    <div style={{
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        color: 'white',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.5rem',
                        marginBottom: '2px'
                    }}>
                        {p.username}
                    </div>
                    <div style={{ width: '64px', height: '64px', margin: '0 auto' }}>
                        <SpriteHero
                            head={p.appearance?.head || 'knight_helm'}
                            body={p.appearance?.body || 'plate_armor'}
                            weapon={p.appearance?.weapon || 'broadsword'}
                        />
                    </div>
                </div>
            ))}

            {/* Local Player */}
            <div style={{
                position: 'absolute',
                left: localPos.x,
                top: localPos.y,
                transform: 'translate(-50%, -100%)',
                textAlign: 'center',
                zIndex: Math.floor(localPos.y) + 1
            }}>
                <div style={{
                    backgroundColor: 'rgba(247,213,29,0.8)',
                    color: 'black',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '0.5rem',
                    marginBottom: '2px',
                    fontWeight: 'bold'
                }}>
                    {user.username} (You)
                </div>
                <div style={{ width: '64px', height: '64px', margin: '0 auto' }}>
                    <SpriteHero
                        head={user.appearance?.head || 'knight_helm'}
                        body={user.appearance?.body || 'plate_armor'}
                        weapon={user.appearance?.weapon || 'broadsword'}
                    />
                </div>
            </div>

            {/* Quest Modal */}
            {showQuests && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex',
                    justifyContent: 'center', alignItems: 'center', zIndex: 3000
                }}>
                    <div className="nes-container is-rounded is-white" style={{ backgroundColor: 'white', maxWidth: '600px', width: '90%', textAlign: 'center' }}>
                        <h2 style={{ color: '#209cee', fontSize: '1rem' }}>Quest Master</h2>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                            <AnimatedGuildmaster />
                        </div>
                        <p className="nes-text" style={{ fontSize: '0.7rem' }}>"Ah, {user.username}! The realm needs your help. Check the Battle Board to see pending tasks."</p>

                        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem' }}>
                            <button className="nes-btn is-primary" style={{ fontSize: '0.7rem' }} onClick={() => navigate('/dashboard')}>Battle Board</button>
                            <button className="nes-btn is-error" style={{ fontSize: '0.7rem' }} onClick={() => setShowQuests(false)}>Farewell</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Backpack Modal */}
            {showBackpack && <BackpackModal onClose={() => setShowBackpack(false)} />}
        </div>
    );
};

export default LobbyView;