import * as projectService from '../../services/taskmanager/projectService.js';

// Create a project
export const createProject = async (req, res) => {
    try {
        const project = await projectService.createProject(req.body);
        res.status(201).json(project);
    } catch (error) {
        console.error('Error creating project:', error);
        res.status(500).json({ error: 'Failed to create project' });
    }
};

// Get all projects
export const getAllProjects = async (req, res) => {
    try {
        const projects = await projectService.getAllProjects();
        res.status(200).json(projects);
    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
};

// Get a project by ID
export const getProjectById = async (req, res) => {
    try {
        const project = await projectService.getProjectById(req.params.id);
        if (!project) return res.status(404).json({ error: 'Project not found' });
        res.status(200).json(project);
    } catch (error) {
        console.error('Error fetching project:', error);
        res.status(500).json({ error: 'Failed to fetch project' });
    }
};

// Update a project
export const updateProject = async (req, res) => {
    try {
        const updatedProject = await projectService.updateProject(req.params.id, req.body);
        res.status(200).json(updatedProject);
    } catch (error) {
        console.error('Error updating project:', error);
        res.status(500).json({ error: 'Failed to update project' });
    }
};

// Delete a project
export const deleteProject = async (req, res) => {
    try {
        await projectService.deleteProject(req.params.id);
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting project:', error);
        res.status(500).json({ error: 'Failed to delete project' });
    }
};
