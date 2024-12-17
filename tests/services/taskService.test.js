import { expect } from 'chai';
import sinon from 'sinon';
import dbMock from '../utils/dbmock.js';
import { CustomLater } from '../../utils/customLater.js';
import * as taskService from '../../services/taskmanager/taskService.js';
import * as contextService from '../../services/taskmanager/contextService.js';
import pool from '../../services/db.js';

describe('Task Service', () => {
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
            const dt = new Date().toISOString();
            const taskData = {
                task_name: 'Test Task',
                description: 'This is a test task.',
                status: 'Next Action',
                defaultProject: true,
                context_id: contextId,
                due_date: dt,
                start_date: dt,
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

            await expect(taskService.createTask(taskData, 'America/Denver')).to.be.rejectedWith("Task name and context ID are required.");
        });

        it('should throw an error for invalid status value', async () => {
            const taskData = {
                task_name: 'Invalid Status Task',
                defaultProject: true,
                context_id: contextId,
            };
            const result = await taskService.createTask(taskData, 'America/Denver');
            expect(result).to.have.property('task_id');

            await expect(taskService.updateTask({task_id: result.task_id, status: 'InvalidStatus'}, 'America/Denver')).to.be.rejectedWith("Invalid value for field status in table taskmanager_tasks: InvalidStatus. Allowed values: Next Action, Waiting For, Someday/Maybe, Reference, Completed.");
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
            expect(result).to.not.equal(null);

            const tasks = await dbMock.query('SELECT * FROM dj.taskmanager_tasks WHERE task_id = ?', [taskData.task_id]);
            expect(tasks[0].task_name).to.equal('Updated Task');
        });

        it('should throw an error if trying to modify a completed task', async () => {
            const initialTask = await taskService.createTask({
                task_name: 'Completed Task',
                defaultProject: true,
                context_id: contextId,
            }, 'America/Denver');

            const updateData = {
                task_id: initialTask.task_id,
                description: 'Trying to update a completed task.',
            };

            await expect(taskService.updateTask({task_id: initialTask.task_id, status: 'Completed'}, 'America/Denver')).to.not.equal(null);
            await expect(taskService.updateTask(updateData, 'America/Denver')).to.be.rejectedWith("Cannot modify a completed task without uncompleting it.");
        });
    });
});
