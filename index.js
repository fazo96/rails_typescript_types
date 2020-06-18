const fs = require('fs')
const path = require('path')

function log(...args) {
  console.log(...args)
}

async function readFile(filePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, (err, data) => {
      if (err) reject(err); else resolve(data.toString())
    })
  })
}

const tableRegex = /^create_table "([a-z_]+)"/
const columnRegex = /^t\.([a-z]+) "([a-z_]+)"/

async function loadSchema(schemaPath) {
  log('Reading schema', schemaPath)
  const schemaString = await readFile(schemaPath)
  let currentPart
  const schema = { tables: [] }
  schemaString.split(/\n+/g).map(lineRaw => {
    const line = lineRaw.trim()
    log('Processing Line', line) 
    if (tableRegex.test(line)) {
      const match = line.match(tableRegex)
      currentPart = match[1]
      schema.tables[currentPart] = { columns: { id: { type: 'integer' } } }
      log('Found table', currentPart)
    } else if (columnRegex.test(line)) {
      const match = line.match(columnRegex)
      const partType = match[1]
      const name = match[2] 
      log('Found column', name, 'of type', partType, 'in table', currentPart)
      schema.tables[currentPart].columns[name] = {
        type: partType
      }
    } else {
      log('Nothing found')
    }
  })
  return schema
}

function convertSchemaToTypes(schema) {
  const types = Object.keys(schema.tables).map(tableName => {
    const columns = schema.tables[tableName].columns
    const attributes = Object.keys(columns).map(columnName => {
      const column = columns[columnName]
      const type = column.type
      return `\t${columnName}: ${type}`
    })
    const content = attributes.join('\n')
    const name = tableName.split('_').map(x => x.slice(0, 1).toUpperCase() + x.slice(1)).join('')
    return [`interface I${name} {`, content, `}`].join('\n')
  })
  return types.join('\n\n')
}

async function main() {
  const basePath = process.argv[2]
  if (!basePath) throw new Error('Path required as first argument')
  const schemaPath = path.join(basePath, '/db/schema.rb')
  log('Rails Typescript Types starting...')
  log('Path:', schemaPath)
  const schema = await loadSchema(schemaPath)
  log('Loaded schema for tables:', Object.keys(schema.tables))
  log('\n', 'Converting...', '\n')
  log(convertSchemaToTypes(schema))
}

main()