import pool from '../db.js';

// Fetch all tasks, with optional filters
export const getAllTasks = async (filters = {}) => {
    let query = 'SELECT * FROM dj.taskmanager_tasks WHERE archived IS NULL OR archived = 0';
    const params = [];

    if (filters.status) {
        query += ' AND status = ?';
        params.push(filters.status);
    }

    if (filters.priority_id) {
        query += ' AND priority_id = ?';
        params.push(filters.priority_id);
    }

    if (filters.due_date) {
        query += ' AND due_date = ?';
        params.push(filters.due_date);
    }

    const [rows] = await pool.query(query, params);
    return rows;
};

// Fetch a specific task by ID
export const getTaskById = async (id) => {
    const [rows] = await pool.query('SELECT * FROM dj.taskmanager_tasks WHERE task_id = ?', [id]);
    return rows[0];
};

// Helper: Get or Create "Default" Client
const getOrCreateDefaultClient = async () => {
    const rows = await pool.query(
        `SELECT client_id FROM dj.taskmanager_clients WHERE client_name = 'Default Client'`
    );
    if (rows.length > 0) {
        return rows[0].client_id;
    }

    const [result] = await pool.query(
        `INSERT INTO dj.taskmanager_clients (client_name, contact_info)
         VALUES ('Default Client', 'default@example.com')`
    );
    return result.insertId;
};

// Helper: Get or Create "Miscellaneous" Project
const getOrCreateMiscellaneousProject = async () => {
    const defaultClientId = await getOrCreateDefaultClient();

    const rows = await pool.query(
        `SELECT project_id FROM dj.taskmanager_projects WHERE project_name = 'Miscellaneous' AND client_id = ?`,
        [defaultClientId]
    );
    if (rows.length > 0) {
        return rows[0].project_id;
    }

    const [result] = await pool.query(
        `INSERT INTO dj.taskmanager_projects (project_name, description, status, client_id)
         VALUES ('Miscellaneous', 'Default project for unclassified tasks', 'Active', ?);`,
        [defaultClientId]
    );
    return result.insertId;
};

export const createTask = async (taskData, timezone) => {
    if (!taskData.task_name || !taskData.context_id) {
        throw new Error('Task name and context ID are required.');
    }

    if (!taskData.project_id) {
        taskData.project_id = await getOrCreateMiscellaneousProject();
    }

    const [result] = await pool.query(
        `INSERT INTO dj.taskmanager_tasks
         (task_name, description, due_date, start_date, project_id, recurring_interval, context_id, priority_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            taskData.task_name,
            taskData.description,
            taskData.due_date,
            taskData.start_date || null,
            taskData.project_id,
            taskData.recurring_interval || null,
            taskData.context_id,
            taskData.priority_id || null,
        ]
    );

    const rows = await pool.query(`SELECT * FROM dj.taskmanager_tasks WHERE task_id = ?`, [result.insertId]);
    return rows[0];
};

// Update a task by ID
export const updateTask = async (taskObject, timezone = 'UTC') => {
    if (!taskObject.task_id) {
        throw new Error('Task ID is required for updating a task.');
    }

    const taskId = taskObject.task_id;

    // Fetch the current task record
    const rows = await pool.query(
        'SELECT status, recurring_interval, due_date, task_name, description, project_id, context_id, priority_id FROM dj.taskmanager_tasks WHERE task_id = ?',
        [taskId]
    );

    if (rows.length === 0) {
        throw new Error('Task not found');
    }

    const currentTask = rows[0];
    const isTaskCompleted = currentTask.status === 'Completed';

    // Restrict updates to completed tasks unless status is explicitly being uncompleted
    if (isTaskCompleted) {
        if (!taskObject.status || taskObject.status === 'Completed') {
            throw new Error('Cannot modify a completed task without uncompleting it.');
        }
    }

    // Dynamically build the update query
    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(taskObject)) {
        if (key !== 'task_id' && value !== undefined) {
            fields.push(`${key} = ?`);
            values.push(value);
        }
    }

    if (fields.length === 0) {
        throw new Error('No fields to update');
    }

    const query = `UPDATE dj.taskmanager_tasks SET ${fields.join(', ')} WHERE task_id = ?`;
    values.push(taskId);

    const [result] = await pool.query(query, values);

    return result.affectedRows > 0 ? { task_id: taskId, ...taskObject } : null;
};

// Archive (soft delete) a task
export const archiveTask = async (id) => {
    const [result] = await pool.query(
        'UPDATE dj.taskmanager_tasks SET archived = 1, updated_at = NOW() WHERE task_id = ? AND (archived IS NULL OR archived = 0)',
        [id]
    );
    return result.affectedRows > 0;
};

// Mark a task as complete and handle recurring tasks
export const completeTask = async (id) => {
    const taskRows = await pool.query('SELECT * FROM dj.taskmanager_tasks WHERE task_id = ?', [id]);
    const task = taskRows[0];
    if (!task)
        throw new Error('Unable to find task');
    if(task.status === 'Completed')
        throw new Error('Cannot complete an already completed task');

    const updated = await pool.query('UPDATE dj.taskmanager_tasks SET status = "Completed", updated_at = NOW() WHERE task_id = ? and status != "Completed"', [id]);
    if(!updated[0].affectedRows)
        throw new Error('Unable to update task');

    return task;
};
