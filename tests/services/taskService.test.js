import { expect } from 'chai';
import sinon from 'sinon';
import dbMock from '../utils/dbmock.js';
import { CustomLater } from '../../utils/customLater.js';
import taskService from '../../services/taskmanager/taskService.js';
import contextService from '../../services/taskmanager/contextService.js';

describe('testService', () => {
    let queryStub;
    let contextId;

    beforeEach(async () => {
        queryStub = sinon.stub(pool, 'query').callsFake((...args) => dbMock.query(...args));
        dbMock.resetDatabase();
        const context = await contextService.createContext({ context_name: 'default' });
        contextId = context.context_id;
    });

    afterEach(() => {
        queryStub.restore();
    });

    describe('createTask', () => {
        it('should create a task with valid data', async () => {
            const taskData = {
                task_name: 'Test Task',
                description: 'This is a test task.',
                status: 'Next Action',
                defaultProject: true,
                context_id: contextId,
                due_date: new Date().toISOString(),
                start_date: new Date().toISOString(),
                time_estimate: 2,
                energy_level: 'Medium',
                effort: 'Medium Effort',
                impact: 'High',
            };

            const result = await taskService.createTask(taskData, 'America/Denver');
            expect(result).to.have.property('task_id');
            const tasks = await dbMock.query('SELECT * FROM dj.taskmanager_tasks WHERE task_id = ?', [result.task_id]);
            expect(tasks[0].task_name).to.equal('Test Task');
        });

        it('should throw an error if task_name is missing', async () => {
            const taskData = {
                description: 'This is a test task.',
                status: 'Next Action',
                defaultProject: true,
                context_id: contextId,
            };

            await expect(taskService.createTask(taskData, 'America/Denver')).to.be.rejectedWith("Field 'task_name' cannot be null");
        });

        it('should throw an error for invalid status value', async () => {
            const taskData = {
                task_name: 'Invalid Status Task',
                status: 'InvalidStatus',
                defaultProject: true,
                context_id: contextId,
            };

            await expect(taskService.createTask(taskData, 'America/Denver')).to.be.rejectedWith("Invalid value for field 'status'");
        });

        it('should handle recurring_interval with valid schedule', async () => {
            const taskData = {
                task_name: 'Recurring Task',
                recurring_interval: 'every Monday',
                defaultProject: true,
                context_id: contextId,
            };

            const result = await taskService.createTask(taskData, 'America/Denver');
            const tasks = await dbMock.query('SELECT * FROM dj.taskmanager_tasks WHERE task_id = ?', [result.task_id]);

            expect(tasks[0].recurring_interval).to.equal('every Monday');
        });

        it('should throw an error if recurring_interval and due_date conflict', async () => {
            const dueDate = new Date().toISOString();
            const taskData = {
                task_name: 'Conflicting Task',
                recurring_interval: 'every Monday',
                due_date: dueDate,
                defaultProject: true,
                context_id: contextId,
            };

            await expect(taskService.createTask(taskData, 'America/Denver')).to.be.rejectedWith("due_date does not match the recurring_interval");
        });
    });

    describe('updateTask', () => {
        it('should update a task with valid data', async () => {
            const initialTask = await taskService.createTask({
                task_name: 'Original Task',
                status: 'Next Action',
                defaultProject: true,
                context_id: contextId,
            }, 'America/Denver');

            const taskData = {
                task_id: initialTask.task_id,
                task_name: 'Updated Task',
                description: 'Updated description.',
            };

            const result = await taskService.updateTask(taskData, 'America/Denver');
            expect(result).to.have.property('affectedRows', 1);

            const tasks = await dbMock.query('SELECT * FROM dj.taskmanager_tasks WHERE task_id = ?', [taskData.task_id]);
            expect(tasks[0].task_name).to.equal('Updated Task');
        });

        it('should throw an error if trying to modify a completed task', async () => {
            const initialTask = await taskService.createTask({
                task_name: 'Completed Task',
                status: 'Completed',
                defaultProject: true,
                context_id: contextId,
            }, 'America/Denver');

            const updateData = {
                task_id: initialTask.task_id,
                description: 'Trying to update a completed task.',
            };

            await expect(taskService.updateTask(updateData, 'America/Denver')).to.be.rejectedWith("Completed tasks cannot be updated");
        });

        it('should validate updates to recurring_interval and due_date', async () => {
            const initialTask = await taskService.createTask({
                task_name: 'Recurring Task',
                recurring_interval: 'every Monday',
                defaultProject: true,
                context_id: contextId,
            }, 'America/Denver');

            const taskData = {
                task_id: initialTask.task_id,
                recurring_interval: 'every Tuesday',
                due_date: new Date('2023-01-03T07:00:00Z'),
            };

            await expect(taskService.updateTask(taskData, 'America/Denver')).to.be.rejectedWith("due_date does not match the recurring_interval");
        });

        it('should create a new task for recurring tasks upon completion', async () => {
            const initialTask = await taskService.createTask({
                task_name: 'Recurring Completion Task',
                recurring_interval: 'every Monday',
                defaultProject: true,
                context_id: contextId,
            }, 'America/Denver');

            const taskData = {
                task_id: initialTask.task_id,
                status: 'Completed',
            };

            const result = await taskService.updateTask(taskData, 'America/Denver');
            expect(result).to.have.property('new_task_id');

            const newTasks = await dbMock.query('SELECT * FROM dj.taskmanager_tasks WHERE task_id = ?', [result.new_task_id]);
            expect(newTasks).to.have.length(1);
        });
    });

    describe('CustomLater', () => {
        it('should parse a valid recurring interval', () => {
            const laterInstance = new CustomLater('America/Denver');
            const schedule = laterInstance.parseText('every Monday');
            expect(schedule).to.exist;
        });

        it('should validate a valid date against a schedule', () => {
            const laterInstance = new CustomLater('America/Denver');
            const schedule = laterInstance.parseText('every Monday');
            const isValid = laterInstance.isValid(schedule, new Date('2023-01-02T07:00:00Z'));
            expect(isValid).to.be.true;
        });

        it('should throw an error for invalid recurring interval', () => {
            const laterInstance = new CustomLater('America/Denver');
            expect(() => laterInstance.parseText('invalid interval')).to.throw("Invalid recurring_interval");
        });
    });
});
