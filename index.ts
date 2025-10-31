import sql from 'sql-template-tag'

/**
 * Abstraction over database access: How to execute a query and
 * produce the result as an array of rows.
 */
export type Storage = (query: Query) => Array<Row>

export type Query<A = any> = { sql: string, values: unknown[] }

export type Row = Record<string, Value>

export type Value = string | number | null

function exec<A>(storage: Storage, query: Query<A>): Array<A> {
  return storage(query) as Array<A>
}

/**
 * A best effort description of the functionally relevant aspects of the
 * entire database structure. This is intended for use in a testing to
 * determine whether two databases' structures are effectively equivalent.
 */
export function getStructure(storage: Storage): Structure {
  return exec(storage, pragmaTableListQuery).map((table) => {
    const { schema } = table
    const indexes: Array<Index> =
      exec(storage, pragmaIndexListQuery(table)).map((index) => {
        const columns = exec(storage, pragmaIndexInfoQuery({ name: index.name, schema }))
        return {
          name: index.name,
          unique: !!index.unique,
          origin: index.origin,
          partial: !!index.partial,
          columns,
        } satisfies Index
      })
    const columns: Array<Column> =
      exec(storage, pragmaTableInfoQuery(table)).map((column) => ({
        name: column.name,
        type: column.type,
        notNull: !!column.notnull,
        defaultValue: column.dflt_value,
        primaryKey: column.pk,
      } satisfies Column))
    return {
      schema,
      name: table.name,
      type: table.type,
      withoutRowid: !!table.wr,
      strict: !!table.strict,
      columns,
      indexes,
    } satisfies Table
  })
}

export type Structure = Array<Table>

export type Table = {
  schema: string
  name: string
  type: TableType

  // https://sqlite.org/withoutrowid.html
  withoutRowid: boolean

  // https://sqlite.org/stricttables.html
  strict: boolean

  columns: Array<Column>
  indexes: Array<Index>
}

export type TableType =
  'table' // https://sqlite.org/lang_createtable.html
  | 'view' // https://sqlite.org/lang_createview.html
  | 'shadow' // https://sqlite.org/vtab.html#xshadowname
  | 'virtual' // https://sqlite.org/lang_createvtab.html


export type Column = {
  name: string
  type: string
  notNull: boolean
  defaultValue: string | null
  primaryKey: number
}

export type Index = {
  name: string
  unique: boolean
  origin: IndexOrigin
  partial: boolean
  columns: Array<IndexColumn>
}

export type IndexOrigin =
  'c' // https://sqlite.org/lang_createindex.html
  | 'u' // https://sqlite.org/lang_createtable.html#uniqueconst
  | 'pk' // https://sqlite.org/lang_createtable.html#primkeyconst

export type IndexColumn = PragmaIndexInfo

/**
 * https://sqlite.org/pragma.html#pragma_table_list
 */
const pragmaTableListQuery: Query<PragmaTableList> =
  sql`
    select "schema", "name", "type", "wr", "strict"
    from pragma_table_list()
    where "schema" not like 'temp' and "name" not like 'sqlite_%'
    order by "schema", "name"
  `

type PragmaTableList = {
  schema: string
  name: string
  type: 'table' | 'view' | 'shadow' | 'virtual'

  // https://sqlite.org/withoutrowid.html
  wr: 0 | 1

  // https://sqlite.org/stricttables.html
  strict: 0 | 1
}

/**
 * https://sqlite.org/pragma.html#pragma_table_info
 */
function pragmaTableInfoQuery(
  table: { name: string, schema: string })
  : Query<PragmaTableInfo> {
  return sql`
    select "name", "type", "notnull", "dflt_value", "pk"
    from pragma_table_info( ${table.name}, ${table.schema} )
    order by "name"
  `
}

type PragmaTableInfo = {
  name: string
  type: string
  notnull: 0 | 1
  dflt_value: string | null
  pk: number
}

/**
 * https://sqlite.org/pragma.html#pragma_index_list
 */
function pragmaIndexListQuery(
  table: { name: string, schema: string }
): Query<PragmaIndexList> {
  return sql`
    select "name", "unique", "origin", "partial"
    from pragma_index_list( ${table.name}, ${table.schema} )
    order by "name"
  `
}

type PragmaIndexList = {
  name: string
  unique: 0 | 1
  origin: 'c' | 'u' | 'pk'
  partial: 0 | 1
}

/**
 * https://sqlite.org/pragma.html#pragma_index_info
 */
function pragmaIndexInfoQuery(
  index: { name: string, schema: string }
): Query<PragmaIndexInfo> {
  return sql`
    select "name" from
    pragma_index_info( ${index.name}, ${index.schema} )
    order by "seqno"
  `
}

type PragmaIndexInfo = {
  name: string
}
