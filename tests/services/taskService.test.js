import * as chai from 'chai';
import { expect } from 'chai';
import { DateTime } from 'luxon';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import later from 'later';
import * as taskService from '../../services/taskmanager/taskService.js';
import * as clientService from '../../services/taskmanager/clientService.js';
import * as projectService from '../../services/taskmanager/projectService.js';
import * as contextService from '../../services/taskmanager/contextService.js';
import pool from '../../services/db.js';
import dbMock from '../../tests/utils/dbmock.js';

chai.use(chaiAsPromised);

later.date.localTime(); // Ensure `later.js` uses local time for calculations

async function createTaskWithContext(taskData, timezone = 'UTC') {
    const context = await contextService.createContext({
        context_name: 'Default Context'
    });

    const taskWithDefaults = {
        ...taskData,
        context_id: context.context_id,
    };

    return taskService.createTask(taskWithDefaults, timezone);
}

describe('Task Service - Recurring Interval and Due Date Tests', () => {
    let queryStub;

    beforeEach(() => {
        queryStub = sinon.stub(pool, 'query').callsFake((...args) => dbMock.query(...args));
        dbMock.resetDatabase();
    });

    afterEach(() => {
        queryStub.restore();
    });

    describe('Task Creation - Recurring Interval and Due Date', () => {
        it('should fail to create a task with an invalid recurring_interval', async () => {
            const taskData = {
                task_name: 'Invalid Recurring Interval Task',
                recurring_interval: 'invalid_interval',
                due_date: '2024-12-01'
            };

            await expect(createTaskWithContext(taskData)).to.be.rejectedWith('Invalid recurring_interval value');
        });

        it('should compute a due_date if recurring_interval exists and due_date is missing', async () => {
            const taskData = {
                task_name: 'Recurring Task with No Due Date',
                recurring_interval: 'every 1 week'
            };

            const task = await createTaskWithContext(taskData);

            expect(task).to.have.property('due_date');

            // Calculate the expected due_date
            const nowUTC = DateTime.now().toJSDate();
            const expectedDate = later.schedule(later.parse.text('every 1 week')).next(1, nowUTC);

            // Remove milliseconds for comparison
            const taskDueDate = DateTime.fromISO(task.due_date).set({ millisecond: 0 }).toISO();
            const expectedDueDate = DateTime.fromJSDate(expectedDate).set({ millisecond: 0 }).toISO();

            // Compare dates without milliseconds
            expect(taskDueDate).to.equal(expectedDueDate);
        });

        it('should fail to create a task if due_date does not align with recurring_interval', async () => {
            const now = DateTime.now();
            const nextSunday = now.plus({ days: (7 - now.weekday) % 7 }).set({ hour: 0, minute: 0, second: 0, millisecond: 0 }).toUTC().toISO();

            const taskData = {
                task_name: 'Misaligned Due Date Task',
                recurring_interval: 'on Monday',
                due_date: nextSunday // This dynamically generates the next Sunday in UTC
            };

            await expect(createTaskWithContext(taskData)).to.be.rejectedWith('Due date does not align with recurring_interval');
        });

        it('should allow a valid recurring_interval and aligned due_date', async () => {
            const taskData = {
                task_name: 'Valid Recurring Task',
                recurring_interval: 'on Monday',
                due_date: '2024-12-02' // This is a Monday
            };

            const task = await createTaskWithContext(taskData);

            expect(task).to.have.property('recurring_interval', 'every Monday');
            expect(task).to.have.property('due_date', '2024-12-02');
        });
    });

    describe('Task Updates - Recurring Interval and Due Date', () => {
        it('should fail to update a task with an invalid recurring_interval', async () => {
            const task = await createTaskWithContext({
                task_name: 'Task with Valid Interval',
                recurring_interval: 'every 1 week',
                due_date: '2024-12-01'
            });

            await expect(taskService.updateTask(task.task_id, {
                recurring_interval: 'invalid_interval'
            })).to.be.rejectedWith('Invalid recurring_interval value');
        });

        it('should fail to update due_date to null if recurring_interval exists', async () => {
            const task = await createTaskWithContext({
                task_name: 'Recurring Task with Due Date',
                recurring_interval: 'every 1 week',
                due_date: '2024-12-01'
            });

            await expect(taskService.updateTask(task.task_id, {
                due_date: null
            })).to.be.rejectedWith('Due date is required when recurring_interval exists');
        });

        it('should fail to update due_date to an invalid value for the recurring_interval', async () => {
            const task = await createTaskWithContext({
                task_name: 'Recurring Task',
                recurring_interval: 'every Monday',
                due_date: '2024-12-02'
            });

            await expect(taskService.updateTask(task.task_id, {
                due_date: '2024-12-03' // This is a Tuesday
            })).to.be.rejectedWith('Due date does not align with recurring_interval');
        });

        it('should allow deleting recurring_interval', async () => {
            const task = await createTaskWithContext({
                task_name: 'Recurring Task',
                recurring_interval: 'every 1 week',
                due_date: '2024-12-01'
            });

            const updatedTask = await taskService.updateTask(task.task_id, {
                recurring_interval: null
            });

            expect(updatedTask).to.have.property('recurring_interval', null);
        });

        it('should allow valid changes to recurring_interval and due_date', async () => {
            const task = await createTaskWithContext({
                task_name: 'Recurring Task',
                recurring_interval: 'every Monday',
                due_date: '2024-12-02'
            });

            const updatedTask = await taskService.updateTask(task.task_id, {
                recurring_interval: 'every 1 week',
                due_date: '2024-12-09' // Matches new interval
            });

            expect(updatedTask).to.have.property('recurring_interval', 'every 1 week');
            expect(updatedTask).to.have.property('due_date', '2024-12-09');
        });
    });

    describe('Task Timezone Tests', () => {
        it('should compute due_date correctly in UTC when timezone is specified', async () => {
            const taskData = {
                task_name: 'Task with Timezone',
                recurring_interval: 'every Monday at 8am'
            };

            const task = await createTaskWithContext(taskData, 'America/New_York');

            expect(task).to.have.property('due_date');

            // Calculate the expected due_date in UTC
            const nowInTimeZone = DateTime.now().setZone('America/New_York').toJSDate();
            const expectedDate = later.schedule(later.parse.text('every Monday at 8am')).next(1, nowInTimeZone);
            const expectedUTC = DateTime.fromJSDate(expectedDate, { zone: 'America/New_York' }).toUTC().toISO();

            expect(task.due_date).to.equal(expectedUTC);
        });

        it('should store due_date as UTC when timezone is not specified', async () => {
            const taskData = {
                task_name: 'Task without Timezone',
                recurring_interval: 'every Monday at 8am'
            };

            const task = await createTaskWithContextAndTimezone(taskData);

            expect(task).to.have.property('due_date');

            // Calculate the expected due_date in UTC
            const nowUTC = DateTime.now().toJSDate();
            const expectedDate = later.schedule(later.parse.text('every Monday at 8am')).next(1, nowUTC);
            const expectedUTC = DateTime.fromJSDate(expectedDate).toUTC().toISO();

            expect(task.due_date).to.equal(expectedUTC);
        });

        it('should fail to create a task with an invalid timezone', async () => {
            const taskData = {
                task_name: 'Task with Invalid Timezone',
                recurring_interval: 'every Monday at 8am'
            };

            await expect(createTaskWithContext(taskData, 'Invalid/Timezone')).to.be.rejectedWith('Invalid Timezone');
        });
    });

    describe('Recurring Task Completion', () => {
        it('should create the next task when a recurring task is completed', async () => {
            const task = await createTaskWithContext({
                task_name: 'Daily Recurring Task',
                recurring_interval: 'every 1 day',
                due_date: '2024-12-01'
            });

            const updatedTask = await taskService.updateTask(task.task_id, {
                status: 'Completed'
            });

            expect(updatedTask).to.have.property('status', 'Completed');

            // Verify the next task is created
            const nextTask = dbMock.data['taskmanager_tasks'].find((t) => t.task_name === 'Daily Recurring Task' && t.status !== 'Completed');
            expect(nextTask).to.exist;

            const expectedDate = later.schedule(later.parse.text('every 1 day')).next(1, new Date('2024-12-01'));
            expect(new Date(nextTask.due_date).toISOString()).to.equal(expectedDate.toISOString());
        });
    });
});

