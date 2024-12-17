import mysql from 'mysql2/promise';
import dbConfig from './config/dbConfig.js';
import dbmock from "./tests/utils/dbmock.js";

const config = {
    ...dbConfig,
    database: 'testdb',
};

const runQueriesAndCompare = async () => {
    const pool = mysql.createPool(config);
    const dbMock = dbmock('create table testdb.taskmanager_clients\n' +
        '(\n' +
        '    client_id    int auto_increment\n' +
        '        primary key,\n' +
        '    client_name  varchar(255)      not null,\n' +
        '    contact_info text              null,\n' +
        '    archived     tinyint default 0 null\n' +
        ');\n' +
        '\n');

    // Reset dbMock to match an empty MySQL table
    dbMock.resetDatabase();

    const queries = [
        {
            description: 'INSERT query',
            query: 'INSERT INTO taskmanager_clients (client_name, contact_info) VALUES (?, ?)',
            params: ['Test Client', 'test@example.com'],
        },
        {
            description: 'SELECT query',
            query: 'SELECT * FROM taskmanager_clients',
            params: [],
        },
        {
            description: 'UPDATE query',
            query: 'UPDATE taskmanager_clients SET contact_info = ? WHERE client_name = ?',
            params: ['updated@example.com', 'Test Client'],
        },
        // {
        //     description: 'DELETE query',
        //     query: 'DELETE FROM taskmanager_clients WHERE client_name = ?',
        //     params: ['Test Client'],
        // },
    ];

    try {
        console.log('Running queries with MySQL...');
        const mysqlResults = [];
        for (const { description, query, params } of queries) {
            const result = await pool.query(query, params);
            console.log(`${description} MySQL Result:`, result);
            mysqlResults.push(result);
        }

        console.log('\nRunning queries with DBMock...');
        const mockResults = [];
        for (const { description, query, params } of queries) {
            const result = await dbMock.query(query, params);
            console.log(`${description} DBMock Result:`, result);
            mockResults.push(result);
        }

        console.log('\nComparing results...');
        for (let i = 0; i < queries.length; i++) {
            const { description } = queries[i];
            const mysqlResult = JSON.stringify(mysqlResults[i]);
            const mockResult = JSON.stringify(mockResults[i]);

            if (mysqlResult === mockResult) {
                console.log(`${description}: Results match ✅`);
            } else {
                console.log(`${description}: Results differ ❌`);
                console.log('MySQL:', mysqlResults[i]);
                console.log('DBMock:', mockResults[i]);
            }
            console.log('\n-------------------------------\n\n');
        }
    } catch (error) {
        console.error('Error occurred:', error);
    } finally {
        await pool.end();
    }
};

// Run the function
runQueriesAndCompare();