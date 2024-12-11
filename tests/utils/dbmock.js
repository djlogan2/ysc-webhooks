import {  Parser  } from 'node-sql-parser';
import { nanoid } from 'nanoid';
import fs from 'fs';

class DBMock {
    constructor() {
        this.schema = {};
        this.data = {};
        this.queue = Promise.resolve(); // Initialize an empty promise queue
    }

    async executeQueued(fn) {
        this.queue = this.queue.then(fn).catch((err) => {
            console.error('Error in DBMock operation:', err);
            throw err; // Ensure errors propagate correctly
        });
        return this.queue;
    }

    loadSchema(schema) {
        this.schema = schema;
        this.resetDatabase();
    }

    resetDatabase() {
        this.data = {};
        for (const table of Object.keys(this.schema)) {
            this.data[table] = [];
        }
    }

    async insert(table, row) {
        return this.executeQueued(() => {
            const schema = this.schema[table];
            if (!schema) {
                throw new Error(`Table ${table} does not exist.`);
            }

            // Validate fields
            for (const field in row) {
                if (!schema.fields[field]) {
                    throw new Error(`Field ${field} does not exist in table ${table}.`);
                }
            }

            // Check NOT NULL constraints and handle default values
            for (const field in schema.fields) {
                const fieldSchema = schema.fields[field];

                // Skip auto-increment primary keys from validation
                if (field === schema.primaryKey && fieldSchema.autoIncrement) {
                    continue;
                }

                if (row[field] === undefined || row[field] === null) {
                    if (!fieldSchema.nullable) {
                        if (fieldSchema.default !== undefined && fieldSchema.default !== null) {
                            row[field] = fieldSchema.default; // Apply default if defined
                        } else {
                            throw new Error(`Field ${field} cannot be null in table ${table}.`);
                        }
                    }
                }
            }

            // Handle auto-increment primary key
            if (schema.primaryKey) {
                if (schema.fields[schema.primaryKey].autoIncrement) {
                    const currentData = this.data[table] || [];
                    console.log('currentData:', currentData); // Debugging log

                    const maxKey = currentData.length > 0
                        ? Math.max(0, ...currentData.map((r) => r[schema.primaryKey] || 0))
                        : 0;
                    console.log('maxKey:', maxKey); // Debugging log

                    if (!row) {
                        console.error('row is undefined or null:', row);
                        throw new Error('Row object is missing.');
                    }

                    console.log('row before assignment:', row); // Debugging log
                    console.log('schema.primaryKey:', schema.primaryKey); // Debugging log

                    row[schema.primaryKey] = nanoid(); //maxKey + 1; // Suspected crash point
                    console.log('row after assignment:', row); // Debugging log
                } else {
                    if (!row[schema.primaryKey]) {
                        throw new Error(`Primary key '${schema.primaryKey}' must be provided for table '${table}'`);
                    }
                }
            }
            // Foreign key validations
            for (const field in schema.fields) {
                const fieldSchema = schema.fields[field];

                if (fieldSchema.references) {
                    const { table: refTable, field: refField } = fieldSchema.references;
                    const refExists = this.data[refTable].some((refRow) => refRow[refField] === row[field]);

                    if (!refExists) {
                        throw new Error(`Foreign key constraint failed for ${field} in table ${table}.`);
                    }
                }
            }

            this.data[table].push(row);
            return { insertId: row[schema.primaryKey], affectedRows: 1 };
        });
    }

    async query(sql, values) {
        return this.executeQueued(() => {
            const parser = new Parser();
            const ast = parser.astify(sql);

            let index = 0; // For placeholder value resolution

            if (ast.type === 'insert') {
                const table = ast.table[0]?.table || ast.table.table;
                const fields = ast.columns;
                const row = {};

                fields.forEach((field, idx) => {
                    row[field] = values[idx];
                });

                return [this.insert(table, row)];
            }

            if (ast.type === 'select') {
                const table = ast.from[0]?.table || ast.from.table;
                const results = this.data[table].filter((row) => {
                    if (!ast.where) return true;

                    return this.evaluateCondition(ast.where, row, values, () => values[index++]);
                });

                if (ast?.columns?.[0]?.expr?.name === 'COUNT') return [{ 'COUNT(*)': results.length }];
                if (!results?.length) return [[[]]];
                return [results];
            }

            if (ast.type === 'update') {
                const table = ast.table[0]?.table || ast.table.table;
                const schema = this.schema[table];

                if (!schema) {
                    throw new Error(`Table ${table} does not exist.`);
                }

                const updates = ast.set.map(({ column, value }) => ({
                    column,
                    value: value.value === '?' ? values[index++] : value.value,
                }));

                const results = this.data[table].filter((row) => {
                    if (!ast.where) return true;

                    return this.evaluateCondition(ast.where, row, values, () => values[index++]);
                });

                results.forEach((row) => {
                    updates.forEach(({ column, value }) => {
                        if (!schema.fields[column]) {
                            throw new Error(`Field ${column} does not exist in table ${table}.`);
                        }

                        const fieldSchema = schema.fields[column];

                        // Validate ENUMs
                        if (fieldSchema.type === 'ENUM') {
                            if (!fieldSchema.values.includes(value)) {
                                throw new Error(`Invalid ENUM value for ${column} in table ${table}.`);
                            }
                        }

                        // Apply the update
                        row[column] = value;
                    });
                });

                return [{ affectedRows: results.length }];
            }

            throw new Error(`Query type ${ast.type} not implemented.`);
        });
    }
}

function generateSchemaFromDDL(ddlPath) {
    const parser = new Parser();
    const ddl = fs.readFileSync(ddlPath, 'utf-8');
    const statements = parser.astify(ddl);

    const schema = {};

    statements.forEach((statement) => {
        if (statement.type !== 'create' || statement.keyword !== 'table') return;

        const tableName = Array.isArray(statement.table)
            ? statement.table[0].table
            : statement.table.table;

        if (!tableName) return;

        schema[tableName] = {
            primaryKey: null,
            fields: {},
        };

        if (!statement.create_definitions) return;

        statement.create_definitions.forEach((definition) => {
            if (definition.resource === 'column') {
                const fieldName = definition.column.column;
                const fieldType = definition.definition.dataType;
                const isNullable = definition.nullable?.value === 'null';
                const isPrimaryKey = definition.primary_key || false;
                const isAutoIncrement = definition.auto_increment || false;
                const defaultValue = definition.default_val?.value?.value ?? null;

                schema[tableName].fields[fieldName] = {
                    type: fieldType,
                    nullable: isNullable,
                    autoIncrement: isAutoIncrement,
                    default: defaultValue,
                };

                if (isPrimaryKey) {
                    schema[tableName].primaryKey = fieldName;
                }
            } else if (definition.constraint?.type === 'foreign key') {
                const foreignField = definition.constraint.definition[0].column;
                const referencedTable = definition.constraint.reference.table[0].table;
                const referencedColumn = definition.constraint.reference.columns[0].column;

                if (schema[tableName].fields[foreignField]) {
                    schema[tableName].fields[foreignField].references = {
                        table: referencedTable,
                        field: referencedColumn,
                    };
                }
            }
        });
    });

    return schema;
}

const ddlPath = 'tests/utils/ddl.txt';
const schema = generateSchemaFromDDL(ddlPath);

const dbMock = new DBMock();
dbMock.loadSchema(schema);

export default dbMock;
