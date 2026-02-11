// using native fetch

const API_URL = 'http://localhost:5322/api';
const LOGIN_URL = `${API_URL}/auth/login`;

async function testApi() {
    try {
        // 1. Register a temp user to get token
        const username = `TestUser_${Date.now()}`;
        console.log(`Registering ${username}...`);
        const loginRes = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password: 'password123', class: 'Warrior' })
        });

        if (!loginRes.ok) {
            console.error('Login failed:', await loginRes.text());
            return;
        }

        const loginData = await loginRes.json();
        const token = loginData.token;
        console.log('Got token');

        // 2. Get Tasks to find a task ID
        const tasksRes = await fetch(`${API_URL}/tasks`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const tasks = await tasksRes.json();

        // Force ID 1 since new user has no tasks
        const taskId = 1;
        console.log(`Testing comments on Task ID: ${taskId}`);

        // 3. Post a comment
        const commentRes = await fetch(`${API_URL}/comments/${taskId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ content: 'API Test Comment' })
        });

        if (!commentRes.ok) {
            const errText = await commentRes.text();
            console.error('Create Comment Failed:', commentRes.status, errText);
            // If it's HTML, it will be obvious here
            return;
        }

        const commentData = await commentRes.json();
        console.log('Comment Created:', commentData);

        // 4. Get comments
        const getRes = await fetch(`${API_URL}/comments/${taskId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const comments = await getRes.json();
        console.log(`Retrieved ${comments.length} comments.`);

        console.log('API Test Passed!');

    } catch (err) {
        console.error('Test Error:', err);
    }
}

testApi();
