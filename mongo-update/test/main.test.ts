import * as chai from "chai";
const should = chai.should();

import { json } from "body-parser";
import { ErrorRequestHandler, RequestHandler } from "express";
import * as express from "express";
import { Db, MongoClient } from "mongodb";
import * as agent from "superagent";

import { AbstractOperation, prepareOperation } from "../source/main";

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
        const abstractOperation: AbstractOperation = { module: "mongo-update", collection: null, query: null };
        return prepareOperation(abstractOperation, null)
            .then(() => Promise.reject("Expected failure"))
            .catch(error => error.should.equal("mongo-update expected a collection"));
    });

    it("should fail if query has not been specified", () => {
        const abstractOperation: AbstractOperation = { module: "mongo-update", collection: "some-collection", query: null };
        return prepareOperation(abstractOperation, null)
            .then(() => Promise.reject("Expected failure"))
            .catch(error => error.should.equal("mongo-update expected a query"));
    });

    it("should perform update", () => {
        const abstractOperation: AbstractOperation = { module: "mongo-update", collection: "Users", query: "queries/simple-query.json", host: "localhost" };
        return prepareOperation(abstractOperation, "test")
            .then(operation => {
                return new Promise((resolve, reject) => {
                    express()
                        .use(json())
                        .use(operation)
                        .listen(3030, function() {
                            const runningServer = this;

                            const user = {
                                _id: "some-id",
                                age: 1
                            };
                            database.collection("Users").insert(user)
                                .then(() => agent.post("localhost:3030").catch(error => error.response))
                                .then(response => {
                                    (operation as any).database.close();
                                    runningServer.close();

                                    return database.collection("Users").find().toArray()
                                        .then((boards: any) => {
                                            boards.should.deep.equal([{
                                                _id: "some-id",
                                                age: 2
                                            }]);
                                            resolve();
                                        });
                                })
                                .catch(reject);
                        });
                });
            });
    });

    it("should store updated object in response.locals.boards", () => {
        const abstractOperation: AbstractOperation = { module: "mongo-update", collection: "Users", query: "queries/simple-query.json", host: "localhost" };
        return prepareOperation(abstractOperation, "test")
            .then(operation => {
                return new Promise((resolve, reject) => {
                    express()
                        .use(json())
                        .use(operation)
                        .use(responseHandler)
                        .listen(3030, function() {
                            const runningServer = this;

                            const user = {
                                _id: "some-id",
                                age: 1
                            };
                            database.collection("Users").insert(user)
                                .then(() => agent.post("localhost:3030").catch(error => error.response))
                                .then(response => {
                                    (operation as any).database.close();
                                    runningServer.close();

                                    response.body.should.deep.equal({ _id: "some-id", age: 2 });
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
