import { RequestHandler } from "express";
import { MongoClient, ObjectId } from "mongodb";

export interface AbstractOperation {
    module: string;
    collection: string;
    host?: string;
}

export const prepareOperation = (abstractOperation: AbstractOperation) => {
    const collection = abstractOperation.collection;
    if ( !collection ) return Promise.reject("mongo-store expected a collection");

    const host = abstractOperation.host || "mongo";

    return MongoClient.connect(`mongodb://${host}:27017/database`)
        .then(database => {

            const concreteOperation: RequestHandler = (request, response, next) => {
                if ( request.body instanceof Array ) return next(new Error("mongo-store cannot store arrays"));

                const document = Object.assign({}, request.body);
                document._id = new ObjectId().toHexString();

                database.collection(collection).insert(document)
                    .then(() => {
                        response.locals.boards = document;
                        next();
                    })
                    .catch(next);
            };

            (concreteOperation as any).database = database;

            return concreteOperation;
        });
};
