const { User, Task, Comment, sequelize } = require('./models');

async function testComments() {
    try {
        await sequelize.sync();

        // 1. Find a user and a task
        const user = await User.findOne();
        const task = await Task.findOne();

        if (!user || !task) {
            console.log('Need at least one user and one task to test.');
            return;
        }

        console.log(`Testing with User: ${user.username} and Task: ${task.title}`);

        // 2. Create a comment
        const comment = await Comment.create({
            content: 'Test comment from script',
            userId: user.id,
            taskId: task.id
        });
        console.log('Comment created:', comment.toJSON());

        // 3. Retrieve comments for task
        const comments = await Comment.findAll({
            where: { taskId: task.id },
            include: [{ model: User, attributes: ['username'] }]
        });
        console.log(`Found ${comments.length} comments for task.`);
        comments.forEach(c => console.log(`- ${c.User.username}: ${c.content}`));

        // 4. Verify Association
        const taskWithComments = await Task.findByPk(task.id, {
            include: [{ model: Comment, include: [User] }]
        });
        console.log('Task has comments:', taskWithComments.Comments.length);

        console.log('Test Complete!');
    } catch (err) {
        console.error('Test Failed:', err);
    } finally {
        // await sequelize.close(); // Don't close if running in persistent server env, but here fine
    }
}

testComments();
