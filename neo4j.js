"use strict";
//
// Castellon.CH (c)
// Author: Antonio Castellon - antonio@castellon.ch
//
// based in Driver from Neo4j-driver JS official
//

const neo4j = require('neo4j-driver');

module.exports = function(config) {

  const model = {};

  function getConnection() {
    return neo4j.driver(
      config.NEO4J_URL,
      neo4j.auth.basic(config.NEO4J_USER, config.NEO4J_PASSWORD),
      { maxTransactionRetryTime: 30000 }
    );
  }

  model.getConnection = getConnection;
  model.execute = execute;
  model.executeAsPromise = executeAsPromise;
  model.executeAsStream = executeAsStream;
  model.executeBatch = executeBatch;

  const neo4jIntsToStrings = (json) => {
    if (json == null) return '';
    const pluckAndModify = (isMatch, transformValue) =>
      Object.entries(json)
        .filter(isMatch)
        .reduce((acc, [key, value]) => ({ ...acc, [key]: transformValue(value) }), {});
    return Object.assign(
      json,
      pluckAndModify(([, value]) => typeof value === 'object', neo4jIntsToStrings),
      pluckAndModify(([, value]) => neo4j.isInt(value), value => parseInt(value.toString())),
      pluckAndModify(([, value]) => /^\d+\.\d+$/.test(value), value => parseFloat(value))
    );
  };

  function getConnAndSession(options) {
    const conn = (options != null && options.conn) ? options.conn : getConnection();
    const session = (options != null && options.session) ? options.session : conn.session();
    return { conn, session };
  }

  function execute(cypher, parameters, options){
    const { conn, session } = getConnAndSession(options);
    return new Promise((resolve, reject) => {
      session.run(cypher, parameters)
        .then( result => {
          let toReturn = [];
          result.records.forEach(v => {
            toReturn.push(neo4jIntsToStrings(v._fields));
          });
          resolve(toReturn);
        })
        .catch(error => { console.log(error); reject(error); })
        .then(() => { if (!options || options.close) session.close(); })
        .then(() => { if (!options || options.close) conn.close(); });
    });
  }

  async function executeAsPromise(cypher, parameters, options){
    const { conn, session } = getConnAndSession(options);
    return new Promise((resolve, reject) => {
      session.run(cypher, parameters)
        .then( result => {
          // transform records
          const transformed = result.records.map(r => neo4jIntsToStrings(r._fields));
          resolve(transformed);
        })
        .catch(error => { console.log(error); reject(error); })
        .then(() => { if (!options || options.close) session.close(); })
        .then(() => { if (!options || options.close) conn.close(); });
    });
  }

  function executeAsStream(cypher, parameters, options){
    const Stream = require('stream');
    const readableStream = new Stream.Readable();
    readableStream._read = function () {};

    const { conn, session } = getConnAndSession(options);
    session.run(cypher, parameters)
      .subscribe({
        onNext: function(record) {
          readableStream.push(JSON.stringify(neo4jIntsToStrings(record)));
        },
        onCompleted: function() {
          if (!options || options.close) session.close();
          if (!options || options.close) conn.close();
        },
        onError: function(error) { console.log(error); }
      });
    return readableStream;
  }

  async function executeBatch(queries, options) {
    const {conn, session} = getConnAndSession( options );
    let tx = session.beginTransaction();

    return new Promise( (resolve, reject) => {
      for (let index = 0; index < queries.length; index++) {
        tx.run( queries[index].cypher, queries[index].parameters )
          .catch( e => { throw 'Problem in QUERY [' + index + '] -> ' + e; } );
      }
      tx.commit()
        .subscribe( {
          onCompleted: function () {
            session.close();
            conn.close();
            resolve( true );
          },
          onError: function (error) {
            session.close();
            conn.close();
            reject( false );
          }
        } );
    })
    .then(() => true)
    .catch(() => false);
  }

  return model;
};
