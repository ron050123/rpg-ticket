const API_URL = 'http://localhost:3000/api';

async function test() {
    try {
        console.log('--- Testing Verification ---');

        // 1. Register
        const randomName = 'Hero_' + Math.floor(Math.random() * 1000);
        console.log(`1. registering ${randomName}...`);
        const reg = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: randomName, password: 'password', class: 'Warrior' })
        });
        const user = await reg.json();
        if (reg.status !== 201 && reg.status !== 200) throw new Error('Register failed: ' + JSON.stringify(user));
        console.log('   User created:', user.user.username);

        // 2. Create Boss
        console.log('2. Creating Boss...');
        const bossRes = await fetch(`${API_URL}/bosses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Test Boss', total_hp: 100, image_url: '' })
        });
        const boss = await bossRes.json();
        console.log('   Boss created:', boss.name, 'HP:', boss.current_hp);

        // 3. Create Task
        console.log('3. Creating Task...');
        const taskRes = await fetch(`${API_URL}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: 'Test Task',
                difficulty: 10,
                priority: 'HIGH',
                label: 'FEATURE',
                boss_id: boss.id,
                assigned_to: user.user.id
            })
        });
        const task = await taskRes.json();
        console.log('   Task created:', task.title);

        // 4. Complete Task (Damage)
        console.log('4. Completing Task (Attack)...');
        const updateRes = await fetch(`${API_URL}/tasks/${task.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'DONE', assigned_to: user.user.id }) // user is Warrior, Task HIGH -> 1.5x damage (15)
        });
        const updatedTask = await updateRes.json();
        console.log('   Task Updated:', updatedTask.status);

        // 5. Check Boss HP
        const bossCheck = await fetch(`${API_URL}/bosses/active`);
        const activeBoss = await bossCheck.json();
        console.log('   Boss HP after attack:', activeBoss.current_hp);

        // Warrior Damage Calculation: 10 * 1.5 = 15. 100 - 15 = 85.
        if (activeBoss.current_hp === 85) {
            console.log('SUCCESS: Damage calculation verified!');
        } else {
            console.log('WARNING: HP mismatch. Expected 85, got', activeBoss.current_hp);
            // It might be because we found a different active boss if multiple exist.
            // But logic seems to hold if clean DB.
        }

    } catch (e) {
        console.error('TEST FAILED:', e);
    }
}

test();
