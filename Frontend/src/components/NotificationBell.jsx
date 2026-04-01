// components/NotificationBell.jsx
import { useState, useEffect, useRef } from 'react'
import { getNotifications, markAsRead, markAllAsRead } from '../services/notificationService'
import "./layout/Sidebar.css";

export default function NotificationBell({ userId }) {
  const [notifications, setNotifications] = useState([])
  const [open, setOpen] = useState(false)
  const ref = useRef()

  const unreadCount = notifications.filter(n => !n.read).length

  useEffect(() => {
    if (!userId) return
    const load = async () => {
      try {
        const data = await getNotifications()
        setNotifications(data)
      } catch { }
    }
    load()
    const interval = setInterval(load, 15000)
    return () => clearInterval(interval)
  }, [userId])

  useEffect(() => {
    const handler = e => { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleMarkAsRead = async (id) => {
    await markAsRead(id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  const handleMarkAllAsRead = async () => {
    await markAllAsRead()
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      
      {/* Styled exactly like other sidebar nav links */}
      <a href="#" onClick={(e) => { e.preventDefault(); setOpen(o => !o) }}>
          
        <span className="nav-icon">🔔</span>
        Notifications
        {unreadCount > 0 && (
          <span style={{
            margin: 'auto', background: '#f59e0b', color: '#000',
            fontSize: '10px', fontWeight: 700, padding: '1px 6px',
            borderRadius: '10px', minWidth: '18px', textAlign: 'center'
          }}>
            {unreadCount}
          </span>
        )}
      </a>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'fixed', left: '220px', top: '120px',
          width: '300px',
          background: 'var(--bg-panel)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
          zIndex: 9999, overflow: 'hidden'
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 16px', borderBottom: '1px solid var(--border)'
          }}>
            <span style={{ fontWeight: 500, fontSize: '13.5px', color: 'var(--text-hi)' }}>
              Notifications
            </span>
            <button onClick={handleMarkAllAsRead} style={{
              background: 'none', border: 'none', color: 'var(--accent)',
              fontSize: '12px', cursor: 'pointer'
            }}>
              Mark all as read
            </button>
          </div>

          {notifications.length === 0 ? (
            <p style={{ padding: '20px 16px', fontSize: '13px',
                        color: 'var(--text-mute)', textAlign: 'center' }}>
              No notifications yet
            </p>
          ) : (
            notifications.map(n => (
              <div key={n.id} onClick={() => handleMarkAsRead(n.id)} style={{
                display: 'flex', gap: '10px', padding: '12px 16px',
                borderBottom: '1px solid var(--border)', cursor: 'pointer',
                background: n.read ? 'transparent' : 'var(--bg-raised)',
                alignItems: 'flex-start', transition: 'background 0.15s'
              }}>
                <span style={{ fontSize: '16px' }}>{iconFor(n.type)}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '13px', fontWeight: 500, margin: 0,
                               lineHeight: 1.4, color: 'var(--text-mid)' }}>
                    {n.message}
                  </p>
                  <p style={{ fontSize: '11px', color: 'var(--text-mute)', margin: '3px 0 0' }}>
                    {formatTime(n.createdAt)}
                  </p>
                </div>
                {!n.read && (
                  <span style={{
                    width: '7px', height: '7px', borderRadius: '50%',
                    background: 'var(--accent)', flexShrink: 0, marginTop: '4px'
                  }} />
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

function iconFor(type) {
  return { photo_uploaded: '📷', photo_sold: '🛒',
           payment_received: '💳', purchase_complete: '✅' }[type] ?? '🔔'
}

function formatTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  const diff = (Date.now() - d) / 1000
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)} hour${Math.floor(diff / 3600) > 1 ? 's' : ''} ago`
  return 'Yesterday'
}