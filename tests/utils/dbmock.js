const {Parser} = require('node-sql-parser');
const fs = require('fs');

class DBMock {
    constructor() {
        this.schema = {};
        this.data = {};
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

    insert(table, row) {
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
        if (schema.primaryKey && schema.fields[schema.primaryKey].autoIncrement) {
            row[schema.primaryKey] = Math.max(0, ...this.data[table].map((r) => r[schema.primaryKey])) + 1;
        }

        // Foreign key validations
        for (const field in schema.fields) {
            const fieldSchema = schema.fields[field];

            if (fieldSchema.references) {
                const {table: refTable, field: refField} = fieldSchema.references;
                const refExists = this.data[refTable].some((refRow) => refRow[refField] === row[field]);

                if (!refExists) {
                    throw new Error(`Foreign key constraint failed for ${field} in table ${table}.`);
                }
            }
        }

        this.data[table].push(row);
        return {insertId: row[schema.primaryKey], affectedRows: 1};
    }

    evaluateCondition(condition, row, values, getNextValue) {
        if (condition.type === 'binary_expr') {
            const {left, operator, right} = condition;

            if (operator === 'AND') {
                return this.evaluateCondition(left, row, values, getNextValue) && this.evaluateCondition(right, row, values, getNextValue);
            }

            if (operator === 'OR') {
                return this.evaluateCondition(left, row, values, getNextValue) || this.evaluateCondition(right, row, values, getNextValue);
            }

            const leftValue = left.type === 'column_ref' ? row[left.column] : left.value;
            const rightValue = right.type === 'column_ref' ? row[right.column] : (right.value === '?' ? getNextValue() : right.value);

            switch (operator) {
                case '=':
                    return leftValue === rightValue;
                case '!=':
                    return leftValue !== rightValue;
                case '<':
                    return leftValue < rightValue;
                case '>':
                    return leftValue > rightValue;
                case '<=':
                    return leftValue <= rightValue;
                case '>=':
                    return leftValue >= rightValue;
                case 'LIKE':
                    return new RegExp(rightValue.replace(/%/g, '.*')).test(leftValue);
                case 'IS':
                    if(rightValue !== null)
                        throw Error('Do not know what to do with this IS value');
                    return leftValue === null || leftValue === undefined;
                default:
                    throw new Error(`Unsupported operator ${operator}.`);
            }
        }

        throw new Error(`Unsupported condition type: ${condition.type}`);
    }

    query(sql, values) {
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

            return Promise.resolve([this.insert(table, row)]);
        }

        if (ast.type === 'select') {
            const table = ast.from[0]?.table || ast.from.table;
            const results = this.data[table].filter((row) => {
                if (!ast.where) return true;

                return this.evaluateCondition(ast.where, row, values, () => values[index++]);
            });

            if(ast?.columns?.[0]?.expr?.name === 'COUNT')
                return [{'COUNT(*)': results.length}];
            if(!results?.length) return [[[]]];
            return Promise.resolve([results]);
        }

        if (ast.type === 'update') {
            const table = ast.table[0]?.table || ast.table.table;
            const schema = this.schema[table];

            if (!schema) {
                throw new Error(`Table ${table} does not exist.`);
            }

            const updates = ast.set.map(({column, value}) => ({
                column,
                value: value.value === '?' ? values[index++] : value.value,
            }));

            const results = this.data[table].filter((row) => {
                if (!ast.where) return true;

                return this.evaluateCondition(ast.where, row, values, () => values[index++]);
            });

            results.forEach((row) => {
                updates.forEach(({column, value}) => {
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

            return Promise.resolve([{affectedRows: results.length}]);
        }

        throw new Error(`Query type ${ast.type} not implemented.`);
    }
}

function generateSchemaFromDDL(ddlPath) {
    const parser = new Parser();
    const ddl = fs.readFileSync(ddlPath, 'utf-8');
    const statements = parser.astify(ddl);

    const schema = {};

    statements.forEach((statement) => {
        // Process only table creation statements
        if (statement.type !== 'create' || statement.keyword !== 'table') return;

        // Extract table name
        const tableName = Array.isArray(statement.table)
            ? statement.table[0].table
            : statement.table.table;

        if (!tableName) return;

        schema[tableName] = {
            primaryKey: null,
            fields: {},
        };

        // Safeguard against missing definitions
        if (!statement.create_definitions) return;

        statement.create_definitions.forEach((definition) => {
            if (definition.resource === 'column') {
                // Process column definitions
                const fieldName = definition.column.column;
                const fieldType = definition.definition.dataType;
                const isNullable = definition.nullable?.value === 'null';
                const isPrimaryKey = definition.primary_key || false;
                const isAutoIncrement = definition.auto_increment || false;
                const defaultValue =
                    definition.default_val?.value?.value ?? null;

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
                // Process foreign key constraints
                const foreignField =
                    definition.constraint.definition[0].column;
                const referencedTable =
                    definition.constraint.reference.table[0].table;
                const referencedColumn =
                    definition.constraint.reference.columns[0].column;

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

const ddlPath = 'tests/utils/ddl.txt'; // Path to the DDL file
const schema = generateSchemaFromDDL(ddlPath);

const dbMock = new DBMock();
dbMock.loadSchema(schema);

module.exports = dbMock;
