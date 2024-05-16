# HumanLLM-Monitor-Frontend

## Overview

The **HumanLLM-Monitor-Frontend** is a frontend application built with React and Vite for monitoring and interacting with a Human-AI collaborative system. The project aims to provide an intuitive interface for managing and visualizing data processed by the HumanLLM Monitor.

## Demo & Screenshots

https://www.loom.com/share/96b5e9ea6f184f1e9bc761f36caee254

## Features

- Interactive UI built with React-Flow
- Fast development and build process using Vite
- Integration with backend services

## Connection Code

The connection code establishes a WebSocket server using Fastify and `@fastify/websocket` to interact with `learn.py`. The server listens for WebSocket connections and spawns a child process to run `learn.py`. Here's the connection code:

```javascript
"use strict";
const fastify = require("fastify");
const websocket = require("@fastify/websocket");
const { spawn } = require("child_process");

const app = fastify();
app.register(websocket);

let process = null;

app.register(async (app, opts) => {
    app.get('/ws', { websocket: true }, (connection, req) => {
        if (process) {
            process.kill();
        }
        console.log('Client connected');
        process = spawn('python', ['learn.py'], { cwd: '../' });

        process.stderr?.on('data', (data) => {
            console.log(`\u001B[31m${data.toString()}\u001B[0m`);
        });

        process.stdout?.on('data', (data) => {
            console.log(`\u001B[32m${data.toString()}\u001B[0m`);
            connection.socket.send(data.toString());
        });

        process.stdin?.write('2\nno\nall\nall\n');

        connection.socket.on('message', (message) => {
            process.stdin?.write(message.toString());
        });

        process.on('close', (code) => {
            console.log(`child process exited with code ${code}`);
        });
    });
});

app.listen({ port: 1337 }, (err, address) => {
    if (err) {
        console.error(err);
    }
    console.log(`Server listening at ${address}`);
});
```
