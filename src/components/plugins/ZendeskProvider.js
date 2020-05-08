module.exports = async function zendeskProvider(services) {
    const amqpClient = await services.amqp();
    const expressApp = await services.express();
    const redisClient = await services.redis();
    const zendeskClient = await services.zendesk();
    console.log(amqpClient);

    amqpClient.createChannel(function(error1, amqpChannel) {
        if (error1) {
            console.error(error1);
            throw error1;
        }
        amqpChannel.assertExchange('zendesk:ticket_event', 'direct', { durable: false });
        
        expressApp.get('/zd/ticket/create', (req, res) => handleZendeskTicketUpdateWebhook(req, res, 'create'));
        expressApp.get('/zd/ticket/update', (req, res) => handleZendeskTicketUpdateWebhook(req, res, 'update'));
        
        function handleZendeskTicketUpdateWebhook(req, res, event) {
            const zdTicketId = req.body.ticketId;
            res.sendStatus(200).end();
            if (zdTicketId === undefined) return;
            zendeskClient.tickets.show(zdTicketId, (err, req, zdTicket) => {
                if (err) { console.error(err); return; }
                redisClient.set(`zendesk:ticket:${zdTicketId}`, zdTicket, () => {
                    amqpChannel.publish(`zendesk:ticket_event`, event, Buffer.from(zdTicketId));
                });
            });
        }
    });
}
