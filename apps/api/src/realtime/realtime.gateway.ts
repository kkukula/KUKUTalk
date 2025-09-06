import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket, OnGatewayDisconnect, OnGatewayInit, OnGatewayConnection } from "@nestjs/websockets";
import { Logger } from "@nestjs/common";
import type { Server, Socket } from "socket.io";
import { PresenceService } from "../presence/presence.service";

// CORS: liberalny na czas testów (po smoke zawęzimy do FRONTEND_ORIGINS)
@WebSocketGateway({ cors: { origin: true, credentials: true }, path: "/socket.io" })
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly log = new Logger(RealtimeGateway.name);
  @WebSocketServer() server!: Server;
  constructor(private readonly presence: PresenceService) {}

  afterInit(server: Server) {
    this.log.log("RealtimeGateway ready (Socket.IO)");
    // DIAGNOSTYKA: log każdej sesji i każdego eventu
    server.on("connection", (socket: Socket) => {
      this.log.log(`WS connect: ${socket.id} (headers: ${JSON.stringify(socket.handshake.headers)})`);
      socket.onAny(async (event, ...args) => {
        this.log.log(`WS event: ${event} args=${JSON.stringify(args[0] ?? null)}`);
        try {
          if (event === "room:join") {
            const body = args[0] || {};
            const roomId: string = body.roomId;
            const userId: string = body.userId;
            if (!roomId || !userId) return;
            socket.data.roomId = roomId;
            socket.data.userId = userId;
            await socket.join(roomId);
            await this.presence.heartbeat(userId, roomId);
            await this.broadcastRoom(roomId);
          } else if (event === "typing") {
            const body = args[0] || {};
            const roomId: string = body.roomId;
            const userId: string = body.userId;
            const isTyping: boolean = !!body.isTyping;
            if (!roomId || !userId) return;
            await this.presence.setTyping(roomId, userId, isTyping);
            await this.broadcastTyping(roomId);
          }
        } catch (e) {
          this.log.error(`WS handler error for ${event}: ${e instanceof Error ? e.message : e}`);
        }
      });
    });
  }

  handleConnection(client: Socket) {
    this.log.log(`WS handleConnection: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    this.log.log(`WS disconnect: ${client.id}`);
    const roomId = client.data?.roomId as string | undefined;
    const userId = client.data?.userId as string | undefined;
    if (roomId && userId) {
      await this.presence.leaveRoom(userId, roomId);
      await this.broadcastRoom(roomId);
    }
  }

  private async broadcastRoom(roomId: string) {
    const users = await this.presence.roomMembers(roomId);
    this.log.log(`broadcastRoom(${roomId}) -> ${JSON.stringify(users)}`);
    this.server.to(roomId).emit("presence:update", { roomId, users });
  }
  private async broadcastTyping(roomId: string) {
    const users = await this.presence.whoTyping(roomId);
    this.log.log(`broadcastTyping(${roomId}) -> ${JSON.stringify(users)}`);
    this.server.to(roomId).emit("typing:update", { roomId, users });
  }

  // Oryginalne handlery zostawiamy  jeśli zaczną działać, będą współbieżne z onAny-bridge.
  @SubscribeMessage("room:join")
  async onJoin(@MessageBody() body: { roomId: string; userId: string }, @ConnectedSocket() client: Socket) {
    this.log.log(`onJoin called with ${JSON.stringify(body)}`);
    const roomId = body?.roomId; const userId = body?.userId;
    if (!roomId || !userId) return { ok:false, message:"roomId & userId required" };
    client.data.roomId = roomId;
    client.data.userId = userId;
    await client.join(roomId);
    await this.presence.heartbeat(userId, roomId);
    await this.broadcastRoom(roomId);
    return { ok:true };
  }

  @SubscribeMessage("typing")
  async onTyping(@MessageBody() body: { roomId: string; userId: string; isTyping: boolean }) {
    this.log.log(`onTyping called with ${JSON.stringify(body)}`);
    if (!body?.roomId || !body?.userId) return { ok:false };
    await this.presence.setTyping(body.roomId, body.userId, !!body.isTyping);
    await this.broadcastTyping(body.roomId);
    return { ok:true };
  }

  @SubscribeMessage("room:get")
  async onRoomGet(@MessageBody() body: { roomId: string }) {
    const users = await this.presence.roomMembers(body?.roomId);
    return { roomId: body?.roomId, users };
  }
}
