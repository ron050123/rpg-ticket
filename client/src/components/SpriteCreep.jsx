import React from 'react';

const SpriteCreep = ({ type = 'slime', status = 'TODO', size = 64 }) => {
    const isDefeated = status === 'DONE';
    
    const getEmoji = () => {
        switch (type) {
            case 'slime': return '🟢';
            case 'skeleton': return '💀';
            case 'orc': return '👹';
            case 'ghost': return '👻';
            case 'goblin': return '👺';
            default: return '👾';
        }
    };

    const getFilter = () => {
        if (isDefeated) return 'grayscale(1) opacity(0.5)';
        switch (type) {
            case 'slime': return 'drop-shadow(0 0 5px #0f0)';
            case 'skeleton': return 'drop-shadow(0 0 5px #fff)';
            case 'orc': return 'drop-shadow(0 0 5px #f00)';
            case 'ghost': return 'drop-shadow(0 0 8px #6af)';
            default: return 'none';
        }
    };

    return (
        <div style={{
            width: `${size}px`,
            height: `${size}px`,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            fontSize: `${size * 0.7}px`,
            filter: getFilter(),
            transition: 'all 0.5s ease',
            animation: isDefeated ? 'creep-death 1s forwards' : 'creep-float 3s infinite ease-in-out',
            position: 'relative',
            userSelect: 'none'
        }}>
            {getEmoji()}
            
            <style>{`
                @keyframes creep-float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                @keyframes creep-death {
                    0% { transform: scale(1) rotate(0); opacity: 1; }
                    50% { transform: scale(1.2) rotate(20deg); opacity: 0.8; }
                    100% { transform: scale(0) rotate(-45deg); opacity: 0; }
                }
            `}</style>
        </div>
    );
};

export default SpriteCreep;