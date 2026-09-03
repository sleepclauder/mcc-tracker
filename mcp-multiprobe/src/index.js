#!/usr/bin/env node
import 'dotenv/config';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { getPool, sql } from './db.js';
import { assertReadOnlyQuery } from './readonlyGuard.js';

const MAX_ROWS = 500;

const server = new McpServer({
  name: 'mcp-multiprobe',
  version: '1.0.0',
});

function textResult(value) {
  return { content: [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }] };
}

function errorResult(err) {
  return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
}

server.tool(
  'list_schemas',
  'List all schemas in the Multiprobe database.',
  {},
  async () => {
    try {
      const pool = await getPool();
      const result = await pool.request().query(
        `SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA ORDER BY SCHEMA_NAME`
      );
      return textResult(result.recordset);
    } catch (err) {
      return errorResult(err);
    }
  }
);

server.tool(
  'list_tables',
  'List tables (and views) in the Multiprobe database, optionally filtered by schema.',
  {
    schema: z.string().optional().describe('Restrict results to this schema (e.g. "dbo")'),
  },
  async ({ schema }) => {
    try {
      const pool = await getPool();
      const request = pool.request();
      let where = '';
      if (schema) {
        request.input('schema', sql.NVarChar, schema);
        where = 'WHERE TABLE_SCHEMA = @schema';
      }
      const result = await request.query(`
        SELECT TABLE_SCHEMA, TABLE_NAME, TABLE_TYPE
        FROM INFORMATION_SCHEMA.TABLES
        ${where}
        ORDER BY TABLE_SCHEMA, TABLE_NAME
      `);
      return textResult(result.recordset);
    } catch (err) {
      return errorResult(err);
    }
  }
);

server.tool(
  'describe_table',
  'Describe the columns of a table or view: name, data type, nullability, default.',
  {
    table: z.string().describe('Table name'),
    schema: z.string().default('dbo').describe('Schema name, defaults to "dbo"'),
  },
  async ({ table, schema }) => {
    try {
      const pool = await getPool();
      const result = await pool
        .request()
        .input('table', sql.NVarChar, table)
        .input('schema', sql.NVarChar, schema)
        .query(`
          SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, CHARACTER_MAXIMUM_LENGTH, COLUMN_DEFAULT
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_NAME = @table AND TABLE_SCHEMA = @schema
          ORDER BY ORDINAL_POSITION
        `);
      if (result.recordset.length === 0) {
        return textResult(`No columns found for ${schema}.${table} — check the table name and schema.`);
      }
      return textResult(result.recordset);
    } catch (err) {
      return errorResult(err);
    }
  }
);

server.tool(
  'query',
  `Run a read-only SELECT query against the Multiprobe database. Only a single SELECT/WITH ` +
    `statement is allowed (no INSERT/UPDATE/DELETE/DDL/EXEC). Results are capped at ${MAX_ROWS} rows — ` +
    `use TOP or WHERE clauses to narrow large result sets.`,
  {
    sql: z.string().describe('A single SELECT statement'),
  },
  async ({ sql: rawQuery }) => {
    try {
      const safeQuery = assertReadOnlyQuery(rawQuery);
      const pool = await getPool();
      const result = await pool.request().query(safeQuery);
      const rows = result.recordset ?? [];
      const truncated = rows.length > MAX_ROWS;
      return textResult({
        rowCount: rows.length,
        truncated,
        rows: truncated ? rows.slice(0, MAX_ROWS) : rows,
      });
    } catch (err) {
      return errorResult(err);
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
