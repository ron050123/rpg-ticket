const API_URL = 'http://localhost:5000/api';

async function test() {
    try {
        console.log('--- Testing Grandmaster Verification ---');

        // 1. Register Admin
        console.log('1. Registering Grandmaster...');
        const gmReg = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'GM_' + Date.now(), password: 'password', class: 'Grandmaster', role: 'ADMIN' })
        });
        const gm = await gmReg.json();
        if (!gm.token) console.error('GM Register Failed', gm);
        else console.log('   GM Created:', gm.user.username);

        // 2. Register User (Warrior)
        console.log('2. Registering Warrior...');
        const userReg = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'Hero_' + Date.now(), password: 'password', class: 'Warrior' })
        });
        const user = await userReg.json();
        console.log('   Warrior Created:', user.user.username);

        // 3. User tries to Create Boss (Should Fail)
        console.log('3. User tries to summon Boss (Expect Fail)...');
        const failBoss = await fetch(`${API_URL}/bosses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.token}` },
            body: JSON.stringify({ name: 'Illegal Boss', total_hp: 100 })
        });
        if (failBoss.status === 403) console.log('   SUCCESS: User blocked from summoning Boss.');
        else console.warn('   FAIL: User was able to summon boss or other error', failBoss.status);

        // 4. GM Creates Boss
        console.log('4. GM Summons Boss...');
        const bossRes = await fetch(`${API_URL}/bosses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${gm.token}` },
            body: JSON.stringify({ name: 'Project Alpha', total_hp: 200, image_url: '' })
        });
        const boss = await bossRes.json();
        console.log('   Boss Summoned:', boss.name);

        // 5. GM Creates Quest and Assigns to User
        console.log('5. GM Assigns Quest...');
        const taskRes = await fetch(`${API_URL}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${gm.token}` },
            body: JSON.stringify({
                title: 'Critical Bug Fix',
                difficulty: 20,
                priority: 'HIGH',
                label: 'BUG',
                boss_id: boss.id,
                assigned_to: user.user.id
            })
        });
        const task = await taskRes.json();
        console.log('   Quest Created & Assigned:', task.title, 'to', task.User.username);

        // 6. User Completes Quest
        console.log('6. User Completes Quest...');
        const updateRes = await fetch(`${API_URL}/tasks/${task.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.token}` },
            body: JSON.stringify({ status: 'DONE' })
        });
        const updatedTask = await updateRes.json();
        console.log('   Quest Status:', updatedTask.status);

        // 7. Verify Boss HP
        const bossCheck = await fetch(`${API_URL}/bosses/active`);
        const activeBoss = await bossCheck.json();
        // Warrior (High Priority 1.5x) -> 20 * 1.5 = 30 dmg. 200 - 30 = 170.
        console.log('   Boss HP (Expected 170):', activeBoss.current_hp);

    } catch (e) {
        console.error('TEST FAILED:', e);
    }
}

test();
