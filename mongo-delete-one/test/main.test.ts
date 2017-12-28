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
        const abstractOperation: Operation = { module: "mongo-delete-one", collection: null, query: null, error: null, errorMessage: null, host: "localhost" };
        return prepareOperation(abstractOperation, "test")
            .then(operation => {
                (operation as any).database.close();
                return Promise.reject("Expected failure");
            })
            .catch(error => {
                error.should.equal("mongo-delete-one expected a collection");
            });
    });

    it("should fail if selection has not been specified", () => {
        const abstractOperation: Operation = { module: "mongo-delete-one", collection: "items", query: null, error: null, errorMessage: null, host: "localhost" };
        return prepareOperation(abstractOperation, "test")
            .then(operation => {
                (operation as any).database.close();
                return Promise.reject("Expected failure");
            })
            .catch(error => {
                error.should.equal("mongo-delete-one expected a query");
            });
    });

    it("should fail if error has not been specified", () => {
        const abstractOperation: Operation = { module: "mongo-delete-one", collection: "items", query: "queries/simple-query.json", error: null, errorMessage: null, host: "localhost" };
        return prepareOperation(abstractOperation, "test")
            .then(operation => {
                (operation as any).database.close();
                return Promise.reject("Expected failure");
            })
            .catch(error => {
                error.should.equal("mongo-delete-one expected an error code");
            });
    });

    it("should fail if error is not a number", () => {
        const abstractOperation: Operation = { module: "mongo-delete-one", collection: "items", query: "queries/simple-query.json", error: "500" as any, errorMessage: null, host: "localhost" };
        return prepareOperation(abstractOperation, "test")
            .then(operation => {
                (operation as any).database.close();
                return Promise.reject("Expected failure");
            })
            .catch(error => {
                error.should.equal("mongo-delete-one expected error code to be a number");
            });
    });

    it("should fail if error message has not been specified", () => {
        const abstractOperation: Operation = { module: "mongo-delete-one", collection: "items", query: "queries/simple-query.json", error: 500, errorMessage: null, host: "localhost" };
        return prepareOperation(abstractOperation, "test")
            .then(operation => {
                (operation as any).database.close();
                return Promise.reject("Expected failure");
            })
            .catch(error => {
                error.should.equal("mongo-delete-one expected an error message");
            });
    });

    it("should fail deleting document that does not exist", () => {
        const abstractOperation: Operation = { module: "mongo-delete-one", collection: "items", query: "queries/simple-query.json", error: 400, errorMessage: "some-error-message", host: "localhost" };
        return prepareOperation(abstractOperation, "test")
            .then(operation => {
                return new Promise((resolve, reject) => {
                    express()
                        .use("/:id", operation)
                        .listen(3030, function() {
                            const runningServer = this;
                            agent.post("localhost:3030/some-id")
                                .catch(error => error.response)
                                .then(response => {
                                    (operation as any).database.close();
                                    runningServer.close();

                                    response.status.should.equal(400);
                                    response.text.should.equal("some-error-message");
                                    resolve();
                                })
                                .catch(reject);
                        });
                });
            });
    });

    it("should succeed deleting document that does exist", () => {
        const abstractOperation: Operation = { module: "mongo-delete-one", collection: "items", query: "queries/simple-query.json", error: 500, errorMessage: "some-error-message", host: "localhost" };
        return prepareOperation(abstractOperation, "test")
            .then(operation => {
                return new Promise((resolve, reject) => {
                    express()
                        .use("/:id", operation)
                        .use(success)
                        .listen(3030, function() {
                            const runningServer = this;

                            const document1 = { _id: "some-id-1" };
                            const document2 = { _id: "some-id-2" };
                            database.collection("items").insert([document1, document2]).then(() => {
                                agent.post("localhost:3030/some-id-1")
                                    .catch(error => error.response)
                                    .then(response => {
                                        (operation as any).database.close();
                                        runningServer.close();

                                        return database.collection("items").find().toArray()
                                            .then(items => {
                                                items.length.should.equal(1);
                                                resolve();
                                            });
                                    })
                                    .catch(reject);
                            });
                        });
                });
            });
    });
});

const success: RequestHandler = (request, response, next) => {
    response.status(200).end();
};
