import { RequestHandler } from "express";

export interface Operation {
    module: string;
    status: number;
}

export const prepareOperation = (operation: Operation) => {
    const status = operation.status;
    if ( !status ) return Promise.reject("response expected a status");
    if ( typeof status !== "number" ) return Promise.reject("response expected status to be a number");

    return Promise.resolve<RequestHandler>((request, response, next) => {
        const boards = response.locals.boards;
        return response.status(status).json(boards);
    });
};
