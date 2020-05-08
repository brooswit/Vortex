let services = {};
let servicePromises = {}
let plugins = {};

addService('amqp');
addService('express');
addService('LaunchDarkly');
addService('redis');
addService('zendesk');

addPlugin('ZendeskProvider');
addPlugin('TicketDistributor');

start();

function addService(serviceName) {
    console.log(`Adding service ${serviceName}`);
    const service = new (require(`./components/services/${serviceName}Service`))();
    services[serviceName] = service;
    servicePromises[serviceName] = service.promise;
}

function addPlugin(pluginName) {
    console.log(`Adding plugin ${pluginName}`);
    plugins[pluginName] = require(`./components/plugins/${pluginName}`);
}

async function start() {
    for(serviceName in services) {
        const service = services[serviceName];
        console.log(`Starting service ${serviceName}`);
        service.start(servicePromises);
    }
    for(pluginName in plugins) {
        const plugin = plugins[pluginName];
        console.log(`Starting plugin ${pluginName}`);
        plugin(servicePromises);
    }
}
