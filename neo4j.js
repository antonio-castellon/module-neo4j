//
// Castellon.CH (c)
// Author: Antonio Castellon - antonio@castellon.ch
//
// based in Driver 1.7.x from Neo4j-driver JS official
//
// config parameter:
//
// module.exports = {
//     NEO4J_URL: 'neo4j://127.0.0.1:11002'
//    ,NEO4J_USER: 'neo4j'
//    ,NEO4J_PASSWORD: 'neo4j2019'
//    /* ,NEO4J_DATABASE: '<database_name>'  // available in the future in v4.0 */
//    ,TRACES : true
// }
//
const neo4j = require('neo4j-driver').v1;

module.exports = function(config) {

    const model = {};

    //
    // CONFIGURATION
    //

    function getConnection()
    {
        return neo4j.driver(
                config.NEO4J_URL
                ,neo4j.auth.basic(config.NEO4J_USER, config.NEO4J_PASSWORD)
                ,{ maxTransactionRetryTime: 30000 }
            );
    }


    //
    // ASSIGNATIONS
    //

    model.getConnection = getConnection;

    model.execute = execute;
    model.executeAsPromise = executeAsPromise;
    model.executeAsStream = executeAsStream;
    model.executeBatch = executeBatch;


    const neo4jIntsToStrings = (json) => {
        const pluckAndModify = (isMatch, transformValue) =>
            Object.entries(json)
                .filter(isMatch)
                .reduce((acc, [key, value]) => ({ ...acc, [key]: transformValue(value) }), {});
        return Object.assign(
            json,
            pluckAndModify(([, value]) => typeof value === 'object', neo4jIntsToStrings),
            pluckAndModify(([, value]) => neo4j.isInt(value), value => value.toString()),
        );
    };

    //
    //  FUNCTION BODY
    //

    function getConnAndSession(options) {

        const conn =  (options != null && options.conn)? options.conn :  getConnection();
        const session = (options != null && options.session)? options.session : conn.session();

        return { conn, session }

    }

    /**
     * Executing ans returning an un-mutable results.
     * @param cypher - String with the cypher sentence to be executed
     * @param parameters - JSON object with the parameters to be used in substitution with the Cypher Sentence
     * @param options - optinal JSON object that contains 'conn' the driver connection, 'session' driver session, 'close' if both need to be closed at the end of the execution
     * @return an object or List of Objects of the fields
     */
    function execute(cypher, parameters, options){

        const { conn, session } = getConnAndSession(options);

        return new Promise((resolve, reject) => {

            session.run(cypher, parameters)
                .then( result => {

                    let toReturn = [];
                    result.records.forEach(v => {
                        toReturn.push(neo4jIntsToStrings(v._fields));
                        //toReturn.push(v._fields);
                    });

                    resolve(toReturn);

                })
                .catch(function(error) {
                    console.log(error);
                    reject(error);
                })
                .then(() =>{
                    if (options == null || options.close) session.close();
                })
                .then(() => {
                    if (options == null || options.close) conn.close();
                })

        })
    }


    /**
     * execute sentence and return it as a Promise
     * @param cypher - String with the cypher sentence to be executed
     * @param parameters - JSON object with the parameters to be used in substitution with the Cypher Sentence
     * @param options - optinal JSON object that contains 'conn' the driver connection, 'session' driver session, 'close' if both need to be closed at the end of the execution
     */
    async function executeAsPromise(cypher, parameters, options){

        const { conn, session } = getConnAndSession(options);

        return new Promise((resolve, reject) => {

            session.run(cypher, parameters)
                .then(neo4jIntsToStrings)
                .then( result => {
                    resolve(result.records);
                })
                .catch(function(error) {
                    console.log(error);
                    reject(error);
                })
                .then(() =>{
                    if (options == null || options.close) session.close();
                })
                .then(() => {
                    if (options == null || options.close) conn.close();
                })

        })
    }

    /**
     * Execute and return an Stream object for the results. Used for long results.
     * @param cypher - String with the cypher sentence to be executed
     * @param parameters  - JSON object with the parameters to be used in substitution with the Cypher Sentence
     * @param options - optinal JSON object that contains 'conn' the driver connection, 'session' driver session, 'close' if both need to be closed at the end of the execution
     * @returns {Stream.Readable}
     */
    function executeAsStream(cypher, parameters, options){

        const Stream = require('stream');
        const readableStream = new Stream.Readable();
        readableStream._read = function () {};

        const { conn, session } = getConnAndSession(options);
        session.run(cypher, parameters)
                    .subscribe({
                        onNext: function(record) {
                            //console.log(record);
                            readableStream.push(JSON.stringify(neo4jIntsToStrings(record)));
                        },
                        onCompleted: function() {
                            if (options == null || options.close) session.close();
                            if (options == null || options.close) conn.close();
                        },
                        onError: function(error) {
                            console.log(error)
                        }
                    });
       return readableStream;
    }


    /**
     * Execute Cypher sentences as a BATCH
     * @param queries - a List of objects with pair keys { cypher : '', parameters: '' } to be executed
     * @param options - optinal JSON object that contains 'conn' the driver connection, 'session' driver session, 'close' if both need to be closed at the end of the execution
     * @returns {boolean} if the batch was executed successfully
     */
    async function executeBatch(queries, options) {

        const {conn, session} = getConnAndSession( options );

        let tx = session.beginTransaction();

        return new Promise( (resolve, reject) => {
                for (let index = 0; index < queries.length; index++) {

                    tx.run( queries[index].cypher, queries[index].parameters )
                        .catch( e => {
                            throw 'Problem in QUERY [' + index + '] -> ' + e
                        } )
                }

                tx.commit()
                    .subscribe( {
                        onCompleted: function () {
                            session.close();
                            conn.close();
                            resolve( true ); // doesnt work..never returns true
                        }
                        ,onError: function (error) {
                            session.close();
                            conn.close();
                            reject( false );
                        }
                    } )

            })
            .then(() => { return true; })
            .catch((err) => {  return false; });

    }

    return model;
}
