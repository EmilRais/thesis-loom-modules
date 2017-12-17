import * as chai from "chai";
const should = chai.should();

import * as agent from "superagent";

import { Facebook } from "../source/facebook";

describe("Facebook", () => {
    let userToken: string;

    before(() => {
        return agent.get("https://graph.facebook.com/1092068880930122/accounts/test-users")
            .query({ access_token: "1092068880930122|470f440e050eb59788e7178c86ca982f" })
            .then(response => {
                const data = JSON.parse(response.text).data[0];
                userToken = data.access_token;
            });
    });

    describe("inspectToken", () => {
        it("should fail if invalid credentials", () => {
            const facebook = new Facebook("invalid-app-id", "invalid-secret");
            return facebook.inspectToken(userToken)
                .catch(error => error.response)
                .then(response => {
                    response.status.should.equal(400);
                    response.text.should.include("Invalid OAuth access token signature.");
                });
        });

        it("should fail if no token", () => {
            const facebook = new Facebook("1092068880930122", "470f440e050eb59788e7178c86ca982f");
            return facebook.inspectToken(null)
                .catch(error => error.response)
                .then(response => {
                    response.status.should.equal(400);
                    response.text.should.include("The parameter input_token is required");
                });
        });

        it("should return inspected token if invalid token", () => {
            const facebook = new Facebook("1092068880930122", "470f440e050eb59788e7178c86ca982f");
            return facebook.inspectToken("invalid-token")
                .then(inspectedToken => {
                    inspectedToken.is_valid.should.be.false;
                });
        });

        it("should return inspected token if valid token", () => {
            const facebook = new Facebook("1092068880930122", "470f440e050eb59788e7178c86ca982f");
            return facebook.inspectToken(userToken)
                .then(inspectedToken => {
                    inspectedToken.is_valid.should.be.true;
                });
        });
    });

});
