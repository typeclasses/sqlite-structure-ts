# sqlite-structure

For fetching a description of a [SQLite](https://sqlite.org/) database.

The purpose of this package is to facilitate testing database migrations.
A migration system generally includes two ways to create the same database
structure: One is a step-by-step walkthrough of the database's history that
is used to upgrade existing instances of the database, and one is a complete
description of the final state after all migrations have been applied. It
should be the case both routes end up constructing the same database
structure.

This package uses several [pragma functions](https://sqlite.org/pragma.html)
that SQLite offers to describe its tables, their columns, and their indexes.
It produces a value that is suitable for comparison or use in a snapshot test.
