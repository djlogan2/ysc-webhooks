const pool = require('../db');

// Create a project
exports.createProject = async (projectData) => {
    const [result] = await pool.query(
        `INSERT INTO dj.taskmanager_projects 
         (project_name, description, client_id, status, start_date, due_date) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
            projectData.project_name,
            projectData.description,
            projectData.client_id || null,
            projectData.status || 'Active',
            projectData.start_date || null,
            projectData.due_date || null,
        ]
    );
    return { project_id: result.insertId, ...projectData };
};

// Get all projects
exports.getAllProjects = async () => {
    const [rows] = await pool.query(`SELECT * FROM dj.taskmanager_projects`);
    return rows;
};

// Get a single project by ID
exports.getProjectById = async (projectId) => {
    const [rows] = await pool.query(
        `SELECT * FROM dj.taskmanager_projects WHERE project_id = ?`,
        [projectId]
    );
    return rows[0];
};

// Update a project
exports.updateProject = async (projectId, projectData) => {
    await pool.query(
        `UPDATE dj.taskmanager_projects 
         SET project_name = ?, description = ?, client_id = ?, status = ?, start_date = ?, due_date = ?, updated_at = NOW()
         WHERE project_id = ?`,
        [
            projectData.project_name,
            projectData.description,
            projectData.client_id || null,
            projectData.status || 'Active',
            projectData.start_date || null,
            projectData.due_date || null,
            projectId,
        ]
    );
    return { project_id: projectId, ...projectData };
};

// Delete a project
exports.deleteProject = async (projectId) => {
    await pool.query(`DELETE FROM dj.taskmanager_projects WHERE project_id = ?`, [projectId]);
};
