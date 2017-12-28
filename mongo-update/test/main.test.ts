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
        const abstractOperation: Operation = { module: "mongo-update", collection: null, query: null };
        return prepareOperation(abstractOperation, null)
            .then(() => Promise.reject("Expected failure"))
            .catch(error => error.should.equal("mongo-update expected a collection"));
    });

    it("should fail if query has not been specified", () => {
        const abstractOperation: Operation = { module: "mongo-update", collection: "some-collection", query: null };
        return prepareOperation(abstractOperation, null)
            .then(() => Promise.reject("Expected failure"))
            .catch(error => error.should.equal("mongo-update expected a query"));
    });

    it("should perform update", () => {
        const abstractOperation: Operation = { module: "mongo-update", collection: "Users", query: "queries/simple-query.json", host: "localhost" };
        return prepareOperation(abstractOperation, "test")
            .then(operation => {
                return new Promise((resolve, reject) => {
                    express()
                        .use(json())
                        .use(operation)
                        .listen(3030, function() {
                            const runningServer = this;

                            const user1 = {
                                _id: "some-id-1",
                                age: 1
                            };

                            const user2 = {
                                _id: "some-id-2",
                                age: 18
                            };

                            database.collection("Users").insert([user1, user2])
                                .then(() => agent.post("localhost:3030").catch(error => error.response))
                                .then(response => {
                                    (operation as any).database.close();
                                    runningServer.close();

                                    return database.collection("Users").find().toArray()
                                        .then((users: any) => {
                                            users[0].should.deep.equal({
                                                _id: "some-id-1",
                                                age: 2
                                            });
                                            users[1].should.deep.equal({
                                                _id: "some-id-2",
                                                age: 19
                                            });
                                            resolve();
                                        });
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
