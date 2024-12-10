const priorityService = require('../../services/taskmanager/priorityService');

exports.getAllPriorities = async (req, res) => {
    try {
        const priorities = await priorityService.getAllPriorities();
        res.status(200).json(priorities);
    } catch (error) {
        console.error('Error fetching priorities:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.createPriority = async (req, res) => {
    try {
        const { priority_name } = req.body;

        // Validate input
        if (!priority_name || typeof priority_name !== 'string') {
            return res.status(400).json({ error: 'Invalid or missing priority_name' });
        }

        const priority = await priorityService.createPriority(priority_name);
        res.status(201).json(priority);
    } catch (error) {
        console.error('Error creating priority:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.updatePriority = async (req, res) => {
    try {
        const { id } = req.params;
        const { priority_name } = req.body;
        const updatedPriority = await priorityService.updatePriority(id, priority_name);
        if (!updatedPriority) {
            return res.status(404).json({ error: 'Priority not found' });
        }
        res.status(200).json(updatedPriority);
    } catch (error) {
        console.error('Error updating priority:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.deletePriority = async (req, res) => {
    try {
        const { id } = req.params;
        const success = await priorityService.deletePriority(id);
        if (!success) {
            return res.status(404).json({ error: 'Priority not found' });
        }
        res.status(200).json({ message: 'Priority deleted successfully' });
    } catch (error) {
        console.error('Error deleting priority:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
