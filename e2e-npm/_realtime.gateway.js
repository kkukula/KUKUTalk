"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var RealtimeGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealtimeGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const common_1 = require("@nestjs/common");
const presence_service_1 = require("../presence/presence.service");
let RealtimeGateway = RealtimeGateway_1 = class RealtimeGateway {
    constructor(presence) {
        this.presence = presence;
        this.log = new common_1.Logger(RealtimeGateway_1.name);
    }
    afterInit(server) {
        this.log.log("RealtimeGateway ready (Socket.IO)");
        server.on("connection", (socket) => {
            this.log.log(`WS connect: ${socket.id} (headers: ${JSON.stringify(socket.handshake.headers)})`);
            socket.onAny(async (event, ...args) => {
                this.log.log(`WS event: ${event} args=${JSON.stringify(args[0] ?? null)}`);
                try {
                    if (event === "room:join") {
                        const body = args[0] || {};
                        const roomId = body.roomId;
                        const userId = body.userId;
                        if (!roomId || !userId)
                            return;
                        socket.data.roomId = roomId;
                        socket.data.userId = userId;
                        await socket.join(roomId);
                        await this.presence.heartbeat(userId, roomId);
                        await this.broadcastRoom(roomId);
                    }
                    else if (event === "typing") {
                        const body = args[0] || {};
                        const roomId = body.roomId;
                        const userId = body.userId;
                        const isTyping = !!body.isTyping;
                        if (!roomId || !userId)
                            return;
                        await this.presence.setTyping(roomId, userId, isTyping);
                        await this.broadcastTyping(roomId);
                    }
                }
                catch (e) {
                    this.log.error(`WS handler error for ${event}: ${e instanceof Error ? e.message : e}`);
                }
            });
        });
    }
    handleConnection(client) {
        this.log.log(`WS handleConnection: ${client.id}`);
    }
    async handleDisconnect(client) {
        this.log.log(`WS disconnect: ${client.id}`);
        const roomId = client.data?.roomId;
        const userId = client.data?.userId;
        if (roomId && userId) {
            await this.presence.leaveRoom(userId, roomId);
            await this.broadcastRoom(roomId);
        }
    }
    async broadcastRoom(roomId) {
        const users = await this.presence.roomMembers(roomId);
        this.log.log(`broadcastRoom(${roomId}) -> ${JSON.stringify(users)}`);
        this.server.to(roomId).emit("presence:update", { roomId, users });
    }
    async broadcastTyping(roomId) {
        const users = await this.presence.whoTyping(roomId);
        this.log.log(`broadcastTyping(${roomId}) -> ${JSON.stringify(users)}`);
        this.server.to(roomId).emit("typing:update", { roomId, users });
    }
    async onJoin(body, client) {
        this.log.log(`onJoin called with ${JSON.stringify(body)}`);
        const roomId = body?.roomId;
        const userId = body?.userId;
        if (!roomId || !userId)
            return { ok: false, message: "roomId & userId required" };
        client.data.roomId = roomId;
        client.data.userId = userId;
        await client.join(roomId);
        await this.presence.heartbeat(userId, roomId);
        await this.broadcastRoom(roomId);
        return { ok: true };
    }
    async onTyping(body) {
        this.log.log(`onTyping called with ${JSON.stringify(body)}`);
        if (!body?.roomId || !body?.userId)
            return { ok: false };
        await this.presence.setTyping(body.roomId, body.userId, !!body.isTyping);
        await this.broadcastTyping(body.roomId);
        return { ok: true };
    }
    async onRoomGet(body) {
        const users = await this.presence.roomMembers(body?.roomId);
        return { roomId: body?.roomId, users };
    }
};
exports.RealtimeGateway = RealtimeGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", Function)
], RealtimeGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)("room:join"),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Function]),
    __metadata("design:returntype", Promise)
], RealtimeGateway.prototype, "onJoin", null);
__decorate([
    (0, websockets_1.SubscribeMessage)("typing"),
    __param(0, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], RealtimeGateway.prototype, "onTyping", null);
__decorate([
    (0, websockets_1.SubscribeMessage)("room:get"),
    __param(0, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], RealtimeGateway.prototype, "onRoomGet", null);
exports.RealtimeGateway = RealtimeGateway = RealtimeGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({ cors: { origin: true, credentials: true }, path: "/socket.io" }),
    __metadata("design:paramtypes", [presence_service_1.PresenceService])
], RealtimeGateway);
//# sourceMappingURL=realtime.gateway.js.map