import * as chai from "chai";
const should = chai.should();

import { RequestHandler } from "express";
import * as express from "express";

import { Db, MongoClient } from "mongodb";
import * as agent from "superagent";

import { AbstractOperation, prepareOperation } from "../source/main";

describe("operation", () => {
    let database: Db;

    before(() => {
        return MongoClient.connect("mongodb://localhost:27017/database").then(db => database = db);
    });

    after(() => {
        database.close();
    });

    it("should fail if collection has not been specified", () => {
        const abstractOperation: AbstractOperation = { module: "mongo-delete-one", collection: null, error: null, host: "localhost" };
        return prepareOperation(abstractOperation)
            .then(operation => {
                (operation as any).database.close();
                return Promise.reject("Expected failure");
            })
            .catch(error => {
                error.should.equal("mongo-delete-one expected a collection");
            });
    });

    it("should fail if error has not been specified", () => {
        const abstractOperation: AbstractOperation = { module: "mongo-delete-one", collection: "items", error: null, host: "localhost" };
        return prepareOperation(abstractOperation)
            .then(operation => {
                (operation as any).database.close();
                return Promise.reject("Expected failure");
            })
            .catch(error => {
                error.should.equal("mongo-delete-one expected an error message");
            });
    });

    it("should fail deleting document that does not exist", () => {
        const abstractOperation: AbstractOperation = { module: "mongo-delete-one", collection: "items", error: "some-error-message", host: "localhost" };
        return prepareOperation(abstractOperation)
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
        const abstractOperation: AbstractOperation = { module: "mongo-delete-one", collection: "items", error: "some-error-message", host: "localhost" };
        return prepareOperation(abstractOperation)
            .then(operation => {
                return new Promise((resolve, reject) => {
                    express()
                        .use("/:id", operation)
                        .use(success)
                        .listen(3030, function() {
                            const runningServer = this;

                            const document = { _id: "some-id" };
                            database.collection("items").insert(document).then(() => {
                                agent.post("localhost:3030/some-id")
                                    .catch(error => error.response)
                                    .then(response => {
                                        (operation as any).database.close();
                                        runningServer.close();

                                        response.status.should.equal(200);
                                        resolve();
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
