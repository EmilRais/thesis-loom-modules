import { RequestHandler } from "express";
import * as fs from "fs";
import { MongoClient, ObjectId } from "mongodb";
import { resolve as resolvePath } from "path";

import { Evaluator } from "./evaluator";
const evaluator = new Evaluator();

export interface Operation {
    module: string;
    collection: string;
    query: string;
    host?: string;
}

interface Query {
    selector: any;
    update: any;
}

export const prepareOperation = (operation: Operation, context: string) => {
    const collection = operation.collection;
    if ( !collection ) return Promise.reject("mongo-update expected a collection");

    const query = operation.query;
    if ( !query ) return Promise.reject("mongo-update expected a query");
    const queryPath = resolvePath(context, query);
    const queryObject = JSON.parse(fs.readFileSync(queryPath).toString());

    const host = operation.host || "mongo";

    return MongoClient.connect(`mongodb://${host}:27017/database`)
        .then(database => {
            const attachDatabaseForTesting = (handler: RequestHandler) => {
                (handler as any).database = database;
                return handler;
            };

            return Promise.resolve<RequestHandler>((request, response, next) => {
                const actualQuery: Query = evaluator.evaluate(request, response, queryObject);
                const options = { multi: true };

                database.collection(collection).update(actualQuery.selector, actualQuery.update, options)
                    .then(result => next())
                    .catch(next);

            }).then(attachDatabaseForTesting);
        });
};
