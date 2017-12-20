import { RequestHandler } from "express";
import { MongoClient } from "mongodb";

export interface Operation {
    module: string;
    collection: string;
    error: string;
    host?: string;
}

export const prepareOperation = (operation: Operation) => {
    const collection = operation.collection;
    if ( !collection ) return Promise.reject("mongo-delete-one expected a collection");

    const error = operation.error;
    if ( !error ) return Promise.reject("mongo-delete-one expected an error message");

    const host = operation.host || "mongo";

    return MongoClient.connect(`mongodb://${host}:27017/database`)
        .then(database => {
            const attachDatabaseForTesting = (handler: RequestHandler) => {
                (handler as any).database = database;
                return handler;
            };

            return Promise.resolve<RequestHandler>((request, response, next) => {
                const selector = { _id: request.params.id };
                database.collection(collection).remove(selector)
                    .then(status => {
                        if ( status.result.n === 0 )
                            return response.status(400).end(error);

                        next();
                    })
                    .catch(next);
            }).then(attachDatabaseForTesting);
        });
};
