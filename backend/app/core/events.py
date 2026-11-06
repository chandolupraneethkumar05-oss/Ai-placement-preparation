import asyncio
import json
from typing import Set

class EventBroadcaster:
    def __init__(self):
        self._subscribers: Set[asyncio.Queue] = set()

    async def subscribe(self) -> asyncio.Queue:
        q = asyncio.Queue()
        self._subscribers.add(q)
        return q

    def unsubscribe(self, q: asyncio.Queue):
        if q in self._subscribers:
            self._subscribers.remove(q)

    async def broadcast(self, event_type: str, data: dict):
        message = json.dumps({"event": event_type, "data": data})
        stale = []
        for q in self._subscribers:
            try:
                q.put_nowait(message)
            except Exception:
                stale.append(q)
        for s in stale:
            self.unsubscribe(s)

broadcaster = EventBroadcaster()
