"use strict";
/** 
 * GLOBAL VARIABLES
 */

const helper = require('./helper');
let history = []; //latest 100 message
const clients = []; //list of currently connected clients

// websocket and http servers
const webSocketServer = require('websocket').server;
const http = require('http');
const fs = require('fs');


// Array with some colors
const colors = ['red', 'green', 'blue', 'magenta', 'purple', 'plum', 'orange'];

// ... in random order
colors.sort(function (a, b) {
    return Math.random() > 0.5;
});

// Optional. You will see this name in eg. 'ps' or 'top' command
process.title = 'node-chat';

// Port where we'll run the websocket server
const webSocketsServerPort = 1337;
/**
 * HTTP server
 */
const server = http.createServer(function (request, response) {
    // Not important for us. We're writing WebSocket server,
    // not HTTP server
});

server.listen(webSocketsServerPort, function () {
    console.log((new Date()) + " Server is listening on port " + webSocketsServerPort);
});

/** 
 * WebSocket Server
 */
const wsServer = new webSocketServer({
    httpServer: server
});

//This callback function is called every time someone tries to connect to the WebSocket server
wsServer.on('request', function (request) {
    console.log((new Date()) + ' Connection from origin ' + request.origin + ' . ');

    // accept connection - you should check 'request.origin' to
    // make sure that client is connecting from your websire
    // (http://en.wikipedia.org/wiki/Same_origin_policy)
    const connection = request.accept(null, request.origin);
    // we need to know client index to remove them on 'close' event
    let index = clients.push(connection) - 1;
    let userName = false;
    let userColor = false;

    console.log((new Date()) + ' Connection accepted.');

    //send back chat history
    if (history.lenght > 0) {
        connection.sendUTF(
            JSON.stringify({
                type: 'history',
                data: history
            })
        );
    }

    //User sent some message
    connection.on('message', function (message) {
        if (message.type === 'utf8') {
            //accept only text
            //first message sent by user is their name

            if (userName === false) {
                //remember user name
                userName = helper.htmlEntities(message.utf8Data);

                // get random color and send it back to the user
                userColor = colors.shift();

                connection.sendUTF(
                    JSON.stringify({
                        type: 'color',
                        data: userColor
                    })
                );
                console.log(
                    (new Date()) + ' User is known as: ' + userName +
                    ' with ' + userColor + ' color.'
                );
            } else {
                //log and broadcast the message
                console.log((new Date()) + ' Received Message from ' +
                    userName + ': ' + message.utf8Data
                );

                //we want to keep history of all sent messages
                let obj = {
                    time: (new Date()).getTime(),
                    text: helper.htmlEntities(message.utf8Data),
                    author: userName,
                    color: userColor
                };
                history.push(obj);
                history = history.slice(-100);

                // broadcast message to all connected clients
                let json = JSON.stringify({
                    type: 'message',
                    data: obj
                });

                for (let i = 0; i < clients.length; i++) {
                    clients[i].sendUTF(json);
                }
            }
        }
    });

    // user dissconnected
    connection.on('close', function (connection) {
        if (userName !== false && userColor !== false) {
            console.log((new Date()) +
                " Peer " +
                connection.remoteAddress +
                " disconnected.");

            // remove user from the list of connected clients
            clients.splice(index, 1);

            // push back user's color to be reused bu another user
            colors.push(userColor);
        }
    });
});