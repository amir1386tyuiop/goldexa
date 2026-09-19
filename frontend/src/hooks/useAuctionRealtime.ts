import { useEffect, useRef } from 'react'
import { io, type Socket } from 'socket.io-client'
import type { Auction, AuctionBid } from '@/types'

export type AuctionRealtimeEvent = {
  auction: Auction
  bid: AuctionBid
  emittedAt: string
}

export function useAuctionRealtime(
  auctionId: string | undefined,
  onUpdate: (event: AuctionRealtimeEvent) => void,
): void {
  const callbackRef = useRef(onUpdate)
  callbackRef.current = onUpdate

  useEffect(() => {
    if (!auctionId) return
    const socketUrl = import.meta.env.VITE_WS_URL || window.location.origin
    const socketPath = import.meta.env.VITE_WS_PATH || '/api/socket.io'
    const socket: Socket = io(socketUrl, {
      path: socketPath,
      transports: ['websocket', 'polling'],
      withCredentials: true,
    })
    const handleUpdate = (event: AuctionRealtimeEvent) => {
      if (event?.auction?.id === auctionId && event.bid) callbackRef.current(event)
    }

    socket.on('auction.updated', handleUpdate)
    socket.emit('auction.join', { auctionId })
    return () => {
      socket.emit('auction.leave', { auctionId })
      socket.off('auction.updated', handleUpdate)
      socket.disconnect()
    }
  }, [auctionId])
}
