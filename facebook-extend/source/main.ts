import { RequestHandler } from "express";

import { Facebook } from "./facebook";

export interface AbstractOperation {
    module: string;
}

export const prepareOperation = (abstractOperation: AbstractOperation) => {
    const appId = "1092068880930122";
    const appSecret = "470f440e050eb59788e7178c86ca982f";
    const facebook = new Facebook(appId, appSecret);

    const concreteOperation: RequestHandler = (request, response, next) => {
        const userToken = request.body.token;
        facebook.extendToken(userToken)
            .then(extendedToken => response.locals.boards = extendedToken.access_token)
            .then(() => next())
            .catch(next);
    };

    return Promise.resolve(concreteOperation);
};
