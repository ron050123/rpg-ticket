const { User, sequelize } = require('./models');
const bcrypt = require('bcryptjs');

async function createDirect() {
    try {
        await sequelize.authenticate();
        const hashedPassword = await bcrypt.hash('123456', 10);
        const user = await User.create({
            username: 'ligktit',
            password: hashedPassword,
            role: 'USER',
            class: 'Warrior',
            appearance: {
                head: 'knight_helm',
                body: 'plate_armor',
                weapon: 'broadsword'
            }
        });
        console.log('User ligktit created successfully.');
    } catch (err) {
        console.error('Sequelize creation failed:', err.message);
        if (err.errors) {
            err.errors.forEach(e => {
                console.error(`Field: ${e.path}, Message: ${e.message}, Type: ${e.type}, Value: ${e.value}`);
            });
        } else {
            console.error(JSON.stringify(err, null, 2));
        }
    } finally {
        await sequelize.close();
    }
}

createDirect();