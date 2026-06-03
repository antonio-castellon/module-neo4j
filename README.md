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
- getConnection, execute, executeAsPromise, executeAsStream, executeBatch

## License

MIT
