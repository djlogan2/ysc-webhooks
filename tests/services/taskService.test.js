import * as chai from 'chai';
import { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import * as taskService from '../../services/taskmanager/taskService.js';
import * as clientService from '../../services/taskmanager/clientService.js';
import * as projectService from '../../services/taskmanager/projectService.js';
import * as contextService from '../../services/taskmanager/contextService.js';
import pool from '../../services/db.js';
import dbMock from '../../tests/utils/dbmock.js';

chai.use(chaiAsPromised);

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

            await expect(taskService.createTask({
                task_name: 'Invalid Status Task',
                context_id: context.context_id,
                status: 'Invalid'
            })).to.be.rejectedWith('Invalid task status');
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
            })).to.be.rejectedWith('Invalid task status');
        });

        it('should fail to update a non-existent task', async () => {
            await expect(taskService.updateTask({
                task_id: 999,
                task_name: 'Non-existent Task'
            })).to.be.rejectedWith('Task not found');
        });
    });
});