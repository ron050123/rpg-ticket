import React from 'react';
import CustomHero from './CustomHero';
import { HEAD_IMGS, BODY_IMGS, WEAPON_IMGS } from './CharacterParts';

const AvatarCreator = ({ appearance, onChange }) => {
    const heads = Object.keys(HEAD_IMGS);
    const bodies = Object.keys(BODY_IMGS);
    const weapons = Object.keys(WEAPON_IMGS);

    const handleCycle = (part, list, direction) => {
        const currentIdx = list.indexOf(appearance[part] || list[0]);
        let newIdx = currentIdx + direction;
        if (newIdx < 0) newIdx = list.length - 1;
        if (newIdx >= list.length) newIdx = 0;
        
        onChange({ ...appearance, [part]: list[newIdx] });
    };

    const renderSelector = (label, part, list) => (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.7rem', width: '80px', color: '#fff' }}>{label}</span>
            <button type="button" className="nes-btn is-small" onClick={() => handleCycle(part, list, -1)}>&lt;</button>
            <span style={{ fontSize: '0.7rem', width: '120px', textAlign: 'center', color: '#F7D51D' }}>{appearance[part]?.replace('_', ' ') || list[0]}</span>
            <button type="button" className="nes-btn is-small" onClick={() => handleCycle(part, list, 1)}>&gt;</button>
        </div>
    );

    return (
        <div className="avatar-creator nes-container is-rounded is-dark" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <p className="title" style={{ fontSize: '0.8rem', marginTop: '-2rem' }}>Design Avatar</p>
            
            <div style={{ padding: '1rem', backgroundColor: '#333', borderRadius: '8px', border: '4px solid #000' }}>
                <CustomHero appearance={appearance} active={true} size={150} />
            </div>

            <div style={{ width: '100%', maxWidth: '350px' }}>
                {renderSelector('Head', 'head', heads)}
                {renderSelector('Body', 'body', bodies)}
                {renderSelector('Weapon', 'weapon', weapons)}
            </div>
        </div>
    );
};

export default AvatarCreator;
