import * as chai from "chai";
const should = chai.should();

import { Evaluator } from "../source/evaluator";

describe("Evaluator", () => {
    const evaluator: Evaluator = new Evaluator();

    describe("evaluateString", () => {
        it("string with number should become number", () => {
            evaluator.evaluateString(null, null, "42").should.equal(42);
        });

        it("string with quoted string should become string", () => {
            evaluator.evaluateString(null, null, "'something'").should.equal("something");
        });

        it("string with variable name should become variable's value", () => {
            const response = { locals: {} as any };
            response.locals.someVariable = "some-value";

            evaluator.evaluateString(null, response, "response.locals.someVariable").should.equal("some-value");
        });
    });

    describe("evaluateArray", () => {
        it("each item should be evaluated", () => {
            const response = { locals: {} as any };
            response.locals.someVariable = "some-value";

            const array = [true, 42, "42", "response.locals.someVariable"];
            const expectedArray = [true, 42, 42, "some-value"];
            evaluator.evaluateArray(null, response, array).should.deep.equal(expectedArray);
        });
    });

    describe("evaluateObject", () => {
        it("each leaf should be evaluated", () => {
            const response = { locals: {} as any };
            response.locals.someVariable = "some-value";

            const object = {
                boolean: true,
                number: 42,
                string: "42",
                variable: "response.locals.someVariable"
            };

            const expectedObject = {
                boolean: true,
                number: 42,
                string: 42,
                variable: "some-value"
            };
            evaluator.evaluateObject(null, response, object).should.deep.equal(expectedObject);
        });
    });

    describe("evaluate", () => {
        it("boolean should become boolean", () => {
            evaluator.evaluate(null, null, true).should.be.true;
        });

        it("number should become number", () => {
            evaluator.evaluate(null, null, 42).should.equal(42);
        });

        it("string should be evaluated with variables available", () => {
            const response = { locals: {} as any };
            response.locals.someVariable = "some-value";

            evaluator.evaluate(null, response, "response.locals.someVariable").should.equal("some-value");
        });

        it("array should be evaluated with variables available", () => {
            const response = { locals: {} as any };
            response.locals.someVariable = "some-value";

            const array = [true, 42, "42", "response.locals.someVariable"];
            const expectedArray = [true, 42, 42, "some-value"];
            evaluator.evaluate(null, response, array).should.deep.equal(expectedArray);
        });

        it("object should be evaluated with variables available", () => {
            const response = { locals: {} as any };
            response.locals.someVariable = "some-value";

            const object = {
                boolean: true,
                number: 42,
                string: "42",
                variable: "response.locals.someVariable"
            };

            const expectedObject = {
                boolean: true,
                number: 42,
                string: 42,
                variable: "some-value"
            };
            evaluator.evaluate(null, response, object).should.deep.equal(expectedObject);
        });
    });
});
