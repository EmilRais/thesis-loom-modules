import * as chai from "chai";
const should = chai.should();

import { json } from "body-parser";
import { ErrorRequestHandler, RequestHandler } from "express";
import * as express from "express";
import { Server } from "http";
import * as agent from "superagent";

import { AbstractOperation, prepareOperation } from "../source/main";

describe("operation", () => {
    let userToken: string;

    before(() => {
        return agent.get("https://graph.facebook.com/1092068880930122/accounts/test-users")
            .query({ access_token: "1092068880930122|470f440e050eb59788e7178c86ca982f" })
            .then(response => {
                const data = JSON.parse(response.text).data[0];
                userToken = data.access_token;
            });
    });

    it("should fail if no user token", () => {
        const abstractOperation: AbstractOperation = { module: "facebook-inspect" };
        return prepareOperation(abstractOperation)
            .then(operation => {
                return new Promise((resolve, reject) => {
                    express()
                        .use(json())
                        .use(operation)
                        .use(errorHandler())
                        .listen(3030, function() {
                            const runningServer: Server = this;
                            agent.post("localhost:3030")
                                .send({ token: null })
                                .catch(error => error.response)
                                .then(response => {
                                    runningServer.close();
                                    response.status.should.equal(500);
                                    response.text.should.include("The parameter input_token is required");
                                    resolve();
                                })
                                .catch(reject);
                        });
                });
            });
    });

    it("should store inspected user token", () => {
        const abstractOperation: AbstractOperation = { module: "facebook-inspect" };
        return prepareOperation(abstractOperation)
            .then(operation => {
                return new Promise((resolve, reject) => {
                    express()
                        .use(json())
                        .use(operation)
                        .use(returnBoards())
                        .listen(3030, function() {
                            const runningServer: Server = this;
                            agent.post("localhost:3030")
                                .send({ token: userToken })
                                .catch(error => error.response as any)
                                .then(response => {
                                    runningServer.close();
                                    response.status.should.equal(200);
                                    response.body.is_valid.should.be.true;
                                    resolve();
                                })
                                .catch(reject);
                        });
                });
            });
    });
});

const errorHandler: () => ErrorRequestHandler = () => {
    return (error, request, response, next) => {
        response.status(500).json(error);
    };
};

const returnBoards: () => RequestHandler = () => {
    return (request, response, next) => {
        response.status(200).json(response.locals.boards);
    };
};
