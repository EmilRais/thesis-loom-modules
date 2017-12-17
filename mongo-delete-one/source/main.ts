import { RequestHandler } from "express";
import { MongoClient } from "mongodb";

export interface AbstractOperation {
    module: string;
    collection: string;
    error: string;
    host?: string;
}

export const prepareOperation = (abstractOperation: AbstractOperation) => {
    const collection = abstractOperation.collection;
    if ( !collection ) return Promise.reject("mongo-delete-one expected a collection");

    const error = abstractOperation.error;
    if ( !error ) return Promise.reject("mongo-delete-one expected an error message");

    const host = abstractOperation.host || "mongo";

    return MongoClient.connect(`mongodb://${host}:27017/database`)
        .then(database => {
            const concreteOperation: RequestHandler = (request, response, next) => {
                const selector = { _id: request.params.id };
                database.collection(collection).remove(selector)
                    .then(status => {
                        if ( status.result.n === 0 )
                            return response.status(400).end(error);

                        next();
                    })
                    .catch(next);
            };

            (concreteOperation as any).database = database;

            return concreteOperation;
        });
};
