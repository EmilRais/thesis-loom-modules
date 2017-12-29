import { RequestHandler } from "express";
import * as fs from "fs";
import { MongoClient } from "mongodb";
import { resolve as resolvePath } from "path";

import { Evaluator } from "./evaluator";
const evaluator = new Evaluator();

export interface Operation {
    module: string;
    collection: string;
    query: string;
    error: number;
    errorMessage: string;
    host?: string;
}

interface Query {
    selector: any;
}

export const prepareOperation = (operation: Operation, context: string) => {
    const collection = operation.collection;
    if ( !collection ) return Promise.reject("mongo-lookup-one expected a collection");

    const query = operation.query;
    if ( !query ) return Promise.reject("mongo-lookup-one expected a query");
    const queryPath = resolvePath(context, query);
    const queryObject = JSON.parse(fs.readFileSync(queryPath).toString());

    const error = operation.error;
    if ( !error ) return Promise.reject("mongo-lookup-one expected an error code");
    if ( typeof error !== "number" ) return Promise.reject("mongo-lookup-one expected error code to be a number");

    const errorMessage = operation.errorMessage;
    if ( !errorMessage && errorMessage !== null ) return Promise.reject("mongo-lookup-one expected an error message");

    const host = operation.host || "mongo";

    return MongoClient.connect(`mongodb://${host}:27017/database`)
        .then(database => {
            const attachDatabaseForTesting = (handler: RequestHandler) => {
                (handler as any).database = database;
                return handler;
            };

            return Promise.resolve<RequestHandler>((request, response, next) => {
                const actualErrorMessage: string = errorMessage ? evaluator.evaluate(request, response, errorMessage) : null;
                const actualQuery: Query = evaluator.evaluate(request, response, queryObject);
                database.collection(collection).findOne(actualQuery.selector)
                    .then(user => {
                        if ( !user ) return response.status(error).end(actualErrorMessage);
                        response.locals.boards = user;
                        next();
                    })
                    .catch(next);
            }).then(attachDatabaseForTesting);
        });
};
