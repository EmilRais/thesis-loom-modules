import { RequestHandler } from "express";
import { MongoClient } from "mongodb";

export interface AbstractOperation {
    module: string;
    host?: string;
}

export const prepareOperation = (abstractOperation: AbstractOperation) => {
    const host = abstractOperation.host || "mongo";

    return MongoClient.connect(`mongodb://${host}:27017/database`)
        .then(database => {

            const concreteOperation: RequestHandler = (request, response, next) => {
                const id = request.body.userId;
                database.collection("Users").findOne({ "credential.userId": id })
                    .then(user => {
                        if ( !user ) return response.status(406).end("Bruger ikke oprettet");
                        response.locals.boards = user;
                        next();
                    })
                    .catch(next);
            };

            (concreteOperation as any).database = database;

            return concreteOperation;
        });
};
