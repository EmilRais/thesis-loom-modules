import * as chai from "chai";
const should = chai.should();

import { RequestHandler } from "express";
import * as express from "express";
import { Db, MongoClient } from "mongodb";
import * as agent from "superagent";

import { Operation, prepareOperation } from "../source/main";

describe("operation", () => {
    let database: Db;

    before(() => {
        return MongoClient.connect("mongodb://localhost:27017/database").then(db => database = db);
    });

    after(() => {
        database.close();
    });

    it("should fail if collection has not been specified", () => {
        const abstractOperation: Operation = { module: "mongo-lookup", collection: null, query: null };
        return prepareOperation(abstractOperation, "test")
            .then(() => Promise.reject("Expected failure"))
            .catch(error => error.should.equal("mongo-lookup expected a collection"));
    });

    it("should fail if query has not been specified", () => {
        const abstractOperation: Operation = { module: "mongo-lookup", collection: "items", query: null };
        return prepareOperation(abstractOperation, "test")
            .then(() => Promise.reject("Expected failure"))
            .catch(error => error.should.equal("mongo-lookup expected a query"));
    });

    it("should update response.locals.boards if boards collection is empty", () => {
        const abstractOperation: Operation = { module: "mongo-lookup", collection: "items", query: "queries/some-query.json", host: "localhost" };
        return prepareOperation(abstractOperation, "test")
            .then(operation => {
                return new Promise((resolve, reject) => {
                    express()
                        .use(operation)
                        .use(returnBoards)
                        .listen(3030, function() {
                            const runningServer = this;
                            agent.get("localhost:3030")
                                .catch(error => error.response)
                                .then(response => {
                                    (operation as any).database.close();
                                    runningServer.close();
                                    response.body.should.deep.equal([]);
                                    resolve();
                                })
                                .catch(reject);
                        });
                });
            });
    });

    it("should update response.locals.boards if boards collection is not empty", () => {
        const abstractOperation: Operation = { module: "mongo-lookup", collection: "items", query: "queries/some-query.json", host: "localhost" };
        return prepareOperation(abstractOperation, "test")
            .then(operation => {
                return new Promise((resolve, reject) => {
                    express()
                        .use(operation)
                        .use(returnBoards)
                        .listen(3030, function() {
                            const runningServer = this;

                            const item1 = { _id: "id-1", color: "red" };
                            const item2 = { _id: "id-2", color: "green" };
                            const item3 = { _id: "id-3", color: "red" };

                            database.collection("items").insert([item1, item2, item3]).then(() => {
                                agent.get("localhost:3030")
                                    .catch(error => error.response)
                                    .then(response => {
                                        (operation as any).database.close();
                                        runningServer.close();
                                        response.body.should.deep.equal([item1, item3]);
                                        resolve();
                                    })
                                    .catch(reject);
                            });
                        });
                });
            });
    });
});

const returnBoards: RequestHandler = (request, response, next) => {
    const boards = response.locals.boards;
    response.status(200).json(boards);
};