describe('Task Service Tests', () => {
    let queryStub;

    beforeEach(() => {
        queryStub = sinon.stub(pool, 'query').callsFake((...args) => dbMock.query(...args));
        dbMock.resetDatabase();
    });

    afterEach(() => {
        queryStub.restore();
    });

    // Helper functions
    const createClients = async (num) => {
        const clients = [];
        for (let i = 1; i <= num; i++) {
            const client = await clientService.createClient({
                client_name: `Client ${i}`,
                contact_info: `client${i}@example.com`
            });
            expect(client).to.have.property('client_id');
            clients.push(client);
        }
        return clients;
    };

    const createProjects = async (num, clientCount) => {
        const projects = [];
        const clients = await createClients(clientCount);
        for (let i = 1; i <= num; i++) {
            const client = clients[(i - 1) % clientCount];
            const project = await projectService.createProject({
                project_name: `Project ${i}`,
                client_id: client.client_id
            });
            expect(project).to.have.property('project_id');
            projects.push(project);
        }
        return projects;
    };

    const createContexts = async (num) => {
        const contexts = [];
        for (let i = 1; i <= num; i++) {
            const context = await contextService.createContext({
                context_name: `Context ${i}`
            });
            expect(context).to.have.property('context_id');
            contexts.push(context);
        }
        return contexts;
    };

    describe('Create Tasks', () => {
        it('should create a task with all required fields', async () => {
            const [context] = await createContexts(1);

            const task = await taskService.createTask({
                task_name: 'Test Task',
                context_id: context.context_id
            });

            expect(task).to.have.property('task_id');
            expect(task.task_name).to.equal('Test Task');
            expect(task.context_id).to.equal(context.context_id);
        });

        it('should fail to create a task without required fields', async () => {
            const [context] = await createContexts(1);

            await expect(taskService.createTask({
                context_id: context.context_id
            })).to.be.rejectedWith('Task name and context ID are required.');

            await expect(taskService.createTask({
                task_name: 'Test Task'
            })).to.be.rejectedWith('Task name and context ID are required.');
        });

        it('should fail to create a task with an invalid status', async () => {
            const [context] = await createContexts(1);

            const task = await taskService.createTask({
                task_name: 'Invalid Status Task',
                context_id: context.context_id
            });

            await expect(taskService.updateTask({
                task_id: task.task_id,
                status: 'Invalid'
            })).to.be.rejectedWith('Invalid value for field status in table taskmanager_tasks: Invalid. Allowed values: Next Action, Waiting For, Someday/Maybe, Reference, Completed.');
        });
    });

    describe('Update Tasks', () => {
        it('should update a task successfully', async () => {
            const [context] = await createContexts(1);
            const task = await taskService.createTask({
                task_name: 'Initial Task',
                context_id: context.context_id
            });

            const updatedTask = await taskService.updateTask({
                task_id: task.task_id,
                task_name: 'Updated Task'
            });

            expect(updatedTask).to.have.property('task_id', task.task_id);
            expect(updatedTask.task_name).to.equal('Updated Task');
        });

        it('should fail to update a task with an invalid status', async () => {
            const [context] = await createContexts(1);
            const task = await taskService.createTask({
                task_name: 'Initial Task',
                context_id: context.context_id
            });

            await expect(taskService.updateTask({
                task_id: task.task_id,
                status: 'Invalid'
            })).to.be.rejectedWith('Invalid value for field status in table taskmanager_tasks: Invalid. Allowed values: Next Action, Waiting For, Someday/Maybe, Reference, Completed.');
        });

        it('should fail to update a non-existent task', async () => {
            const result = await taskService.updateTask({
                task_id: 999,
                task_name: 'Non-existent Task'
            });
            expect(result).to.be.null;
        });
    });
});