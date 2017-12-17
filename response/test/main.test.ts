import * as chai from "chai";
const should = chai.should();

import { RequestHandler } from "express";
import * as express from "express";
import { Server } from "http";
import * as agent from "superagent";

import { Operation, prepareOperation } from "../source/main";

describe("operation", () => {

    it("should fail if status is missing", () => {
        const abstractOperation: Operation = { module: "response", status: null };
        return prepareOperation(abstractOperation)
            .then(() => Promise.reject("Expected failure"))
            .catch(error => {
                error.should.equal("response expected a status");
            });
    });

    it("should fail if status is not a number", () => {
        const abstractOperation: Operation = { module: "response", status: "200" as any };
        return prepareOperation(abstractOperation)
            .then(() => Promise.reject("Expected failure"))
            .catch(error => {
                error.should.equal("response expected status to be a number");
            });
    });

    it("should return the specified status", () => {
        const abstractOperation: Operation = { module: "response", status: 200 };
        return prepareOperation(abstractOperation)
            .then(operation => {
                return new Promise((resolve, reject) => {
                    express()
                        .use(operation)
                        .listen(3030, function() {
                            const runningServer: Server = this;
                            agent.get("localhost:3030")
                                .catch(error => error.response)
                                .then(response => {
                                    runningServer.close();
                                    response.status.should.equal(200);
                                    resolve();
                                })
                                .catch(reject);
                        });
                });
            });
    });

    it("should return response.locals.boards as json", () => {
        const boards = [
            { name: "board1" },
            { name: "board2" }
        ];

        const abstractOperation: Operation = { module: "response", status: 200 };
        return prepareOperation(abstractOperation)
            .then(operation => {
                return new Promise((resolve, reject) => {
                    express()
                        .use(updateBoards(boards))
                        .use(operation)
                        .listen(3030, function() {
                            const runningServer: Server = this;
                            agent.get("localhost:3030")
                                .catch(error => error.response)
                                .then(response => {
                                    runningServer.close();
                                    response.body.should.deep.equal(boards);
                                    resolve();
                                })
                                .catch(reject);
                        });
                });
            });
    });
});

const updateBoards: (value: any) => RequestHandler = (boards) => {
    return (request, response, next) => {
        response.locals.boards = boards;
        next();
    };
};
