import later from 'later';
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

// Helper: Get or Create "Miscellaneous" Project
const getOrCreateMiscellaneousProject = async () => {
    const [rows] = await pool.query(
        `SELECT project_id FROM dj.taskmanager_projects WHERE project_name = 'Miscellaneous'`
    );
    if (rows.length > 0) {
        return rows[0].project_id;
    }

    const [result] = await pool.query(
        `INSERT INTO dj.taskmanager_projects (project_name, description, status)
         VALUES ('Miscellaneous', 'Default project for unclassified tasks', 'Active')`
    );
    return result.insertId;
};

// Create a new task
export const createTask = async (taskData) => {
    if (!taskData.task_name || !taskData.context_id) {
        throw new Error('Task name and context ID are required.');
    }

    if (!taskData.project_id) {
        taskData.project_id = await getOrCreateMiscellaneousProject();
    }

    const [result] = await pool.query(
        `INSERT INTO dj.taskmanager_tasks
         (task_name, description, due_date, project_id, schedule_expression, context_id, priority_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
            taskData.task_name,
            taskData.description,
            taskData.due_date,
            taskData.project_id,
            taskData.schedule_expression,
            taskData.context_id,
            taskData.priority_id,
        ]
    );

    const [rows] = await pool.query(
        `SELECT * FROM dj.taskmanager_tasks WHERE task_id = ?`,
        [result.insertId]
    );
    return rows[0];
};

// Update a task by ID
export const updateTask = async (id, data) => {
    const {
        task_name,
        description,
        status,
        project_id,
        client_id,
        context_id,
        priority_id,
        due_date,
        start_date,
        time_estimate,
        energy_level,
        effort,
        impact,
        recurring_interval,
    } = data;

    const query = `
        UPDATE dj.taskmanager_tasks
        SET task_name = ?, description = ?, status = ?, project_id = ?, client_id = ?, context_id = ?,
            priority_id = ?, due_date = ?, start_date = ?, time_estimate = ?,
            energy_level = ?, effort = ?, impact = ?, recurring_interval = ?, updated_at = NOW()
        WHERE task_id = ?
    `;

    const [result] = await pool.query(query, [
        task_name,
        description,
        status,
        project_id,
        client_id,
        context_id,
        priority_id,
        due_date,
        start_date,
        time_estimate,
        energy_level,
        effort,
        impact,
        recurring_interval,
        id,
    ]);

    return result.affectedRows > 0 ? { task_id: id, ...data } : null;
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
    const [taskRows] = await pool.query('SELECT * FROM dj.taskmanager_tasks WHERE task_id = ?', [id]);
    const task = taskRows[0];
    if (!task) return null;

    await pool.query('UPDATE dj.taskmanager_tasks SET status = "Completed", updated_at = NOW() WHERE task_id = ?', [id]);

    if (task.schedule_expression) {
        const nextDueDate = calculateNextDueDate(task.due_date, task.schedule_expression);
        await pool.query(
            `INSERT INTO dj.taskmanager_tasks
             (task_name, description, status, project_id, client_id, context_id, priority_id,
              due_date, start_date, time_estimate, energy_level, effort, impact, schedule_expression)
             VALUES (?, ?, "Next Action", ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                task.task_name,
                task.description,
                task.project_id,
                task.client_id,
                task.context_id,
                task.priority_id,
                nextDueDate,
                nextDueDate,
                task.time_estimate,
                task.energy_level,
                task.effort,
                task.impact,
                task.schedule_expression,
            ]
        );
    }

    return task;
};

// Helper: Calculate next due date for recurring tasks
const calculateNextDueDate = (currentDueDate, scheduleExpression) => {
    const schedule = later.parse.text(scheduleExpression);
    if (schedule.error > -1) {
        throw new Error(`Invalid schedule expression: ${scheduleExpression}`);
    }

    const current = new Date(currentDueDate || Date.now());
    const nextOccurrence = later.schedule(schedule).next(1, current);
    return nextOccurrence.toISOString().slice(0, 19).replace('T', ' ');
};
