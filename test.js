//
// test module
//
const config = require('./config.neo4j.template.js');

const db = require('@acastellon/neo4j')(config);
//const db = require('./neo4j.js')(config);

const cypherSentence = 'MATCH (s:Substance)-[r:IS_A]-(c) RETURN s,r,c LIMIT 3';

async function main() {

    await testExecutionAsPromise();
    await testExecutionAsPromise_RAW();
    await testExecutionSharingConnection();
    await testExecuteAsStream();

    await testBatch();

}

main();  // execute the test


function testExecutionAsPromise() {

   db.execute( cypherSentence, {} )
        .then( result => {
            console.log( result );
            /*
                    result.forEach(v => {
                        console.log(v)
                    })
                    */
        } )
}

async function testExecutionAsPromise_RAW(){

    await db.executeAsPromise(cypherSentence,{})
        .then(result => {
            result.forEach(v => {
                console.log(v._fields)
            })
        })
        .catch((e) => { console.log(e)})

}


async function testExecutionSharingConnection(){

    const _conn = db.getConnection();
    const _session = _conn.session();
    db.execute(
         cypherSentence,
        {} ,
        { conn : _conn, session: _session, close : false}
        )
        .then( result => {
            console.log( result );
        })
        .then(() => {

            db.execute(
                cypherSentence,
                {} ,
                { conn : _conn, session: _session, close : true}
            )
                .then( result => {
                    console.log( result );
                })

        })
        ;
}

async function  testExecuteAsStream(){

    const { Writable } = require('stream');

    const outStream = new Writable({
        write(chunk, encoding, callback) {
            console.log(JSON.parse(chunk.toString()));
            callback();
        }
    });

    db.executeAsStream(cypherSentence,
                    {},
                    {close : true})
        //.pipe(process.stdout)
        .pipe(outStream)
    ;
}


async function testBatch() {

    const q = [];

    for (let i=0; i < 20; i++){
        q.push( { cypher : 'MERGE (s:Person{name:"Alice_' + i + '"}) RETURN s;' , parameters : {} } );
        q.push( { cypher : 'MATCH (s:Person) WHERE s.name = "Alice_' + i + '" DELETE s' , parameters : {} });
    }

    console.log( ' ... BATCHES executed successfully = ' + await db.executeBatch(q));
    console.log( ' - ------------------------------------------- -');

    //throws error
    q.push( { cypher : '***MATCH (s:Person) WHERE s.name = "Alice" DELETE s' , parameters : {} })
    console.log( ' ... BATCHES (with ERROR) executed successfully = ' + await db.executeBatch(q))


}