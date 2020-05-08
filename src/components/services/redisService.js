const { promisify } = require("util");
const redis = require("redis");

module.exports = class RedisService {
    constructor() {
        this._promise = new Promise((resolve, reject) =>{

            const redisClient = redis.createClient();
            redisClient.getAsync = promisify(redisClient.get).bind(redisClient);
            redisClient.setAsync = promisify(redisClient.set).bind(redisClient);
            redisClient.delAsync = promisify(redisClient.del).bind(redisClient);
            redisClient.on("error", (error) => {
                console.error(error);
                reject(error);
            });
            resolve(redisClient);
        });
    }

    async start(services) {
    }

    async promise() {
        return this._promise;
    }
}
