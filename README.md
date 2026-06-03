# @acastellon/neo4j

Neo4j persistence interface (using official neo4j-driver v5+).

## Install

```bash
npm install @acastellon/neo4j
```

## Config example

See config.neo4j.template.js (uses bolt:// by default).

## Usage

```js
const config = require('./config.neo4j.template.js');
const neo = require('@acastellon/neo4j')(config);

neo.execute('MATCH (n) RETURN n LIMIT 1', {}).then(console.log);
const stream = neo.executeAsStream(cypher, params);
```

## API

### getConnection(): Driver
Returns a new driver connection (for advanced reuse).

### execute(cypher, parameters, [options]): Promise<array>
Executes and returns transformed results (neo4j ints -> JS numbers/strings, nested objects recursed).

- options: { conn, session, close: bool }

### executeAsPromise(cypher, parameters, [options]): Promise
Similar, returns the raw records array after transform.

### executeAsStream(cypher, parameters, [options]): Readable
For large result sets.

### executeBatch(queries: Array<{cypher, parameters}>, [options]): Promise<boolean>
Transaction batch. Note: current impl resolves after commit subscribe.

## License

MIT
