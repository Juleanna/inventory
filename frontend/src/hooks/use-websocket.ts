import { useEffect, useRef } from 'react'
import { wsClient, type WebSocketMessage } from '@/lib/websocket'
import { useAuthStore } from '@/stores/auth-store'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

/**
 * Hook to connect to WebSocket and listen for real-time events.
 * Auto-connects on mount if authenticated, disconnects on unmount.
 */
export function useWebSocket() {
  const { isAuthenticated } = useAuthStore()
  const queryClient = useQueryClient()
  const connectedRef = useRef(false)

  useEffect(() => {
    if (!isAuthenticated) {
      wsClient.disconnect()
      connectedRef.current = false
      return
    }

    if (!connectedRef.current) {
      wsClient.connect()
      connectedRef.current = true
    }

    // Listen for all messages and handle them
    const unsubscribe = wsClient.on('*', (msg: WebSocketMessage) => {
      switch (msg.type) {
        case 'notification':
          // Show toast and invalidate notifications query
          toast.info(
            (msg.payload.title as string) || 'Нове сповіщення',
            { description: msg.payload.message as string }
          )
          queryClient.invalidateQueries({ queryKey: ['notifications'] })
          break

        case 'equipment_update':
          // Invalidate equipment queries
          queryClient.invalidateQueries({ queryKey: ['equipment'] })
          if (msg.payload.id) {
            queryClient.invalidateQueries({ queryKey: ['equipment', msg.payload.id] })
          }
          break

        case 'maintenance_alert':
          toast.warning(
            (msg.payload.title as string) || 'Обслуговування',
            { description: msg.payload.message as string }
          )
          queryClient.invalidateQueries({ queryKey: ['maintenance'] })
          break

        case 'system_event':
          queryClient.invalidateQueries({ queryKey: ['dashboard'] })
          break
      }
    })

    return () => {
      unsubscribe()
    }
  }, [isAuthenticated, queryClient])
}

/**
 * Hook to subscribe to specific WebSocket event type.
 */
export function useWebSocketEvent(
  event: string,
  handler: (data: WebSocketMessage) => void
) {
  useEffect(() => {
    return wsClient.on(event, handler)
  }, [event, handler])
}
