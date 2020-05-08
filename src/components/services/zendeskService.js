const zendesk = require('node-zendesk');

module.exports = class ZendeskService {
    constructor() {
        this._zendeskClient = zendesk.createClient({
            username:  process.env.ZD_USERNAME,
            token:     process.env.ZD_TOKEN,
            remoteUri: 'https://launchdarklysupport.zendesk.com/api/v2',
        });
    }
    start() {}
    promise() {
        return this._zendeskClient;
    }
}
