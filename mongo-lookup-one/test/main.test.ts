import * as chai from "chai";
const should = chai.should();

import { json } from "body-parser";
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
        const abstractOperation: Operation = { module: "mongo-lookup-one", collection: null, query: null, error: null, errorMessage: null, host: "localhost" };
        return prepareOperation(abstractOperation, "test")
            .then(() => Promise.reject("Expected failure"))
            .catch(error => error.should.equal("mongo-lookup-one expected a collection"));
    });

    it("should fail if query has not been specified", () => {
        const abstractOperation: Operation = { module: "mongo-lookup-one", collection: "items", query: null, error: null, errorMessage: null, host: "localhost" };
        return prepareOperation(abstractOperation, "test")
            .then(() => Promise.reject("Expected failure"))
            .catch(error => error.should.equal("mongo-lookup-one expected a query"));
    });

    it("should fail if error has not been specified", () => {
        const abstractOperation: Operation = { module: "mongo-lookup-one", collection: "items", query: "queries/some-query.json", error: null, errorMessage: null, host: "localhost" };
        return prepareOperation(abstractOperation, "test")
            .then(() => Promise.reject("Expected failure"))
            .catch(error => error.should.equal("mongo-lookup-one expected an error code"));
    });

    it("should fail if error is not a number", () => {
        const abstractOperation: Operation = { module: "mongo-lookup-one", collection: "items", query: "queries/some-query.json", error: "500" as any, errorMessage: null, host: "localhost" };
        return prepareOperation(abstractOperation, "test")
            .then(() => Promise.reject("Expected failure"))
            .catch(error => error.should.equal("mongo-lookup-one expected error code to be a number"));
    });

    it("should fail if error message has not been specified", () => {
        const abstractOperation: Operation = { module: "mongo-lookup-one", collection: "items", query: "queries/some-query.json", error: 500, errorMessage: "", host: "localhost" };
        return prepareOperation(abstractOperation, "test")
            .then(() => Promise.reject("Expected failure"))
            .catch(error => error.should.equal("mongo-lookup-one expected an error message"));
    });

    it("should fail with error code if no document is found", () => {
        const abstractOperation: Operation = { module: "mongo-lookup-one", collection: "items", query: "queries/some-query.json", error: 500, errorMessage: null, host: "localhost" };
        return prepareOperation(abstractOperation, "test")
            .then(operation => {
                return new Promise((resolve, reject) => {
                    express()
                        .use(json())
                        .use(operation)
                        .listen(3030, function() {
                            const runningServer = this;
                            agent.post("localhost:3030")
                                .send({ userId: "unknown-user-id" })
                                .catch(error => error.response)
                                .then(response => {
                                    (operation as any).database.close();
                                    runningServer.close();
                                    response.status.should.equal(500);
                                    resolve();
                                })
                                .catch(reject);
                        });
                });
            });
    });

    it("should fail with no error message if error message is null and no document is found", () => {
        const abstractOperation: Operation = { module: "mongo-lookup-one", collection: "items", query: "queries/some-query.json", error: 500, errorMessage: null, host: "localhost" };
        return prepareOperation(abstractOperation, "test")
            .then(operation => {
                return new Promise((resolve, reject) => {
                    express()
                        .use(json())
                        .use(operation)
                        .listen(3030, function() {
                            const runningServer = this;
                            agent.post("localhost:3030")
                                .send({ userId: "unknown-user-id" })
                                .catch(error => error.response)
                                .then(response => {
                                    (operation as any).database.close();
                                    runningServer.close();
                                    response.text.should.equal("");
                                    resolve();
                                })
                                .catch(reject);
                        });
                });
            });
    });

    it("should fail with specified error message if no document is found", () => {
        const abstractOperation: Operation = { module: "mongo-lookup-one", collection: "items", query: "queries/some-query.json", error: 500, errorMessage: "'some' + ' ' + 'message'", host: "localhost" };
        return prepareOperation(abstractOperation, "test")
            .then(operation => {
                return new Promise((resolve, reject) => {
                    express()
                        .use(json())
                        .use(operation)
                        .listen(3030, function() {
                            const runningServer = this;
                            agent.post("localhost:3030")
                                .send({ userId: "unknown-user-id" })
                                .catch(error => error.response)
                                .then(response => {
                                    (operation as any).database.close();
                                    runningServer.close();
                                    response.text.should.equal("some message");
                                    resolve();
                                })
                                .catch(reject);
                        });
                });
            });
    });

    it("should place found document in response.locals.boards", () => {
        const abstractOperation: Operation = { module: "mongo-lookup-one", collection: "items", query: "queries/some-query.json", error: 500, errorMessage: null, host: "localhost" };
        return prepareOperation(abstractOperation, "test")
            .then(operation => {
                return new Promise((resolve, reject) => {
                    express()
                        .use(json())
                        .use(operation)
                        .use(returnBoards())
                        .listen(3030, function() {
                            const runningServer = this;

                            const user1 = {
                                _id: "id-1",
                                credential: { userId: "user-id-1" }
                            };

                            const user2 = {
                                _id: "id-2",
                                credential: { userId: "user-id-2" }
                            };

                            database.collection("items").insert([user1, user2]).then(() => {
                                agent.post("localhost:3030")
                                    .send({ userId: "user-id-2" })
                                    .catch(error => error.response)
                                    .then(response => {
                                        (operation as any).database.close();
                                        runningServer.close();
                                        response.body.should.deep.equal(user2);
                                        resolve();
                                    })
                                    .catch(reject);
                            });
                        });
                });
            });
    });
});

const returnBoards: () => RequestHandler = () => {
    return (request, response, next) => {
        const boards = response.locals.boards;
        response.status(200).json(boards);
    };
};
