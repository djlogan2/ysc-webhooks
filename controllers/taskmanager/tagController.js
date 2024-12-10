const tagService = require('../../services/taskmanager/tagService');

exports.getAllTags = async (req, res) => {
    try {
        const tags = await tagService.getAllTags();
        res.status(200).json(tags);
    } catch (error) {
        console.error('Error fetching tags:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.createTag = async (req, res) => {
    try {
        const { tag_name } = req.body;
        console.log('Received tag_name:', tag_name); // Debug log

        // Validate input
        if (!tag_name || typeof tag_name !== 'string') {
            return res.status(400).json({ error: 'Invalid or missing tag_name' });
        }

        const tag = await tagService.createTag(tag_name);
        res.status(201).json(tag);
    } catch (error) {
        console.error('Error creating tag:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.updateTag = async (req, res) => {
    try {
        const { id } = req.params;
        const { tag_name } = req.body;
        const updatedTag = await tagService.updateTag(id, tag_name);
        if (!updatedTag) {
            return res.status(404).json({ error: 'Tag not found' });
        }
        res.status(200).json(updatedTag);
    } catch (error) {
        console.error('Error updating tag:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.deleteTag = async (req, res) => {
    try {
        const { id } = req.params;
        const success = await tagService.deleteTag(id);
        if (!success) {
            return res.status(404).json({ error: 'Tag not found' });
        }
        res.status(200).json({ message: 'Tag deleted successfully' });
    } catch (error) {
        console.error('Error deleting tag:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.addTagToTask = async (req, res) => {
    try {
        const { taskId } = req.params;
        const { tag_id } = req.body;
        const success = await tagService.addTagToTask(taskId, tag_id);
        if (!success) {
            return res.status(400).json({ error: 'Failed to associate tag with task' });
        }
        res.status(200).json({ message: 'Tag added to task successfully' });
    } catch (error) {
        console.error('Error associating tag with task:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.removeTagFromTask = async (req, res) => {
    try {
        const { taskId, tagId } = req.params;
        const success = await tagService.removeTagFromTask(taskId, tagId);
        if (!success) {
            return res.status(404).json({ error: 'Task-tag association not found' });
        }
        res.status(200).json({ message: 'Tag removed from task successfully' });
    } catch (error) {
        console.error('Error removing tag from task:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
