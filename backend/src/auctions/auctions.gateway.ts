import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets'
import { BadRequestException } from '@nestjs/common'
import type { Server, Socket } from 'socket.io'
import type { Auction } from './auction.entity'
import type { AuctionBid } from './auction-bid.entity'

type AuctionRoomMessage = { auctionId: string }

@WebSocketGateway({
  cors: {
    origin: String(process.env.FRONTEND_URL || 'http://localhost:5174')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    credentials: true,
  },
})
export class AuctionsGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server

  handleConnection(client: Socket): void {
    client.emit('auction.connected', { connectedAt: new Date().toISOString() })
  }

  @SubscribeMessage('auction.join')
  async joinAuction(
    @ConnectedSocket() client: Socket,
    @MessageBody() message: AuctionRoomMessage,
  ): Promise<{ event: string; data: { auctionId: string } }> {
    const auctionId = String(message?.auctionId ?? '').trim()
    if (!auctionId) throw new BadRequestException('شناسه مزایده الزامی است')
    await client.join(this.room(auctionId))
    return { event: 'auction.joined', data: { auctionId } }
  }

  @SubscribeMessage('auction.leave')
  async leaveAuction(
    @ConnectedSocket() client: Socket,
    @MessageBody() message: AuctionRoomMessage,
  ): Promise<{ event: string; data: { auctionId: string } }> {
    const auctionId = String(message?.auctionId ?? '').trim()
    if (auctionId) await client.leave(this.room(auctionId))
    return { event: 'auction.left', data: { auctionId } }
  }

  publishBid(auction: Auction, bid: AuctionBid): void {
    this.server.to(this.room(auction.id)).emit('auction.updated', {
      auction,
      bid,
      emittedAt: new Date().toISOString(),
    })
  }

  private room(auctionId: string): string {
    return `auction:${auctionId}`
  }
}
