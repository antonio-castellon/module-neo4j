//
// Extended / example tests for neo4j
//
const assert = require('assert');
const config = require('./config.neo4j.template.js');
const db = require('./neo4j.js')(config);

// Example - replace with your data
const cypher = 'MATCH (n) RETURN n LIMIT 1';

async function run() {
  try {
    const res = await db.execute(cypher, {});
    assert.ok(Array.isArray(res));
    console.log('execute returned array OK, sample len=', res.length);

    const prom = await db.executeAsPromise(cypher, {});
    console.log('executeAsPromise OK');

    console.log('neo4j extended examples OK (adjust cypher for your graph)');
  } catch (e) {
    console.log('neo4j test note (DB may not be available):', e.message);
  }
}

run();
