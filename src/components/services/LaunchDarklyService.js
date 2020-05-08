const LaunchDarkly = require('launchdarkly-node-server-sdk');

module.exports = class LaunchDarklyService {
    constructor() {
        this._promise = new Promise((resolve, reject) => {
            this._resolve = resolve;
        });
    }

    async start(services) {
        const redisClient = await services.redis();

        this._ldClient = LaunchDarkly.init("YOUR_SDK_KEY");
        this._ldClient.on('ready', this._resolve);
        this._ldClient.on('update', async (settings) => {
            redisClient.set(`ldclient:${settings.key}:flag_settings`, settings, () => {});
        });

        this._ldClient.variations = async function(flagKey) {
            let settings = await new Promise((done) => {
                redisClient.get(`plugin:zd_ticket_distributor:flag_settings`, settings, (err, settings) => {
                    done(settings);
                });
            });

            return settings.variations;
        }

        this._ldClient.distribution = async function distribution(flagKey, user, fallback) {
            let settings = await new Promise((done) => {
                redisClient.get(`plugin:zd_ticket_distributor:flag_settings`, settings, (err, settings) => {
                    done(settings);
                });
            });
            let details = await this.variationDetail(flagKey, user, fallback);

            var reason = detail.reason;
            let result = null;
            switch(reason.kind) {
                case "PREREQUISITE_FAILED":
                    console.log("prereq failed: " + reason.prerequisiteKey);
                case "OFF":
                    result = {variation: result.settings.offVariation};
                    break;
                case "ERROR":
                    console.log("error: " + reason.errorKind);
                    result = {variation: fallback};
                    break;
                case "TARGET_MATCH":
                    console.log("ALERT! EVERYTHING IS BROKEN! DO NOT INDIVIDUALLY TARGET USERS! THIS USECASE IS AWKWARD AND THAT DOESN'T MAKE SENSE HERE!");
                    // Let the queue fill up until the humans fix this in the dashboard...
                    // DON'T channel.ack(msg);
                    result = {variation: fallback};
                    return;
                case "FALLTHROUGH":
                    console.log("fell through");
                    result = settings.fallthrough;
                    break;
                case "RULE_MATCH":
                    console.log("matched rule " + reason.ruleIndex + ", "  + reason.ruleId);
                    result = settings.rules[ruleId];
                    break;
            }

            let distribution = {};
            if (result.variation) {
                distribution[result.variation] = 10000;
            } else if (result.rollout) {
                for(let rollout of result.rollout) {
                    distribution[settings.variations[rollout.variation]] = rollout.weight;
                }
            }

            return distribution;
        }
    }

    async promise() {
        await this._promise;
        return this._ldClient;
    }
}
