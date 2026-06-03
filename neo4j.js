"use strict";
//
// Castellon.CH (c)
// Author: Antonio Castellon - antonio@castellon.ch
//
// based in Driver from Neo4j-driver JS official
//

const neo4j = require('neo4j-driver');

/**
 * Neo4j driver wrapper factory.
 *
 * Provides a simplified interface over the official neo4j-driver (v5+).
 * Handles connection, session management, result transformation (Neo4j integers to JS primitives),
 * and common execution patterns (promise, stream, batch).
 *
 * @param {object} config
 * @param {string} config.NEO4J_URL - e.g. 'bolt://127.0.0.1:7687'
 * @param {string} config.NEO4J_USER
 * @param {string} config.NEO4J_PASSWORD
 * @param {boolean} [config.TRACES]
 * @returns {{getConnection: Function, execute: Function, executeAsPromise: Function, executeAsStream: Function, executeBatch: Function}}
 */
module.exports = function(config) {

  const model = {};

  /**
   * Returns a new driver instance (for advanced reuse of connections/sessions).
   * Caller is responsible for closing.
   *
   * @returns {neo4j.Driver}
   */
  function getConnection()
  {
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

  /**
   * Recursively transforms Neo4j Integer objects and some numeric strings into native JS numbers/strings.
   * Used internally for all result transformation.
   * @private
   */
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

  /**
   * Internal helper to obtain (or reuse) a driver connection and session.
   * @private
   * @param {object} [options]
   * @param {neo4j.Driver} [options.conn]
   * @param {neo4j.Session} [options.session]
   */
  function getConnAndSession(options) {
    const conn = (options != null && options.conn)? options.conn : getConnection();
    const session = (options != null && options.session)? options.session : conn.session();
    return { conn, session };
  }

  /**
   * Execute a Cypher query and return transformed results.
   * Neo4j integers are converted to JS numbers/strings (recursively).
   *
   * @param {string} cypher
   * @param {object} parameters
   * @param {object} [options] - {conn, session, close: boolean}
   * @returns {Promise<Array>} array of transformed record fields
   */
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
        .catch(function(error) {
          console.log(error);
          reject(error);
        })
        .then(() =>{
          if (options == null || options.close) session.close();
        })
        .then(() => {
          if (options == null || options.close) conn.close();
        });
    });
  }

  /**
   * Async version of execute (same transformation).
   *
   * @param {string} cypher
   * @param {object} parameters
   * @param {object} [options]
   * @returns {Promise<Array>}
   */
  async function executeAsPromise(cypher, parameters, options){
    const { conn, session } = getConnAndSession(options);
    return new Promise((resolve, reject) => {
      session.run(cypher, parameters)
        .then( result => {
          const transformed = result.records.map(r => neo4jIntsToStrings(r._fields));
          resolve(transformed);
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
        });
    });
  }

  /**
   * Stream results as a Readable stream (each record JSON stringified after transform).
   * Useful for very large result sets.
   *
   * @param {string} cypher
   * @param {object} parameters
   * @param {object} [options]
   * @returns {Readable}
   */
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
          if (options == null || options.close) session.close();
          if (options == null || options.close) conn.close();
        },
        onError: function(error) {
          console.log(error);
        }
      });
    return readableStream;
  }

  /**
   * Execute multiple queries inside a single transaction (batch).
   * Note: current implementation resolves after commit subscription.
   *
   * @param {Array<{cypher:string, parameters:object}>} queries
   * @param {object} [options]
   * @returns {Promise<boolean>} true on success
   */
  async function executeBatch(queries, options) {
    const {conn, session} = getConnAndSession( options );
    let tx = session.beginTransaction();

    return new Promise( (resolve, reject) => {
      for (let index = 0; index < queries.length; index++) {
        tx.run( queries[index].cypher, queries[index].parameters )
          .catch( e => { throw 'Problem in QUERY [' + index + '] -> ' + e; });
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