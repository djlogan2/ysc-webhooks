import dbMock from '../utils/dbmock';
import projectService from '../../services/taskmanager/projectService';

describe('Project Service Tests', () => {

    beforeEach(() => {
        dbMock.resetDatabase();
        dbMock.insert('taskmanager_clients', { client_name: 'Client 1', archived: 0 });
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

        it('should create a project with all fields provided', async () => {
            const result = await projectService.createProject(fullProjectData);
            expect(result.project_name).toBe('Test Project');
            expect(result.client_id).toBe(1);
        });

        it('should fail if a required field is missing', async () => {
            const requiredFields = ['project_name', 'client_id'];

            for (const field of requiredFields) {
                const invalidData = { ...fullProjectData };
                delete invalidData[field];

                await expect(projectService.createProject(invalidData)).rejects.toThrow();
            }
        });

        it('should create a project with default client/project if default_project is true', async () => {
            import configMock from '../../config/taskmanagerConfig';
            configMock.setDefaults({ default_client_id: 999 });

            const result = await projectService.createProject({
                project_name: 'Default Test',
                default_project: true
            });

            expect(result.client_id).toBe(999);
        });

        it('should fail if both default_project and client_id are provided', async () => {
            const invalidData = {
                project_name: 'Invalid Project',
                default_project: true,
                client_id: 1
            };

            await expect(projectService.createProject(invalidData)).rejects.toThrow();
        });
    });

    describe('Update Projects', () => {
        beforeEach(() => {
            dbMock.insert('taskmanager_projects', {
                project_name: 'Original Project',
                client_id: 1,
                archived: 0
            });
        });

        it('should update project fields successfully', async () => {
            const updatedData = {
                project_id: 1,
                project_name: 'Updated Project',
                status: 'On Hold'
            };

            const result = await projectService.updateProject(updatedData);
            expect(result.project_name).toBe('Updated Project');
            expect(result.status).toBe('On Hold');
        });

        it('should fail to archive a project with open tasks', async () => {
            dbMock.insert('taskmanager_tasks', {
                task_id: 1,
                project_id: 1,
                status: 'Active'
            });

            await expect(
                projectService.updateProject({ project_id: 1, archived: 1 })
            ).rejects.toThrow();
        });

        it('should fail to update default project or client', async () => {
            dbMock.insert('taskmanager_projects', { project_id: 999, project_name: 'Default Project', default_project: 1 });

            await expect(
                projectService.updateProject({ project_id: 999, archived: 1 })
            ).rejects.toThrow();
        });
    });

    describe('Read Projects', () => {
        beforeEach(() => {
            dbMock.insert('taskmanager_projects', {
                project_id: 1,
                project_name: 'Active Project',
                client_id: 1,
                archived: 0
            });
            dbMock.insert('taskmanager_projects', {
                project_id: 2,
                project_name: 'Archived Project',
                client_id: 1,
                archived: 1
            });
        });

        it('should retrieve all active projects', async () => {
            const result = await projectService.getProjects();
            expect(result.length).toBe(1);
            expect(result[0].project_name).toBe('Active Project');
        });

        it('should retrieve archived projects when requested', async () => {
            const result = await projectService.getProjects({ archived: true });
            expect(result.length).toBe(1);
            expect(result[0].project_name).toBe('Archived Project');
        });

        it('should retrieve specific fields only', async () => {
            const result = await projectService.getProjects({ fields: ['project_name'] });
            expect(result[0]).toHaveProperty('project_name');
            expect(result[0]).not.toHaveProperty('client_id');
        });
    });
});
