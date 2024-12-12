import later from 'later';
import { DateTime } from 'luxon';
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
    const [rows] = await pool.query(
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

    const [rows] = await pool.query(
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

export const createTask = async (taskData, timezone = 'UTC') => {
    // Validate required fields
    if (!taskData.task_name || !taskData.context_id) {
        throw new Error('Task name and context ID are required.');
    }

    // Assign to a miscellaneous project if no project_id is provided
    if (!taskData.project_id) {
        taskData.project_id = await getOrCreateMiscellaneousProject();
    }

    // Validate and process recurring_interval
    if (taskData.recurring_interval) {
        try {
            const schedule = later.parse.text(taskData.recurring_interval);
            if (schedule.error !== -1) {
                throw new Error('Invalid recurring_interval value.');
            }

            // Compute `due_date` if missing
            if (!taskData.due_date) {
                // Use Luxon to get the current time in the user's time zone
                const nowInTimeZone = DateTime.now().setZone(timezone).toJSDate();

                // Use `later.js` to calculate the next occurrence
                const nextDate = later.schedule(schedule).next(1, nowInTimeZone);
                if (!nextDate) {
                    throw new Error('Unable to compute due_date from recurring_interval.');
                }

                // Convert the calculated time back to UTC for storage
                taskData.due_date = DateTime.fromJSDate(nextDate, { zone: timezone })
                    .toUTC()
                    .toISO(); // Preserve full timestamp
            } else {
                // Validate existing `due_date` aligns with recurring_interval
                const occurrences = later.schedule(schedule).next(5, DateTime.now().setZone(timezone).toJSDate());
                const isValidDate = occurrences.some(
                    (date) =>
                        DateTime.fromJSDate(date, { zone: timezone })
                            .toUTC()
                            .toISO() === DateTime.fromISO(taskData.due_date).toUTC().toISO()
                );
                if (!isValidDate) {
                    throw new Error('Due date does not align with recurring_interval.');
                }
            }
        } catch (error) {
            throw new Error(`Error with recurring_interval: ${error.message}`);
        }
    }

    // Ensure `start_date` is before or equal to `due_date`
    if (taskData.start_date && taskData.due_date) {
        const startDate = new Date(taskData.start_date);
        const dueDate = new Date(taskData.due_date);
        if (startDate > dueDate) {
            throw new Error('Start date cannot be after due date.');
        }
    }

    // Insert the task into the database
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

    // Retrieve and return the created task
    const [rows] = await pool.query(
        `SELECT * FROM dj.taskmanager_tasks WHERE task_id = ?`,
        [result.insertId]
    );
    return rows[0];
};

// Update a task by ID
export const updateTask = async (data) => {
    const fields = [];
    const values = [];
    let id;

    for (const [key, value] of Object.entries(data)) {
        if(key === 'task_id')
            id = value;
        else if (value !== undefined) {
            fields.push(`${key} = ?`);
            values.push(value);
        }
    }

    // Ensure there's something to update
    if(id === undefined) {
        throw new Error('Invalid task id');
    } else if (fields.length === 0) {
        throw new Error('No fields provided to update');
    }

    // Add the updated_at field and task_id
    values.push(id);

    const query = `
        UPDATE dj.taskmanager_tasks
        SET ${fields.join(', ')}
        WHERE task_id = ?
    `;

    const [result] = await pool.query(query, values);

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
