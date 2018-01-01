import * as chai from "chai";
const should = chai.should();

import { json } from "body-parser";
import { ErrorRequestHandler, RequestHandler } from "express";
import * as express from "express";
import { Server } from "http";
import * as agent from "superagent";

import { Operation, prepareOperation } from "../source/main";

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

    it("should fail if token has not been specified", () => {
        const abstractOperation: Operation = { module: "facebook-extend", token: null, output: null };
        return prepareOperation(abstractOperation)
            .then(() => Promise.reject("Expected failure"))
            .catch(error => error.should.equal("facebook-extend expected a token"));
    });

    it("should fail if output variable has not been specified", () => {
        const abstractOperation: Operation = { module: "facebook-extend", token: "token", output: null };
        return prepareOperation(abstractOperation)
            .then(() => Promise.reject("Expected failure"))
            .catch(error => error.should.equal("facebook-extend expected an output variable"));
    });

    it("should fail if no user token", () => {
        const abstractOperation: Operation = { module: "facebook-extend", token: "response.locals.void", output: "output" };
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
                                .send({ token: userToken })
                                .catch(error => error.response)
                                .then(response => {
                                    runningServer.close();
                                    response.status.should.equal(500);
                                    response.text.should.include("fb_exchange_token parameter not specified");
                                    resolve();
                                })
                                .catch(reject);
                        });
                });
            });
    });

    it("should store inspected user token", () => {
        const abstractOperation: Operation = { module: "facebook-extend", token: "request.body.token", output: "response.locals.value" };
        return prepareOperation(abstractOperation)
            .then(operation => {
                return new Promise((resolve, reject) => {
                    express()
                        .use(json())
                        .use(operation)
                        .use(returnValue())
                        .listen(3030, function() {
                            const runningServer: Server = this;
                            agent.post("localhost:3030")
                                .send({ token: userToken })
                                .catch(error => error.response as any)
                                .then(response => {
                                    runningServer.close();
                                    response.status.should.equal(200);

                                    const extendedToken: string = response.text;
                                    extendedToken.should.be.string;
                                    extendedToken.length.should.be.greaterThan(160);
                                    extendedToken.length.should.be.lessThan(200);
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

const returnValue: () => RequestHandler = () => {
    return (request, response, next) => {
        response.status(200).json(response.locals.value);
    };
};
