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

interface ExtendedToken {
    access_token: string;
    token_type: string;
    expires_in: number;
}

export class Facebook {

    constructor(private appId: string, private appSecret: string) {}

    inspectToken(token: string): Promise<InspectedToken> {
        return agent.get("https://graph.facebook.com/debug_token")
            .query({ input_token: token })
            .query({ access_token: `${this.appId}|${this.appSecret}` })
            .then(response => JSON.parse(response.text).data);
    }

    extendToken(token: string): Promise<ExtendedToken> {
        return agent.get("https://graph.facebook.com/oauth/access_token")
            .query({ grant_type: "fb_exchange_token" })
            .query({ client_id: this.appId })
            .query({ client_secret: this.appSecret })
            .query({ fb_exchange_token: token })
            .then(response => JSON.parse(response.text));
    }
}
