const express = require('express');

module.exports = class ExpressService {
    constructor() {
        this._promise = new Promise((resolve, reject) => {
            const expressApp = express();
            expressApp.listen(3000, () => {
                resolve(expressApp);
            });
        });
    }

    async start(services) {
    }

    async promise() {
        return this._promise;
    }
}
