const clientService = require('../../services/taskmanager/clientService');

// Mock the `db.js` module inline to avoid out-of-scope variable errors.
jest.mock('../../services/db', () => {
    const dbMock = require('../utils/dbmock');
    return dbMock;
});

describe('Client Service', () => {
    let dbMock;

    beforeAll(() => {
        dbMock = require('../utils/dbmock');
        //dbMock.init(); // Initialize the mock database schema
    });

    beforeEach(() => {
        dbMock.resetDatabase(); // Reset the database state before each test
    });

    describe('Create Client', () => {
        it('should create a new client successfully', async () => {
            const clientData = { client_name: 'Test Client', contact_info: 'test@example.com' };
            const result = await clientService.createClient(clientData);

            expect(result).toHaveProperty('client_id');
            expect(result.client_name).toBe(clientData.client_name);
            expect(result.contact_info).toBe(clientData.contact_info);

            const dbMock = require('../utils/dbmock');
            const dbData = dbMock.data.taskmanager_clients.find((c) => c.client_name === clientData.client_name);
            expect(dbData).toBeTruthy();
        });

        it('should throw an error for missing client_name', async () => {
            const clientData = { contact_info: 'test@example.com' };

            await expect(clientService.createClient(clientData)).rejects.toThrow();
        });
    });

    describe('Get Clients', () => {
        it('should get all unarchived clients', async () => {
            const dbMock = require('../utils/dbmock');
            dbMock.insert('taskmanager_clients', { client_id: 1, client_name: 'Client 1', archived: 0 });
            dbMock.insert('taskmanager_clients', { client_id: 2, client_name: 'Client 2', archived: 1 });

            const result = await clientService.getAllClients();

            expect(result.length).toBe(1);
            expect(result[0].client_name).toBe('Client 1');
        });

        it('should get a client by id', async () => {
            const dbMock = require('../utils/dbmock');
            dbMock.insert('taskmanager_clients', { client_id: 1, client_name: 'Client 1', contact_info: 'client1@example.com' });

            const result = await clientService.getClientById(1);

            expect(result).toBeTruthy();
            expect(result.client_name).toBe('Client 1');
            expect(result.contact_info).toBe('client1@example.com');
        });

        it('should return null for a non-existent client id', async () => {
            const result = await clientService.getClientById(999);

            expect(result).toEqual([]);
        });
    });

    describe('Update Client', () => {
        it('should update a client successfully', async () => {
            const dbMock = require('../utils/dbmock');
            dbMock.insert('taskmanager_clients', { client_id: 1, client_name: 'Client 1', contact_info: 'client1@example.com' });

            const updatedData = { client_name: 'Updated Client', contact_info: 'updated@example.com' };
            const result = await clientService.updateClient(1, updatedData);

            expect(result).toBeTruthy();
            expect(result.client_name).toBe('Updated Client');
            expect(result.contact_info).toBe('updated@example.com');

            const dbData = dbMock.data.taskmanager_clients.find((c) => c.client_id === 1);
            expect(dbData.client_name).toBe('Updated Client');
        });

        it('should return null for updating a non-existent client', async () => {
            const updatedData = { client_name: 'Updated Client', contact_info: 'updated@example.com' };
            const result = await clientService.updateClient(999, updatedData);

            expect(result).toBeNull();
        });
    });

    describe('Archive Client', () => {
        it('should archive a client successfully', async () => {
            const dbMock = require('../utils/dbmock');
            dbMock.insert('taskmanager_clients', { client_id: 1, client_name: 'Client 1', archived: 0 });

            const result = await clientService.archiveClient(1);

            expect(result).toBe(true);

            const dbData = dbMock.data.taskmanager_clients.find((c) => c.client_id === 1);
            expect(dbData.archived).toBe(1);
        });

        it('should not archive a client with unarchived projects', async () => {
            const dbMock = require('../utils/dbmock');
            dbMock.insert('taskmanager_clients', { client_id: 1, client_name: 'Client 1', archived: 0 });
            dbMock.insert('taskmanager_projects', { project_id: 1, project_name: 'test', client_id: 1, status: 'Active' });

            await expect(clientService.archiveClient(1)).rejects.toThrow();
        });
    });
});
