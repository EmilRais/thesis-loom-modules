import { RequestHandler } from "express";
import { MongoClient } from "mongodb";

export interface Operation {
    module: string;
    collection: string;
    host?: string;
}

export const prepareOperation = (operation: Operation) => {
    const collection = operation.collection;
    if ( !collection ) return Promise.reject("mongo-lookup expected a collection");

    const host = operation.host || "mongo";

    return MongoClient.connect(`mongodb://${host}:27017/database`)
        .then(database => {
            const attachDatabaseForTesting = (handler: RequestHandler) => {
                (handler as any).database = database;
                return handler;
            };

            return Promise.resolve<RequestHandler>((request, response, next) => {
                database.collection(collection).find().toArray()
                    .then(boards => {
                        response.locals.boards = boards;
                        next();
                    })
                    .catch(next);
            }).then(attachDatabaseForTesting);
        });
};
