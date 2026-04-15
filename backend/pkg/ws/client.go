package ws

import (
	"encoding/json"
)

type WriteFunc func([]byte) error
type CloseFunc func() error

// Client is a thin wrapper around a websocket connection.
type Client struct {
	write WriteFunc
	close CloseFunc
	send  chan []byte
}

func NewClient(write WriteFunc, close CloseFunc) *Client {
	return &Client{
		write: write,
		close: close,
		send:  make(chan []byte, 64),
	}
}

func (c *Client) Send(msg OutgoingMessage) {
	b, err := json.Marshal(msg)
	if err != nil {
		return
	}
	select {
	case c.send <- b:
	default:
		// drop if buffer full
	}
}

func (c *Client) WritePump() {
	for b := range c.send {
		_ = c.write(b)
	}
	_ = c.close()
}

func (c *Client) Close() {
	close(c.send)
}
