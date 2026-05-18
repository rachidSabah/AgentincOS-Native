---
name: sql-toolkit
description: Query, design, and manage relational databases (SQLite, PostgreSQL, MySQL). Use when you need to interact with a database, run SQL queries, modify schemas, or analyze data directly via CLI tools.
---

# SQL Toolkit

This skill provides patterns for working with relational databases.

## Supported Engines

- **SQLite**: `sqlite3 <db_file>`
- **PostgreSQL**: `psql -d <db_name>`
- **MySQL**: `mysql -u <user> -p <db_name>`

## Common Operations

### SQLite (Local & Prototyping)
- **Open/Create**: `sqlite3 mydb.sqlite`
- **Execute Query**: `sqlite3 mydb.sqlite "SELECT * FROM table LIMIT 10;"`
- **Import CSV**: `sqlite3 mydb.sqlite ".mode csv" ".import data.csv table_name"`

### Schema Management
- **View Schema**: 
  - SQLite: `.schema`
  - Postgres: `\d`
  - MySQL: `DESCRIBE table_name;`
- **Migrations**: Create `.sql` files for changes and run them via the CLI tool.

## Best Practices

1. **Limit Results**: Always use `LIMIT` on exploratory queries.
2. **Transactions**: Use `BEGIN;` and `COMMIT;` for multiple related changes.
3. **Safety**: Backup databases before destructive operations (`DROP`, `DELETE` without WHERE).
4. **Performance**: Use `EXPLAIN` to debug slow queries.
