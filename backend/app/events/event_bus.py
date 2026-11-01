import logging
from typing import Dict, List, Callable, Any
from app.events.event_types import EventType

logger = logging.getLogger(__name__)

class EventBus:
    """
    An in-memory Pub-Sub Event Bus singleton.
    """
    _instance = None
    _listeners: Dict[EventType, List[Callable[[Any], Any]]] = {}

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(EventBus, cls).__new__(cls, *args, **kwargs)
        return cls._instance

    def subscribe(self, event_type: EventType, listener: Callable[[Any], Any]):
        if event_type not in self._listeners:
            self._listeners[event_type] = []
        self._listeners[event_type].append(listener)
        logger.info(f"Listener subscribed to event: {event_type.value}")

    async def publish(self, event_type: EventType, payload: Any):
        logger.info(f"Event published: {event_type.value}")
        listeners = self._listeners.get(event_type, [])
        for listener in listeners:
            try:
                import inspect
                if inspect.iscoroutinefunction(listener):
                    await listener(payload)
                else:
                    listener(payload)
            except Exception as e:
                logger.error(f"Error executing listener for {event_type.value}: {e}")

event_bus = EventBus()
