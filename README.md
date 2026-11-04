# @acastellon/neo4j

Neo4j persistence interface (using official neo4j-driver v5+).

## Install

```bash
npm install @acastellon/neo4j
```

## Config example

See config.neo4j.template.js (uses bolt:// by default).

```js
module.exports = {
  NEO4J_URL: 'bolt://127.0.0.1:11002',
  NEO4J_USER: 'neo4j',
  NEO4J_PASSWORD: 'neo4j2019',
  TRACES: true
};
```

## Usage

```js
const config = require('./config.neo4j.template.js');
const neo = require('@acastellon/neo4j')(config);

neo.execute('MATCH (n) RETURN n LIMIT 1', {}).then(console.log);
```

## API

### getConnection(): Driver

Returns a new driver connection (for advanced reuse).

**Example (with minimal setup):**

```js
const config = require('./config.neo4j.template.js');
const neo = require('@acastellon/neo4j')(config);

const conn = neo.getConnection();
const session = conn.session();
// use session, then close when done
session.close();
conn.close();
```

### execute(cypher, parameters, [options]): Promise<array>

Executes and returns transformed results (neo4j ints -> JS numbers/strings, nested objects recursed).

- options: { conn, session, close: bool }

**Example (with minimal setup):**

```js
const config = require('./config.neo4j.template.js');
const neo = require('@acastellon/neo4j')(config);

const cypher = 'MATCH (s:Substance)-[r:IS_A]-(c) RETURN s,r,c LIMIT 3';

neo.execute(cypher, {})
  .then(results => console.log(results))
  .catch(err => console.error(err));
```

### executeAsPromise(cypher, parameters, [options]): Promise

Similar, returns the raw records array after transform.

**Example (with minimal setup):**

```js
const config = require('./config.neo4j.template.js');
const neo = require('@acastellon/neo4j')(config);

const cypher = 'MATCH (n) RETURN n LIMIT 1';

neo.executeAsPromise(cypher, {})
  .then(records => console.log(records))
  .catch(err => console.error(err));
```

### executeAsStream(cypher, parameters, [options]): Readable

For large result sets.

**Example (with minimal setup):**

```js
const config = require('./config.neo4j.template.js');
const neo = require('@acastellon/neo4j')(config);

const { Writable } = require('stream');

const cypher = 'MATCH (n) RETURN n LIMIT 100';

const outStream = new Writable({
  write(chunk, encoding, callback) {
    console.log(JSON.parse(chunk.toString()));
    callback();
  }
});

neo.executeAsStream(cypher, {}, { close: true })
  .pipe(outStream);
```

### executeBatch(queries: Array<{cypher, parameters}>, [options]): Promise<boolean>

Transaction batch. Note: current impl resolves after commit subscribe.

**Example (with minimal setup):**

```js
const config = require('./config.neo4j.template.js');
const neo = require('@acastellon/neo4j')(config);

const queries = [
  { cypher: 'MERGE (s:Person {name: $name}) RETURN s', parameters: { name: 'Alice_1' } },
  { cypher: 'MATCH (s:Person {name: $name}) DELETE s', parameters: { name: 'Alice_1' } }
];

neo.executeBatch(queries)
  .then(success => console.log('Batch success:', success))
  .catch(err => console.error(err));
```

## License

MIT

## Notice and Disclaimer

NOTICE AND DISCLAIMER: This software automatically retrieves, accesses or interacts with external materials. Those retrieved materials are not distributed with this software and are governed solely by separate terms, conditions and licenses. You are solely responsible for finding, reviewing and complying with all applicable terms, conditions, and licenses, and for verifying the security, integrity and suitability of any retrieved materials for your specific use case. This software is provided "AS IS", without warranty of any kind. The author makes no representations or warranties regarding any retrieved materials, and assumes no liability for any losses, damages, liabilities or legal consequences from your use or inability to use this software or any retrieved materials. Use this software and the retrieved materials at your own risk.

External materials module-neo4j interacts with at run time:

- Your Neo4j database, under your agreements for that system.
