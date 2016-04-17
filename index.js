(function wrapper() {
    var WebSocketServer = require('ws').Server,
        http = require('http'),
        port = process.env.PORT || 5000,
        redirectUrl = process.env.REDIRECT_URL,
        expectedOrigin = process.env.EXPECTED_ORIGIN;

    var server = http.createServer(function requestListener(request, response) {
        /* just redirect */
        response.writeHead(302, {
            Location: redirectUrl
        });
        response.end();
    });
    server.listen(port);
    console.log('http server listening on %d', port);

    var wsServer = new WebSocketServer({
        server: server,
        verifyClient: function verifyClient(info) {
            return expectedOrigin === info.origin;
        }
    }),
        groups = {},
        printableGroups = {},
        counter = 0;

    wsServer.on('connection', function socketDidConnect(socket) {
        console.log('socket ' + (++counter) + ' connected');

        function addSocketToGroup(groupId) {

            /* create the group if it does not yet exist */
            if (!(groupId in groups)) {
                groups[groupId] = [];
                printableGroups[groupId] = [];
            }

            /* add the socket to the group */
            groups[groupId].push(socket);
            printableGroups[groupId].push(counter);

            console.log('groupAdd: ' + JSON.stringify(printableGroups));
        }

        function removeSocketFromGroups() {
            var i, len, groupId, member;

            for (groupId in groups) {
                for (i = 0, len = groups[groupId].length; i < len; i++) {
                    member = groups[groupId][i];
                    if (member === socket) {

                        /* remove the member from the group */
                        groups[groupId].splice(i, 1);
                        printableGroups[groupId].splice(i, 1);

                        /* remove the group if it is now empty */
                        if (groups[groupId].length === 0) {
                            delete groups[groupId];
                            delete printableGroups[groupId];
                        }
                        break;
                    }
                }
            }

            console.log('groupDel: ' + JSON.stringify(printableGroups));
        }

        /* each message is considered to be a group join. */
        socket.on('message', function socketDidSendMessage(message, flags) {
            function isValid(data) {
                return true;
            }

            var groupId, i, len, data = JSON.parse(message);
            if (isValid(data)) {
                groupId = data.groupId;

                /* we consider this to be a new group join, so remove the socket from previous groups */
                removeSocketFromGroups();
                addSocketToGroup(groupId);

                /* notify all the group members of the event */
                for (i = 0, len = groups[groupId].length; i < len; i++) {
                    groups[groupId][i].send(JSON.stringify({
                        groupId: groupId,
                        userId: data.userId,
                        lat: data.lat,
                        lng: data.lng
                    }));
                }

            } else {
                /* the message wasn't valid, so don't do anything with it */
            }

        });
        socket.on('close', function socketDidClose() {
            removeSocketFromGroups();
        });
    });
}());