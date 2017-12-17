import * as agent from "superagent";

interface InspectedToken {
    app_id: string;
    type: string;
    application: string;
    expires_at: number;
    is_valid: boolean;
    scopes: string[];
    user_id: string;
}

export class Facebook {

    constructor(private appId: string, private appSecret: string) {}

    inspectToken(token: string): Promise<any> {
        return agent.get("https://graph.facebook.com/debug_token")
            .query({ input_token: token })
            .query({ access_token: `${this.appId}|${this.appSecret}` })
            .then(response => JSON.parse(response.text).data);
    }
}
