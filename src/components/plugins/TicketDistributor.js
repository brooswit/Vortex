module.exports = async function ticketDistributor(services) {
    const ldClient = await services.LaunchDarkly();
    const redisClient = await services.redis();
    const amqpClient = await services.amqp();
    const zendeskClient = await services.zendesk();

    ldClient.on('update', async (settings) => {
        if (settings.key === 'ticket-distribution') {
            redisClient.set(`plugin:zd_ticket_distributor:flag_settings`, settings, () => {});
        }
    });
    
    amqpClient.createChannel(function(error1, amqpChannel) {
        amqpChannel.prefetch(1);
        amqpChannel.assertQueue(`zd_tickets_to_distribute`, { durable: true });
        amqpChannel.bindQueue('zd_tickets_to_distribute', 'zendesk:ticket_event', '');
        amqpChannel.consume(`zd_tickets_to_distribute`, consumeZDTicketsToDistribute);
    }, { noAck: false });

    function consumeZDTicketsToDistribute(msg) {
        const zdTicketId = msg.content;
        // check if ticket is cahced, fetch the ticket, do the thing
        redisClient.get(`zendesk:ticket:${zdTicketId}`, (err, zdTicket) => {
            if (err) { console.error(err); return; }
            if (zdTicket) { distributeTicket(zdTicket); return; }
            zendeskClient.tickets.show(zdTicketId, (err, req, zdTicket) => {
                if (err) { console.error(err); return; }
                redisClient.set(`zendesk:ticket:${zdTicketId}`, zdTicket, () => {
                    distributeTicket(zdTicket);
                });
            });
        });
    }

    async function distributeTicket(zdTicket) {
        console.log(`handling ticket distribution for: ${zdTicket.id}`);

        if(zdTicket.assignee_id !== null) return;
        if(zdTicket.group_id && zdTicket.group_id !== SUPPORT_GROUP_ID) return;

        let assigneeId = -1;
        let capacitors = {};
        try {
            capacitors = JSON.parse(await new Promise((done)=>{
                redisClient.get( `plugin:zd_ticket_distributor:agent_capacitors`, function(err, result) {
                    done(result);
                });
            }));
        } catch(e) {}

        capacitors = typeof capacitors === "string" ? {} : capacitors || {};
        capacitors[assigneeId] = capacitors[assigneeId] || 0;

        let weights = {}
        weights[-1] = await ldClient.distribution(`ticket-distribution`, {
                key: -1, custom: { currentTime: Date.now() }
            })[-1].weight;
        weights[0] = await ldClient.distribution(`ticket-distribution`, {
                key: 0, custom: { currentTime: Date.now() }
            })[0].weight;
        for (let agentId of settings.variations) {
            weights[agentId] = (await ldClient.distribution(`ticket-distribution`, {
                key: agentId,
                name: zdUser.name,
                custom: {
                    currentTime: Date.now()
                }
            }))[settings.variations.indexOf(agentId)].weight;
        }

        for (let agentId of agentIds) {
            let weight = weights[agentId];
            capacitors[agentId] = capacitors[agentId] || 0;
            capacitors[agentId] = weight === 0 ? 0 : capacitors[agentId] + weight;
            if(capacitors[agentId] > capacitors[assigneeId]) {
                assigneeId = agentId;
            }
        }

        capacitors[assigneeId] = 0;

        await new Promise((done)=>{
            redisClient.set(`plugin:zd_ticket_distributor:agent_capacitors`, JSON.stringify(capacitors), done);
        });

        if(assigneeId === -1) return;
        if(assigneeId === 0) return;

        await new Promise((done) => {
            zendeskClient.tickets.update(zdTicket.id, {
                ticket: {
                    assignee_id: assigneeId
                }
            }, (err, req, result) => {
                if (err) console.log(err);
                done(result);
            });
        });

        channel.ack(msg);
    }
}
