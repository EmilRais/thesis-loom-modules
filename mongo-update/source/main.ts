import { RequestHandler } from "express";
import * as fs from "fs";
import { MongoClient, ObjectId } from "mongodb";
import { resolve as resolvePath } from "path";

import { Evaluator } from "./evaluator";
const evaluator = new Evaluator();

export interface AbstractOperation {
    module: string;
    collection: string;
    query: string;
    host?: string;
}

interface Query {
    selector: any;
    update: any;
}

export const prepareOperation = (abstractOperation: AbstractOperation, context: string) => {
    const collection = abstractOperation.collection;
    if ( !collection ) return Promise.reject("mongo-update expected a collection");

    const query = abstractOperation.query;
    if ( !query ) return Promise.reject("mongo-update expected a query");
    const queryPath = resolvePath(context, query);
    const queryObject = JSON.parse(fs.readFileSync(queryPath).toString());

    const host = abstractOperation.host || "mongo";

    return MongoClient.connect(`mongodb://${host}:27017/database`)
        .then(database => {

            const concreteOperation: RequestHandler = (request, response, next) => {
                const actualQuery: Query = evaluator.evaluate(request, response, queryObject);
                const options = { returnOriginal: false };

                database.collection(collection).findOneAndUpdate(actualQuery.selector, actualQuery.update, options)
                    .then(result => {
                        response.locals.boards = result.value;
                        next();
                    })
                    .catch(next);
            };

            (concreteOperation as any).database = database;

            return concreteOperation;
        });
};
