import * as chai from 'chai';
import { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import * as clientService from '../../services/taskmanager/clientService.js';
import pool from '../../services/db.js';
import dbMock from '../../tests/utils/dbmock.js';
import * as projectService from "../../services/taskmanager/projectService.js";

chai.use(chaiAsPromised);

describe('Client Service', () => {
    let queryStub;

    beforeEach(() => {
        queryStub = sinon.stub(pool, 'query').callsFake((...args) => dbMock.query(...args));
    });

    afterEach(() => {
        queryStub.restore();
    });

    describe('Create Client', () => {
        it('should create a new client successfully', async () => {
            const clientData = { client_name: 'Test Client', contact_info: 'test@example.com' };

            try {
                const result = await clientService.createClient(clientData);
                expect(result).to.have.property('client_id');
                expect(result.client_id).to.be.a('number');
                expect(result.client_name).to.equal(clientData.client_name);
                expect(result.contact_info).to.equal(clientData.contact_info);
                expect(queryStub.calledOnce).to.be.true;
                expect(queryStub.firstCall.args[0]).to.include('INSERT INTO dj.taskmanager_clients');
            } catch (error) {
                expect.fail(`Test failed with error: ${error.message}`);
            }
        });
        it('should throw an error for missing client_name', async () => {
            const clientData = { contact_info: 'test@example.com' };
            await expect(clientService.createClient(clientData)).to.be.rejectedWith('Field client_name cannot be null in table taskmanager_clients.');
        });
    });

    describe('Archive Client', () => {
        it('should archive a client successfully', async () => {
            const clientData = { client_name: 'Test Client', contact_info: 'test@example.com' };
            let client_id;

            try {
                const result = await clientService.createClient(clientData);
                expect(result).to.have.property('client_id');
                expect(result.client_id).to.be.a('number');
                expect(result.client_name).to.equal(clientData.client_name);
                expect(result.contact_info).to.equal(clientData.contact_info);
                client_id = result.client_id;
            } catch (error) {
                expect.fail(`Test failed with error: ${error.message}`);
            }

            try {
                const result = await clientService.archiveClient(client_id);
                expect(result).to.be.true;
            } catch(error) {
                expect.fail(`Test failed with error: ${error.message}`);
            }
        });

        it('should not archive a client with unarchived projects', async () => {
            const clientData = { client_name: 'Test Client', contact_info: 'test@example.com' };
            let client_id;

            try {
                const result = await clientService.createClient(clientData);
                expect(result).to.have.property('client_id');
                expect(result.client_id).to.be.a('number');
                expect(result.client_name).to.equal(clientData.client_name);
                expect(result.contact_info).to.equal(clientData.contact_info);
                client_id = result.client_id;
            } catch (error) {
                expect.fail(`Test failed with error: ${error.message}`);
            }

            try {
                const projectData = {client_id, project_name: 'Test project'};
                const result = await projectService.createProject(projectData);
                expect(result).to.have.property('project_id');
                expect(result.project_id).to.be.a('number');
                expect(result.project_name).to.equal(projectData.project_name);
            } catch (error) {
                expect.fail(`Test failed with error: ${error.message}`);
            }

            try {
                const result = await clientService.archiveClient(client_id);
                expect(result).to.be.false;
            } catch(error) {
                expect.fail(`Test failed with error: ${error.message}`);
            }
        });
    });

    // Add more test cases for other functions in clientService.js
});
