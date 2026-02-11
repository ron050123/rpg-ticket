const API_URL = 'http://localhost:5000/api';

async function test() {
    try {
        console.log('--- Testing Side Quest Verification ---');

        // 1. Register Admin
        const gmReg = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'GM_' + Date.now(), password: 'password', class: 'Grandmaster', role: 'ADMIN' })
        });
        const gm = await gmReg.json();
        console.log('1. GM Created:', gm.user.username);

        // 2. Register User
        const userReg = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'Hero_' + Date.now(), password: 'password', class: 'Warrior' })
        });
        const user = await userReg.json();
        console.log('2. Hero Created:', user.user.username);

        // 3. Create Boss
        const bossRes = await fetch(`${API_URL}/bosses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${gm.token}` },
            body: JSON.stringify({ name: 'Project Omega', total_hp: 500, image_url: '' })
        });
        const boss = await bossRes.json();
        console.log('3. Boss Summoned:', boss.name);

        // 4. Create Main Quest
        const taskRes = await fetch(`${API_URL}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${gm.token}` },
            body: JSON.stringify({
                title: 'Main Quest',
                difficulty: 50,
                priority: 'MEDIUM',
                label: 'FEATURE',
                boss_id: boss.id,
                assigned_to: user.user.id
            })
        });
        const mainTask = await taskRes.json();
        console.log('4. Main Quest Created:', mainTask.title);

        // 5. Create Side Quest
        const subTaskRes = await fetch(`${API_URL}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${gm.token}` },
            body: JSON.stringify({
                title: 'Side Quest A',
                difficulty: 10,
                priority: 'LOW',
                label: 'BUG',
                parent_task_id: mainTask.id, // Nested
                assigned_to: user.user.id
            })
        });
        const subTask = await subTaskRes.json();
        console.log('5. Side Quest Created:', subTask.title, 'Parent:', subTask.parent_task_id);

        // 6. Complete Side Quest
        await fetch(`${API_URL}/tasks/${subTask.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.token}` },
            body: JSON.stringify({ status: 'DONE' })
        });
        console.log('6. Side Quest Completed');

        // 7. Verify Boss HP (500 - 10 = 490). Warrior Bonus only on HIGH priority, this is LOW.
        const bossCheck = await fetch(`${API_URL}/bosses/active`);
        const activeBoss = await bossCheck.json();
        console.log('7. Boss HP (Expected 490):', activeBoss.current_hp);

    } catch (e) {
        console.error('TEST FAILED:', e);
    }
}

setTimeout(test, 2000); // Wait for server start
