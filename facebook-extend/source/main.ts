import { RequestHandler } from "express";

import { Evaluator } from "./evaluator";
import { Facebook } from "./facebook";

const evaluator = new Evaluator();

export interface Operation {
    module: string;
    token: string;
    output: string;
}

export const prepareOperation = (operation: Operation) => {
    const appId = "1092068880930122";
    const appSecret = "470f440e050eb59788e7178c86ca982f";
    const facebook = new Facebook(appId, appSecret);

    const token = operation.token;
    if ( !token ) return Promise.reject("facebook-extend expected a token");

    const output = operation.output;
    if ( !output ) return Promise.reject("facebook-extend expected an output variable");

    return Promise.resolve<RequestHandler>((request, response, next) => {
        const userToken = evaluator.evaluate(request, response, token);
        facebook.extendToken(userToken)
            .then(extendedToken => eval(`${output} = extendedToken.access_token`))
            .then(() => next())
            .catch(next);
    });
};
