package ws

import (
	"sync"
)

type Hub struct {
	mu      sync.RWMutex
	clients map[string]map[*Client]struct{} // userID -> set of clients
	rooms   map[string]map[*Client]struct{} // roomID -> set
}

func NewHub() *Hub {
	return &Hub{
		clients: make(map[string]map[*Client]struct{}),
		rooms:   make(map[string]map[*Client]struct{}),
	}
}

func (h *Hub) AddClient(userID string, c *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.clients[userID] == nil {
		h.clients[userID] = make(map[*Client]struct{})
	}
	h.clients[userID][c] = struct{}{}
}

func (h *Hub) RemoveClient(userID string, c *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if set := h.clients[userID]; set != nil {
		delete(set, c)
		if len(set) == 0 {
			delete(h.clients, userID)
		}
	}
	// remove from rooms
	for roomID, set := range h.rooms {
		if _, ok := set[c]; ok {
			delete(set, c)
			if len(set) == 0 {
				delete(h.rooms, roomID)
			}
		}
	}
}

func (h *Hub) JoinRoom(roomID string, c *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.rooms[roomID] == nil {
		h.rooms[roomID] = make(map[*Client]struct{})
	}
	h.rooms[roomID][c] = struct{}{}
}

func (h *Hub) LeaveRoom(roomID string, c *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if set := h.rooms[roomID]; set != nil {
		delete(set, c)
		if len(set) == 0 {
			delete(h.rooms, roomID)
		}
	}
}

func (h *Hub) SendToUser(userID string, msg OutgoingMessage) {
	h.mu.RLock()
	set := h.clients[userID]
	h.mu.RUnlock()
	for c := range set {
		c.Send(msg)
	}
}

func (h *Hub) BroadcastRoom(roomID string, msg OutgoingMessage) {
	h.mu.RLock()
	set := h.rooms[roomID]
	h.mu.RUnlock()
	for c := range set {
		c.Send(msg)
	}
}

func (h *Hub) IsOnline(userID string) bool {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.clients[userID]) > 0
}

func (h *Hub) Broadcast(msg OutgoingMessage) {
	h.BroadcastExclude(msg, "")
}

func (h *Hub) BroadcastExclude(msg OutgoingMessage, excludeUserID string) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	for userID, set := range h.clients {
		// Skip excluded user
		if userID == excludeUserID {
			continue
		}
		for c := range set {
			c.Send(msg)
		}
	}
}
