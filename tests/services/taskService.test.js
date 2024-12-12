import { expect } from 'chai';
import sinon from 'sinon';
import * as taskService from '../../services/taskmanager/taskService.js';
import pool from '../../services/db.js';

describe('Task Service Tests', () => {
    let queryStub;

    beforeEach(() => {
        queryStub = sinon.stub(pool, 'query');
    });

    afterEach(() => {
        queryStub.restore();
    });

    describe('Create Tasks', () => {
        it('should create a task with all fields provided', async () => {
            const projectId = 1;
            const fullTaskData = {
                task_name: 'Test Task',
                description: 'A test task',
                status: 'Pending',
                due_date: '2024-12-31',
                project_id: projectId,
                archived: 0
            };
            const insertId = 1;
            /* removed queryStub.resolves([[{ insertId }]]) */

            const result = await taskService.createTask(fullTaskData);
            expect(result.task_name).to.equal('Test Task');
            expect(result.project_id).to.equal(projectId);
            expect(queryStub.calledOnce).to.be.true;
            expect(queryStub.firstCall.args[0]).to.include('INSERT INTO dj.taskmanager_tasks');
        });

        it('should fail if a required field is missing', async () => {
            const requiredFields = ['task_name', 'project_id'];
            for (const field of requiredFields) {
                const invalidData = { task_name: 'Test Task', project_id: 1 };
                delete invalidData[field];
                await expect(taskService.createTask(invalidData)).to.be.rejectedWith(Error);
            }
        });
    });

    describe('Get Tasks', () => {
        it('should fetch all tasks for a given project', async () => {
            const projectId = 1;
            queryStub.resolves([[
                { task_id: 1, task_name: 'Task 1', project_id: projectId },
                { task_id: 2, task_name: 'Task 2', project_id: projectId }
            ]]);

            const result = await taskService.getTasksByProject(projectId);
            expect(result).to.have.lengthOf(2);
            expect(result[0].project_id).to.equal(projectId);
            expect(result[1].project_id).to.equal(projectId);
        });

        it('should return an empty array if no tasks exist for a given project', async () => {
            /* removed queryStub.resolves([[]]) */
            const result = await taskService.getTasksByProject(1);
            expect(result).to.deep.equal([]);
        });

        it('should fetch a task by its ID', async () => {
            const taskId = 1;
            /* removed queryStub.resolves([[{ task_id: taskId, task_name: 'Task 1' }]]) */
            const result = await taskService.getTaskById(taskId);
            expect(result).to.exist;
            expect(result.task_name).to.equal('Task 1');
        });

        it('should return null for a non-existent task ID', async () => {
            /* removed queryStub.resolves([[]]) */
            const result = await taskService.getTaskById(999);
            expect(result).to.be.null;
        });
    });

    describe('Update Tasks', () => {
        it('should update task fields successfully', async () => {
            const updatedData = {
                task_id: 1,
                task_name: 'Updated Task',
                status: 'Completed'
            };
            /* removed queryStub.resolves([{ affectedRows: 1 }]) */

            const result = await taskService.updateTask(updatedData);
            expect(result.task_name).to.equal('Updated Task');
            expect(result.status).to.equal('Completed');
        });

        it('should return null for updating a non-existent task', async () => {
            /* removed queryStub.resolves([{ affectedRows: 0 }]) */
            const result = await taskService.updateTask({ task_id: 999, task_name: 'Updated Task' });
            expect(result).to.be.null;
        });
    });

    describe('Archive Tasks', () => {
        it('should archive a task successfully', async () => {
            /* removed queryStub.resolves([{ affectedRows: 1 }]) */
            const result = await taskService.archiveTask(1);
            expect(result).to.be.true;
        });

        it('should not archive a task already marked as archived', async () => {
            /* removed queryStub.resolves([{ affectedRows: 0 }]) */
            await expect(taskService.archiveTask(1)).to.be.rejectedWith(Error);
        });
    });
});
