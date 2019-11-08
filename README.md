# neo4j

A Simplified interface to Neo4j database using the official neo4j-driver library

#### configuration 

saved for example as 'config.neo4j.js' 

    module.exports = {
    
        NEO4J_URL: 'bolt://127.0.0.1:11002'
        ,NEO4J_USER: 'neo4j'
        ,NEO4J_PASSWORD: 'neo4j2019'
        // ,NEO4J_DATABASE: '<database_name>'  // available in the future in v4.0
        ,TRACES : true
    }
    
#### usage:

    const config    = require('./config.neo4j.js');
    const db        = require('@acastellon/neo4j')(config);

#### methods


##### Executing and returning an un-mutable results.
     
    execute(cypher, parameters [, options])  
    
         * @param cypher - String with the cypher sentence to be executed
         * @param parameters - JSON object with the parameters to be used in substitution with the Cypher Sentence
         * @param options - optional JSON object that contains the connection and the session (generated automatically if it's null)
         * @return an object or List of Objects of the fields

##### Execute the sentence and returns a Promise         
    
    executeAsPromise(cypher, parameters [, options])
    
         * @param cypher - String with the cypher sentence to be executed
         * @param parameters - JSON object with the parameters to be used in substitution with the Cypher Sentence
         * @param options - optional JSON object that contains the connection and the session (generated automatically if it's null)
     
##### Execute and return an Stream object for the results. Used for long results.
    
    executeAsStream(cypher, parameters [, options])
    
         * @param cypher - String with the cypher sentence to be executed
         * @param parameters  - JSON object with the parameters to be used in substitution with the Cypher Sentence
         * @param options - optional JSON object that contains the connection and the session (generated automatically if it's null)
         * @returns {Stream.Readable}
      
##### Execute Cypher sentences as a BATCH
         
    executeBatch(queries [,options]);    
      
         * @param queries - a List of objects with pair keys { cypher : '', parameters: '' } to be executed
         * @param options - optional JSON object that contains the connection and the session (generated automatically if it's null)
         * @returns {boolean} if the batch was executed successfully