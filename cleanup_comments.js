const { Comment } = require('./server/models');

async function cleanupComments() {
    try {
        const result = await Comment.destroy({
            where: {
                content: 'Test comment from script'
            }
        });
        console.log(`Deleted ${result} test comments.`);
    } catch (error) {
        console.error('Cleanup failed:', error);
    }
}

cleanupComments();
