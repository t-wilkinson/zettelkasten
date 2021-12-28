import React from 'react'
const EVENT_LEVEL = 'debug'

interface ZettelEvent {
  type?: string
  message?: any
  status?: 'error' | 'default' | 'success' | 'debug'
}

export const dispatch = ({ type, message, status = 'default' }: ZettelEvent) => {
  if (EVENT_LEVEL !== 'debug' && status === 'debug') {
    return
  }
  const event = new CustomEvent('zettel', { detail: { type, message, status } })
  document.dispatchEvent(event)
}

export const Events = () => {
  const [events, setEvents] = React.useState({})
  React.useEffect(() => {
    const onEvent = (e: CustomEvent<ZettelEvent>) => {
      setEvents(events => ({ ...events, [e.timeStamp]: e.detail }))
      setTimeout(() => {
        setEvents(events => {
          let eventsNew = { ...events }
          delete eventsNew[e.timeStamp]
          return eventsNew
        })
      }, 3000)
    }
    document.addEventListener('zettel', onEvent)
    return () => document.removeEventListener('zettel', onEvent)
  }, [])

  return (
    <article className="events">
      {Object.values(events)
        .reverse()
        .map((event: ZettelEvent) => (
          <div className={`events__event events__event--${event.status}`}>
            {event.status === 'debug' && event.type}
            {event.message}
          </div>
        ))}
    </article>
  )
}

export default Events
