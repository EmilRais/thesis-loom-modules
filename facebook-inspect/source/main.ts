import { RequestHandler } from "express";

import { Facebook } from "./facebook";

export interface Operation {
    module: string;
}

export const prepareOperation = (operation: Operation) => {
    const appId = "1092068880930122";
    const appSecret = "470f440e050eb59788e7178c86ca982f";
    const facebook = new Facebook(appId, appSecret);

    return Promise.resolve<RequestHandler>((request, response, next) => {
        const userToken = request.body.token;
        facebook.inspectToken(userToken)
            .then(inspectedToken => response.locals.boards = inspectedToken)
            .then(() => next())
            .catch(next);
    });
};
