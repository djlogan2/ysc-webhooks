const asanaService = require('../services/asanaService');

exports.createTeam = async (req, res) => {
    try {
        const team = await asanaService.createTeam(req.body);
        res.status(201).json(team);
    } catch (error) {
        res.status(500).json({ message: 'Error creating team' });
    }
};

exports.createProject = async (req, res) => {
    try {
        const project = await asanaService.createProject(req.body);
        res.status(201).json(project);
    } catch (error) {
        res.status(500).json({ message: 'Error creating project' });
    }
};

// Implement other controller methods (createTask, updateProject, updateTask, etc.)
// following a similar pattern

exports.listTasks = async (req, res) => {
    try {
        const tasks = await asanaService.listTasks();
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ message: 'Error listing tasks' });
    }
};

exports.createTask = async (req, res) => {}
exports.updateProject = async (req, res) => {}
exports.updateTask = async(req, res) => {}
exports.completeTask = async(req, res) => {}
exports.archiveProject = async(req, res) => {}
exports.deleteTask = async(req, res) => {}
exports.listTeams = async(req, res) => {}
exports.listProjects = async(req, res) => {}
exports.listTasks = async(req, res) => {}
