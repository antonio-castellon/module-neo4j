//
// test module
//
const config = require('./config.neo4j.template.js');
const db = require('./neo4j.js')(config);

// const cypherSentence = 'MATCH (s:Substance)-[r:IS_A]-(c) RETURN s,r,c LIMIT 3';
// db.execute(cypherSentence, {}).then(console.log);

console.log('neo4j module updated - add your test queries');
