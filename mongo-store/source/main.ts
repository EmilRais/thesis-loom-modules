import { RequestHandler } from "express";
import { MongoClient, ObjectId } from "mongodb";

export interface Operation {
    module: string;
    collection: string;
    host?: string;
}

export const prepareOperation = (operation: Operation) => {
    const collection = operation.collection;
    if ( !collection ) return Promise.reject("mongo-store expected a collection");

    const host = operation.host || "mongo";

    return MongoClient.connect(`mongodb://${host}:27017/database`)
        .then(database => {
            const attachDatabaseForTesting = (handler: RequestHandler) => {
                (handler as any).database = database;
                return handler;
            };

            return Promise.resolve<RequestHandler>((request, response, next) => {
                if ( request.body instanceof Array ) return next(new Error("mongo-store cannot store arrays"));

                const document = Object.assign({}, request.body);
                document._id = new ObjectId().toHexString();

                database.collection(collection).insert(document)
                    .then(() => {
                        response.locals.boards = document;
                        next();
                    })
                    .catch(next);
            }).then(attachDatabaseForTesting);
        });
};
