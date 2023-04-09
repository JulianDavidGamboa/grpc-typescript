import path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoloader from '@grpc/proto-loader';
import { ProtoGrpcType } from './proto/random';
import { RandomHandlers } from './proto/randomPackage/Random';
import { TodoResponse } from './proto/randomPackage/TodoResponse';
import { TodoRequest } from './proto/randomPackage/TodoRequest';

const PORT = 8082;
const PROTO_FILE = './proto/random.proto';

const packageDef = protoloader.loadSync(path.resolve(__dirname, PROTO_FILE));
const grpObj = (grpc.loadPackageDefinition(packageDef) as unknown) as ProtoGrpcType;
const randomPackage = grpObj.randomPackage;

function main() {
    const server = getServer();

    server.bindAsync(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
        if (err) {
            console.error(err);
            return;
        }
        console.log(`Your server as started on port ${port}`);
        server.start()
    })

}

const todoList: TodoResponse = {todos: []}

function getServer() {
    const server = new grpc.Server();
    server.addService(randomPackage.Random.service, {
        PingPong: (req, res) => {
            console.log(req.request)
            res(null, {message: "Pong"})
        },
        RandomNumbers: (call) => {
            const { maxVal } = call.request;

            console.log({maxVal});

            let runCount = 0;
            const id = setInterval(() => {
                runCount = ++runCount;

                call.write({num: Math.floor(Math.random() * Number(maxVal))})


                if (runCount >= 10) {
                    clearInterval(id);
                    call.end()
                }
            }, 500)

        },
        TodoList: (call, callback) => {
            call.on("data", (chunk: TodoRequest) => {
                todoList.todos?.push(chunk);
                console.log(chunk);
            })
            call.on("end", () => {
                callback(null, {todos: todoList.todos})
            })
        }
    } as RandomHandlers);

    return server;
}

main()
