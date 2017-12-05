
var restify = require('restify');
var builder = require('botbuilder');

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});

// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});

// Listen for messages from users 
server.post('/api/messages', connector.listen());
var bot = new builder.UniversalBot(connector, (session) => session.beginDialog('greetings') );


// Install a custom recognizer to look for user saying 'help' or 'goodbye'.
bot.recognizer({
  recognize: function (context, done) {
  var intent = { score: 0.0 };

        if (context.message.text) {
            switch (context.message.text.toLowerCase()) {
                case 'issue':
                    intent = { score: 1.0, intent: 'Ticket' };
                    break;

                case 'help':
                    intent = { score: 1.0, intent: 'Help' };
                    break;
                
                case 'goodbye':
                    intent = { score: 1.0, intent: 'Goodbye' };
                    break;
            }
        }
        done(null, intent);
    }
});

// Add a help dialog with a trigger action that is bound to the 'Help' intent
bot.dialog('helpDialog', function (session) {
    session.endDialog("This bot will echo back anything you say.Say 'issue' to mock up a ticket. Say 'goodbye' to quit. Say 'help' to get this.");
}).triggerAction({ matches: 'Help' });

bot.dialog('greetings', [
    // Step 1
    function (session) {
        builder.Prompts.text(session, 'Hi! What is your Employee ID number?');
    },
    // Step 2
    function (session, results) {
        session.endDialog(`Hello ${results.response}!`);
    }
]);

// Add a help dialog with a trigger action that is bound to the 'Help' intent
bot.dialog('ticketDialog', [
    function (session) {
        session.send("Let start creating a ticket for you.");
        builder.Prompts.time(session, "When did the problem happen?");
    },
    function (session, results) {
        session.dialogData.eventTime = builder.EntityRecognizer.resolveTime([results.response]);
        builder.Prompts.time(session, "When is a convenient time to contact you?");
    },    
    function (session, results) {
        session.dialogData.contactTime = builder.EntityRecognizer.resolveTime([results.response]);
        builder.Prompts.text(session, "What is your contact phone number to call you on?");
    },
    function (session, results) {
        session.dialogData.contactNumber = results.response;
        builder.Prompts.text(session, "What is the problem?");
    },    
    function (session, results) {
        session.dialogData.description = results.response;        
        var ticketData = {
            eventTime: session.dialogData.eventTime,
            contactTime: session.dialogData.contactTime,
            contactNumber: session.dialogData.contactNumber,
            description: session.dialogData.description,
        }

        // Process request and display details
        session.sendTyping();

        //@Todo immediately send .then() show response (simulated with a timeout for now)
        // https://developers.freshdesk.com/api/#tickets

        setTimeout(function () {
            // Confirm
            session.send('Here is your ticket.');
            // session.send(JSON.stringify(ticketData));
            var ticketCard = new builder.Message(session)
                                .addAttachment({
                                    contentType: "application/vnd.microsoft.card.adaptive",
                                    content: {
                                        type: "AdaptiveCard",
                                        speak: "<s>Your ticket about the issue \"Global warming\" <break strength='weak'/> has been created</s><s>The helpdesk will look into it and contact you.</s>",
                                           body: [
                                                {
                                                    "type": "TextBlock",
                                                    "text": "Ticket " + Math.floor((Math.random() * 100) + 1),
                                                    "size": "large",
                                                    "weight": "bolder"
                                                },
                                                {
                                                    "type": "TextBlock",
                                                    "text": "Issue occurred"
                                                },
                                                {
                                                    "type": "TextBlock",
                                                    "text": ticketData.eventTime.toString()
                                                },
                                                {
                                                    "type": "TextBlock",
                                                    "text": "We'll call you around"
                                                },
                                                {
                                                    "type": "TextBlock",
                                                    "text": ticketData.eventTime.toString()
                                                },                                                
                                            ],
                                            "actions": [
                                                 {
                                                    "type": "Action.Http",
                                                    "method": "POST",
                                                    "url": "http://foo.com",
                                                    "title": "View"
                                                }
                                            ]
                                    }
                                });
            session.send(ticketCard);
            session.endDialog();
        }, 3000);
    }

]).triggerAction({ matches: 'Ticket' });

// Add a global endConversation() action that is bound to the 'Goodbye' intent
bot.endConversationAction('goodbyeAction', "Ok... See you later.", { matches: 'Goodbye' });

