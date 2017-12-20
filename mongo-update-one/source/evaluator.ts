export class Evaluator {
    evaluate(request: any, response: any, value: any): any {
        switch ( typeof value ) {
            case "boolean": return value;
            case "number": return value;
            case "string": return this.evaluateString(request, response, value);
        }

        if ( value instanceof Array )
            return this.evaluateArray(request, response, value);

        return this.evaluateObject(request, response, value);
    }

    evaluateObject(request: any, response: any, value: any): any {
        const object: any = {};

        Object.keys(value).forEach(key => {
            object[key] = this.evaluate(request, response, value[key]);
        });

        return object;
    }

    evaluateArray(request: any, response: any, value: any[]): any[] {
        return value.map(item => this.evaluate(request, response, item));
    }

    evaluateString(request: any, response: any, value: string): any {
        return eval(value);
    }
}
