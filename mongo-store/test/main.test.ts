import * as chai from "chai";
const should = chai.should();

import { json } from "body-parser";
import { ErrorRequestHandler, RequestHandler } from "express";
import * as express from "express";
import { Db, MongoClient } from "mongodb";
import * as agent from "superagent";

import { Operation, prepareOperation } from "../source/main";

describe("operation", () => {
    let database: Db;

    before(() => {
        return MongoClient.connect("mongodb://localhost:27017/database").then(db => database = db);
    });

    afterEach(() => {
        return database.dropDatabase();
    });

    after(() => {
        return database.close();
    });

    it("should fail if collection has not been specified", () => {
        const abstractOperation: Operation = { module: "mongo-store", collection: "" };
        return prepareOperation(abstractOperation)
            .then(() => Promise.reject("Expected failure"))
            .catch(error => {
                error.should.equal("mongo-store expected a collection");
            });
    });

    it("should fail if input is an array", () => {
        const abstractOperation: Operation = { module: "mongo-store", collection: "Boards", host: "localhost" };
        return prepareOperation(abstractOperation)
            .then(operation => {
                return new Promise((resolve, reject) => {
                    express()
                        .use(json())
                        .use(operation)
                        .use(errorHandler)
                        .listen(3030, function() {
                            const runningServer = this;

                            const boards = [{ name: "some-board" }];

                            agent.post("localhost:3030")
                                .send(boards)
                                .catch(error => error.response)
                                .then(response => {
                                    (operation as any).database.close();
                                    runningServer.close();

                                    response.text.should.equal("mongo-store cannot store arrays");
                                    resolve();
                                })
                                .catch(reject);
                        });
                });
            });
    });

    it("should store request.body in boards collection", () => {
        const abstractOperation: Operation = { module: "mongo-store", collection: "Boards", host: "localhost" };
        return prepareOperation(abstractOperation)
            .then(operation => {
                return new Promise((resolve, reject) => {
                    express()
                        .use(json())
                        .use(operation)
                        .listen(3030, function() {
                            const runningServer = this;

                            const board = { name: "some-board" };

                            agent.post("localhost:3030")
                                .send(board)
                                .catch(error => error.response)
                                .then(response => {
                                    (operation as any).database.close();
                                    runningServer.close();

                                    return database.collection("Boards").find({}, { _id: false }).toArray()
                                        .then((boards: any) => {
                                            boards.should.deep.equal([board]);
                                            resolve();
                                        });
                                })
                                .catch(reject);
                        });
                });
            });
    });

    it("should store resulting object in response.locals.boards", () => {
        const abstractOperation: Operation = { module: "mongo-store", collection: "Boards", host: "localhost" };
        return prepareOperation(abstractOperation)
            .then(operation => {
                return new Promise((resolve, reject) => {
                    express()
                        .use(json())
                        .use(operation)
                        .use(responseHandler)
                        .listen(3030, function() {
                            const runningServer = this;

                            const board = { name: "some-board" };

                            agent.post("localhost:3030")
                                .send(board)
                                .catch(error => error.response)
                                .then(response => {
                                    (operation as any).database.close();
                                    runningServer.close();

                                    response.body._id.should.be.a.string;

                                    delete response.body._id;
                                    response.body.should.deep.equal(board);
                                    resolve();
                                })
                                .catch(reject);
                        });
                });
            });
    });
});

const responseHandler: RequestHandler = (request, response, next) => {
    response.status(200).json(response.locals.boards);
};

const errorHandler: ErrorRequestHandler = (error, request, response, next) => {
    response.status(500).end(error.message);
};
