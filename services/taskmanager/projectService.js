import { parseISO, isBefore } from 'date-fns';
import pool from '../db.js';

// Create a project
export const createProject = async (projectData) => {
    // Validate that start_date is less than due_date if both exist
    if (projectData.start_date && projectData.due_date) {
        const startDate = parseISO(projectData.start_date);
        const dueDate = parseISO(projectData.due_date);

        if (!isBefore(startDate, dueDate)) {
            throw new Error('Start date cannot be after due date');
        }
    }

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
export const getAllProjects = async () => {
    const [rows] = await pool.query(`SELECT * FROM dj.taskmanager_projects`);
    return rows;
};

// Get a single project by ID
export const getProjectById = async (projectId) => {
    const [rows] = await pool.query(
        `SELECT * FROM dj.taskmanager_projects WHERE project_id = ?`,
        [projectId]
    );
    return rows[0];
};

// Update a project
export const updateProject = async (projectData) => {
    const fields = [];
    const values = [];
    let projectId;

    // Dynamically build query parts for fields that are being updated
    if(!projectData.project_id) {
        throw Error('Project id not found');
    }

    projectId = projectData.project_id;

    if (projectData.project_name) {
        fields.push('project_name = ?');
        values.push(projectData.project_name);
    }
    if (projectData.description !== undefined) {
        fields.push('description = ?');
        values.push(projectData.description);
    }
    if (projectData.client_id) {
        fields.push('client_id = ?');
        values.push(projectData.client_id);
    }
    if (projectData.status) {
        fields.push('status = ?');
        values.push(projectData.status);
    }
    if (projectData.start_date) {
        fields.push('start_date = ?');
        values.push(projectData.start_date);
    }
    if (projectData.due_date) {
        fields.push('due_date = ?');
        values.push(projectData.due_date);
    }

    if(projectData.archived !== undefined) {
        if(!!projectData.archived) {
            const count = await pool.query('SELECT COUNT(*) FROM dj.taskmanager_tasks WHERE project_id = ? AND status != "Completed"', [projectId]);
            if (!!count?.[0]?.[0]?.['COUNT(*)'])
                throw Error('Cannot archive project with incomplete tasks');
        }
        fields.push('archived = ?');
        values.push(projectData.archived);
    }

    if (fields.length === 0) {
        throw new Error('No fields to update');
    }

    // Add updated_at and project_id
    fields.push('updated_at = NOW()');
    values.push(projectId);

    const query = `UPDATE dj.taskmanager_projects SET ${fields.join(', ')} WHERE project_id = ?`;
    await pool.query(query, values);

    return { project_id: projectId, ...projectData };
};

// Delete a project
export const deleteProject = async (projectId) => {
    await pool.query(`DELETE FROM dj.taskmanager_projects WHERE project_id = ?`, [projectId]);
};
