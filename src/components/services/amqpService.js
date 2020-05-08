
const amqp = require('amqplib/callback_api');
module.exports = class AMQPService {
    constructor() {
        this._promise = new Promise((resolve, reject) => {
            amqp.connect('amqp://localhost', (err, connection) => {
                if(err) {
                    console.error(`AMPQ ERROR: ${err}`);
                    reject(err);
                }

                this._connection = connection;
                resolve(connection);
            });
        });
    }

    async start(services) {
    }

    async promise() {
        return this._promise;
    }
}
