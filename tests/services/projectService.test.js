import * as chai from 'chai';
import { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import * as projectService from '../../services/taskmanager/projectService.js';
import * as clientService from '../../services/taskmanager/clientService.js';
import * as taskService from '../../services/taskmanager/taskService.js';
import * as contextService from '../../services/taskmanager/contextService.js';
import pool from '../../services/db.js';
import dbMock from '../../tests/utils/dbmock.js';

chai.use(chaiAsPromised);

describe('Project Service Tests', () => {
    let queryStub;
    let context;

    beforeEach(async () => {
        queryStub = sinon.stub(pool, 'query').callsFake((...args) => dbMock.query(...args));
        // Create a minimal context for tasks
        context = await contextService.createContext({
            context_name: 'Default Context'
        });
    });

    afterEach(() => {
        queryStub.restore();
    });

    describe('Create Projects', () => {
        const fullProjectData = {
            project_name: 'Test Project',
            description: 'A test project',
            status: 'Active',
            start_date: '2024-12-01',
            due_date: '2024-12-31',
            archived: 0
        };

        it('should not allow start_date to be after due_date', async () => {
            await expect(projectService.createProject({
                ...fullProjectData,
                start_date: '2024-12-31',
                due_date: '2024-12-01'
            })).to.be.rejectedWith('Start date cannot be after due date');
        });

        it('should fail to create project without required fields', async () => {
            await expect(projectService.createProject({})).to.be.rejectedWith('Field project_name cannot be null');

            const client = await clientService.createClient({
                client_name: 'Test Client',
                contact_info: 'test@example.com'
            });

            await expect(projectService.createProject({
                client_id: client.client_id
            })).to.be.rejectedWith('Field project_name cannot be null');
        });
    });

    describe('Update Projects', () => {
        it('should update project fields successfully', async () => {
            const client = await clientService.createClient({
                client_name: 'Test Client',
                contact_info: 'test@example.com'
            });

            const project = await projectService.createProject({
                project_name: 'Test Project',
                client_id: client.client_id,
                status: 'Active'
            });

            const updatedData = {
                project_id: project.project_id,
                project_name: 'Updated Project',
                status: 'On Hold'
            };

            const result = await projectService.updateProject(updatedData);

            expect(result).to.have.property('project_id', project.project_id);
            expect(result.project_name).to.equal(updatedData.project_name);
            expect(result.status).to.equal(updatedData.status);
        });

        it('should fail to archive a project with open tasks', async () => {
            const client = await clientService.createClient({
                client_name: 'Test Client',
                contact_info: 'test@example.com'
            });

            const project = await projectService.createProject({
                project_name: 'Test Project',
                client_id: client.client_id,
                status: 'Active'
            });

            // Create an open task associated with the project
            const task = await taskService.createTask({
                task_name: 'Test Task',
                context_id: context.context_id,
                status: 'Next Action',
                project_id: project.project_id
            });

            await expect(projectService.updateProject({
                project_id: project.project_id,
                archived: 1
            })).to.be.rejectedWith('Cannot archive project with incomplete tasks');
        });

        it('should allow archiving a project with completed tasks', async () => {
            const client = await clientService.createClient({
                client_name: 'Test Client',
                contact_info: 'test@example.com'
            });

            const project = await projectService.createProject({
                project_name: 'Test Project',
                client_id: client.client_id,
                status: 'Active'
            });

            // Create a completed task associated with the project
            const task = await taskService.createTask({
                task_name: 'Completed Task',
                context_id: context.context_id,
                project_id: project.project_id
            });

            const result2 = await taskService.completeTask(task.task_id);

            const result = await projectService.updateProject({
                project_id: project.project_id,
                archived: 1
            });

            expect(result).to.have.property('archived', 1);
        });
    });

    describe('Read Projects', () => {
        it('should retrieve a specific project by ID', async () => {
            const client = await clientService.createClient({
                client_name: 'Test Client',
                contact_info: 'test@example.com'
            });

            const project = await projectService.createProject({
                project_name: 'Test Project',
                client_id: client.client_id
            });

            const result = await projectService.getProjectById(project.project_id);

            expect(result).to.have.property('project_id', project.project_id);
            expect(result.project_name).to.equal('Test Project');
        });

        it('should retrieve all unarchived projects', async () => {
            const result = await projectService.getProjects();

            expect(result).to.be.an('array');
            expect(result.every((project) => project.archived === 0)).to.be.true;
        });
    });
});