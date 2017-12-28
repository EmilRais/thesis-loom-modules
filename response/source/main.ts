import { RequestHandler } from "express";

import { Evaluator } from "./evaluator";
const evaluator = new Evaluator();

export interface Operation {
    module: string;
    status: number;
    body: string;
}

export const prepareOperation = (operation: Operation) => {
    const status = operation.status;
    if ( !status ) return Promise.reject("response expected a status");
    if ( typeof status !== "number" ) return Promise.reject("response expected status to be a number");

    const body = operation.body;
    if ( !body ) return Promise.reject("response expected a body");

    return Promise.resolve<RequestHandler>((request, response, next) => {
        const returnValue = evaluator.evaluate(request, response, body);

        if ( !returnValue )
            return response.status(status).end();

        if ( returnValue.constructor === Array || returnValue === Object(returnValue) )
            return response.status(status).json(returnValue);

        return response.status(status).end(returnValue);
    });
};
