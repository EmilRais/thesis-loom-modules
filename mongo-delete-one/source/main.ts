import { RequestHandler } from "express";
import * as fs from "fs";
import { MongoClient } from "mongodb";
import { resolve as resolvePath } from "path";

import { Evaluator } from "./evaluator";
const evaluator = new Evaluator();

export interface Operation {
    module: string;
    collection: string;
    selection: string;
    error: number;
    errorMessage: string;
    host?: string;
}

export const prepareOperation = (operation: Operation, context: string) => {
    const collection = operation.collection;
    if ( !collection ) return Promise.reject("mongo-delete-one expected a collection");

    const selection = operation.selection;
    if ( !selection ) return Promise.reject("mongo-delete-one expected a selection");
    const selectionPath = resolvePath(context, selection);
    const selectionObject = JSON.parse(fs.readFileSync(selectionPath).toString());

    const error = operation.error;
    if ( !error ) return Promise.reject("mongo-delete-one expected an error code");
    if ( typeof error !== "number" ) return Promise.reject("mongo-delete-one expected error code to be a number");

    const errorMessage = operation.errorMessage;
    if ( !errorMessage && errorMessage !== "" ) return Promise.reject("mongo-delete-one expected an error message");

    const host = operation.host || "mongo";

    return MongoClient.connect(`mongodb://${host}:27017/database`)
        .then(database => {
            const attachDatabaseForTesting = (handler: RequestHandler) => {
                (handler as any).database = database;
                return handler;
            };

            return Promise.resolve<RequestHandler>((request, response, next) => {
                const selector = evaluator.evaluate(request, response, selectionObject);
                database.collection(collection).remove(selector)
                    .then(status => {
                        if ( status.result.n === 0 )
                            return response.status(error).end(errorMessage);

                        next();
                    })
                    .catch(next);
            }).then(attachDatabaseForTesting);
        });
};
