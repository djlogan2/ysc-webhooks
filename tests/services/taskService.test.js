import dbMock from '../utils/dbmock';
import taskService from '../../services/taskmanager/taskService';

describe('Task Service Tests', () => {
    beforeEach(() => {
        dbMock.resetDatabase();
        dbMock.insert('taskmanager_projects', { project_id: 1, project_name: 'Test Project', client_id: 1 });
        dbMock.insert('taskmanager_contexts', { context_id: 1, context_name: 'Test Context' });
    });

    describe('Create Tasks', () => {
        const fullTaskData = {
            task_name: 'Test Task',
            context_id: 1,
            project_id: 1,
            status: 'Active',
            due_date: '2024-12-31'
        };

        it('should create a task with all fields provided', async () => {
            const result = await taskService.createTask(fullTaskData);
            expect(result.task_name).toBe('Test Task');
            expect(result.context_id).toBe(1);
        });

        it('should fail if a required field is missing', async () => {
            const requiredFields = ['task_name', 'context_id'];

            for (const field of requiredFields) {
                const invalidData = { ...fullTaskData };
                delete invalidData[field];

                await expect(taskService.createTask(invalidData)).rejects.toThrow();
            }
        });
    });

    describe('Update Tasks', () => {
        beforeEach(() => {
            dbMock.insert('taskmanager_tasks', {
                task_id: 1,
                task_name: 'Original Task',
                context_id: 1,
                project_id: 1,
                status: 'Active'
            });
        });

        it('should update task fields successfully', async () => {
            const updatedData = {
                task_id: 1,
                task_name: 'Updated Task',
                status: 'Completed'
            };

            const result = await taskService.updateTask(updatedData);
            expect(result.task_name).toBe('Updated Task');
            expect(result.status).toBe('Completed');
        });

        it('should fail to update if a required field is missing', async () => {
            const invalidData = {
                task_id: 1,
                context_id: undefined
            };

            await expect(taskService.updateTask(invalidData)).rejects.toThrow();
        });
    });

    describe('Read Tasks', () => {
        beforeEach(() => {
            dbMock.insert('taskmanager_tasks', {
                task_id: 1,
                task_name: 'Active Task',
                context_id: 1,
                project_id: 1,
                status: 'Active'
            });
            dbMock.insert('taskmanager_tasks', {
                task_id: 2,
                task_name: 'Completed Task',
                context_id: 1,
                project_id: 1,
                status: 'Completed'
            });
        });

        it('should retrieve all tasks for a project', async () => {
            const result = await taskService.getTasksByProjectId(1);
            expect(result.length).toBe(2);
        });

        it('should retrieve specific fields only', async () => {
            const result = await taskService.getTasksByProjectId(1, { fields: ['task_name'] });
            expect(result[0]).toHaveProperty('task_name');
            expect(result[0]).not.toHaveProperty('status');
        });
    });

    describe('Delete Tasks', () => {
        beforeEach(() => {
            dbMock.insert('taskmanager_tasks', {
                task_id: 1,
                task_name: 'Task to Delete',
                context_id: 1,
                project_id: 1,
                status: 'Active'
            });
        });

        it('should delete a task by ID', async () => {
            const result = await taskService.deleteTask(1);
            expect(result).toHaveProperty('affectedRows', 1);

            const remainingTasks = dbMock.query('SELECT * FROM taskmanager_tasks WHERE task_id = ?', [1]);
            expect(remainingTasks).toHaveLength(0);
        });
    });
});
