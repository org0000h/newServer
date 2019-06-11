#!/usr/bin/env node
const app = require('../app');
const http = require('http');
const db = require('../persistence/db');
require("../persistence/loadModels");
const {
  normalizePort,
  generateOnError,
} = require('./for_launcher');

http.globalAgent.maxSockets = 40000;

const port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

let server = http.createServer(app);
let onError = generateOnError();
server.on('error', onError);
server.on('listening',()=>{
    console.log('listening on port:' + port);
});

db.sync()
.then(()=>{
    console.log("\r\n Data base init done");
    server.listen(port);
})
.catch((e) => { 
    console.log(`failed:${e}`); process.exit(0); 
});

