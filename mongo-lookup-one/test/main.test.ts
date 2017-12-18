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

    it("should fail if no document is found", () => {
        const abstractOperation: Operation = { module: "mongo-lookup-one", host: "localhost" };
        return prepareOperation(abstractOperation)
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
                                    response.status.should.equal(406);
                                    response.text.should.equal("Bruger ikke oprettet");
                                    resolve();
                                })
                                .catch(reject);
                        });
                });
            });
    });

    it("should update response.locals.boards if document is found", () => {
        const abstractOperation: Operation = { module: "mongo-lookup-one", host: "localhost" };
        return prepareOperation(abstractOperation)
            .then(operation => {
                return new Promise((resolve, reject) => {
                    express()
                        .use(json())
                        .use(operation)
                        .use(returnBoards())
                        .listen(3030, function() {
                            const runningServer = this;

                            const user = {
                                _id: "1",
                                credential: { userId: "user-id" }
                            };

                            database.collection("Users").insert(user).then(() => {
                                agent.post("localhost:3030")
                                    .send({ userId: "user-id" })
                                    .catch(error => error.response)
                                    .then(response => {
                                        (operation as any).database.close();
                                        runningServer.close();
                                        response.body.should.deep.equal(user);
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
