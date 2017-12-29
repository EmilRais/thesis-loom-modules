import { RequestHandler } from "express";

import { Evaluator } from "./evaluator";
import { Facebook } from "./facebook";

const evaluator = new Evaluator();

export interface Operation {
    module: string;
    token: string;
}

export const prepareOperation = (operation: Operation) => {
    const appId = "1092068880930122";
    const appSecret = "470f440e050eb59788e7178c86ca982f";
    const facebook = new Facebook(appId, appSecret);

    const token = operation.token;
    if ( !token ) return Promise.reject("facebook-inspect expected a token");

    return Promise.resolve<RequestHandler>((request, response, next) => {
        const userToken = evaluator.evaluate(request, response, token);
        facebook.inspectToken(userToken)
            .then(inspectedToken => response.locals.boards = inspectedToken)
            .then(() => next())
            .catch(next);
    });
};
