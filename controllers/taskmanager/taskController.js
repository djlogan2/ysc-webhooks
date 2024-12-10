const taskService = require('../../services/taskmanager/taskService');

exports.getAllTasks = async (req, res) => {
    try {
        const tasks = await taskService.getAllTasks(req.query);
        res.status(200).json(tasks);
    } catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.getTaskById = async (req, res) => {
    try {
        const task = await taskService.getTaskById(req.params.id);
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }
        res.status(200).json(task);
    } catch (error) {
        console.error('Error fetching task:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.createTask = async (req, res) => {
    try {
        const task = await taskService.createTask(req.body);
        res.status(201).json(task);
    } catch (error) {
        console.error('Error creating task:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.updateTask = async (req, res) => {
    try {
        const task = await taskService.updateTask(req.params.id, req.body);
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }
        res.status(200).json(task);
    } catch (error) {
        console.error('Error updating task:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.archiveTask = async (req, res) => {
    try {
        const success = await taskService.archiveTask(req.params.id);
        if (!success) {
            return res.status(404).json({ error: 'Task not found or already archived' });
        }
        res.status(200).json({ message: 'Task archived successfully' });
    } catch (error) {
        console.error('Error archiving task:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.completeTask = async (req, res) => {
    try {
        const task = await taskService.completeTask(req.params.id);
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }
        res.status(200).json({ message: 'Task completed and next recurring task created if applicable.' });
    } catch (error) {
        console.error('Error completing task:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
