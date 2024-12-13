import fs from 'fs';
import SqlParser from "node-sql-parser";

const Parser = SqlParser.Parser;


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

    generateUniqueId() {
        return Math.floor(100000 + Math.random() * 900000);
    }

    async insert(table, row) {
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
            if (field === schema.primaryKey && fieldSchema.autoIncrement) {
                continue;
            }
            if (row[field] === undefined || row[field] === null) {
                if (!fieldSchema.nullable) {
                    if (fieldSchema.default !== undefined && fieldSchema.default !== null) {
                        row[field] = fieldSchema.default;
                    } else {
                        throw new Error(`Field ${field} cannot be null in table ${table}.`);
                    }
                }
            }
            if (fieldSchema.enum && row[field] !== undefined && row[field] !== null) {
                if (!fieldSchema.enum.includes(row[field])) {
                    throw new Error(`Invalid value for field ${field} in table ${table}: ${row[field]}. Allowed values: ${fieldSchema.enum.join(', ')}.`);
                }
            }
        }


        // Handle auto-increment primary key
        if (schema.primaryKey) {
            if (schema.fields[schema.primaryKey].autoIncrement) {
                row[schema.primaryKey] = this.generateUniqueId();
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

    evaluateCondition(condition, row) {
        if (condition.type === 'binary_expr') {
            const {left, operator, right} = condition;

            if (operator === 'AND') {
                return this.evaluateCondition(left, row) && this.evaluateCondition(right, row);
            }

            if (operator === 'OR') {
                return this.evaluateCondition(left, row) || this.evaluateCondition(right, row);
            }

            const leftValue = left.type === 'column_ref' ? row[left.column] : (left.qvalue || left.value);
            const rightValue = right.type === 'column_ref' ? row[right.column] : (right.qvalue || right.value);

            console.log(`evaluateCondition: ${JSON.stringify(left)} ${operator} ${JSON.stringify(right)} : ${leftValue} ${operator} ${rightValue} : ${rightValue}`);

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
                    if (rightValue !== null)
                        throw Error('Do not know what to do with this IS value');
                    return leftValue === null || leftValue === undefined;
                default:
                    throw new Error(`Unsupported operator ${operator}.`);
            }
        }

        throw new Error(`Unsupported condition type: ${condition.type}`);
    }

    doit(node, values, _index) {
        if (!node || typeof node !== 'object') return;
        let index = _index || 0;
        if (!!node.left)
            index = this.doit(node.left, values, index);
        if (node.value === '?')
            node.qvalue = values[index++];
        else if (typeof node.value === 'object')
            index = this.doit(node.value, values, index);
        else
            node.qvalue = node.value;
        if (!!node.right)
            return this.doit(node.right, values, index);
        else
            return index;
    }

    async query(sql, values) {
        console.log(`query : ${sql} : ${JSON.stringify(values)}`);
        const parser = new Parser();
        let ast = parser.astify(sql);
        let index = 0;

        if(Array.isArray(ast)) {
            if(ast.length > 1)
                throw new Error('What in the world do we do here? I dont know why its even creating an array!');
            ast = ast[0];
        }

        if (ast.type === 'insert') {
            const table = ast.table[0]?.table || ast.table.table;
            const fields = ast.columns;
            const row = {};
            if (!!values)
                fields.forEach((field, idx) => {
                    row[field] = values[idx];
                });
            else
                ast.values[0].value.forEach((field, idx) => {
                    row[ast.columns[idx]] = field.value;
                });
            const result = await this.insert(table, row);
            console.log(`INSERT result: ${JSON.stringify([result])}`);
            return [result];
        }

        if (ast.type === 'select') {
            if (ast.where)
                this.doit(ast.where, values);
            const table = ast.from[0]?.table || ast.from.table;
            const results = this.data[table].filter((row) => {
                if (!ast.where) return true;
                return this.evaluateCondition(ast.where, row);
            });

            if (ast?.columns?.[0]?.expr?.name === 'COUNT') {
                return [[{'COUNT(*)': results.length}]];
            }

            if (!results?.length) {
                return [[]];
            }
            console.log(`SELECT results: ${JSON.stringify([results])}`);
            return [results];
        }

        if (ast.type === 'update') {
            const table = ast.table[0]?.table || ast.table.table;
            const schema = this.schema[table];
            if (!schema) {
                throw new Error(`Table ${table} does not exist.`);
            }

            if (!!ast.set)
                index = ast.set.reduce((pv, cv) => this.doit(cv, values, pv), 0);
            if (!!ast.where)
                this.doit(ast.where, values, index);

            const updates = ast.set.map(({column, value}) => ({
                column,
                value: value.qvalue || value.value
            }));

            const results = this.data[table].filter((row) => {
                if (!ast.where) return true;
                return this.evaluateCondition(ast.where, row, values);
            });

            results.forEach((row) => {
                updates.forEach(({column, value}) => {
                    if (!schema.fields[column]) {
                        throw new Error(`Field ${column} does not exist in table ${table}.`);
                    }
                    if (schema.fields[column].enum && value !== null)
                        if (!schema.fields[column].enum.includes(value))
                            throw new Error(`Invalid value for field ${column} in table ${table}: ${value}. Allowed values: ${schema.fields[column].enum.join(', ')}.`);
                    row[column] = value;
                });
            });

            console.log(`UPDATE results: ${JSON.stringify([{affectedRows: results.length}])}`);
            return [{affectedRows: results.length}];
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
                let enumValues = null;

                if (definition?.definition?.expr?.type === 'expr_list')
                    enumValues = definition.definition.expr.value.map(val => val.value);

                schema[tableName].fields[fieldName] = {
                    type: fieldType,
                    nullable: isNullable,
                    autoIncrement: isAutoIncrement,
                    default: defaultValue,
                    enum: enumValues,
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
