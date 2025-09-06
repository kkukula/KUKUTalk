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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let MessagesService = class MessagesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async listByConversation(conversationId, take = 30, cursor) {
        const itemsDesc = await this.prisma.message.findMany({
            where: { conversationId },
            orderBy: { createdAt: 'desc' },
            take,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
            select: {
                id: true,
                createdAt: true,
                editedAt: true,
                deletedAt: true,
                status: true,
                conversationId: true,
                senderId: true,
                content: true,
                attachmentUrl: true,
            },
        });
        const items = itemsDesc.reverse();
        const nextCursor = itemsDesc.length === take ? itemsDesc[itemsDesc.length - 1].id : null;
        return { items, nextCursor };
    }
    async createMessage(userId, conversationId, content) {
        const msg = await this.prisma.message.create({
            data: {
                conversationId,
                senderId: userId,
                content,
                status: 'SENT',
            },
            select: {
                id: true,
                createdAt: true,
                editedAt: true,
                deletedAt: true,
                status: true,
                conversationId: true,
                senderId: true,
                content: true,
                attachmentUrl: true,
            },
        });
        await this.prisma.conversation.update({
            where: { id: conversationId },
            data: { lastMessageAt: new Date() },
        });
        return msg;
    }
};
exports.MessagesService = MessagesService;
exports.MessagesService = MessagesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MessagesService);
//# sourceMappingURL=messages.service.js.map