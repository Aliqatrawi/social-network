package ws

import (
	"time"

	"github.com/gorilla/websocket"
)

type GorillaClient struct {
	conn *websocket.Conn
	*Client
}

func NewGorillaClient(conn *websocket.Conn) *GorillaClient {
	// Configure basic timeouts
	_ = conn.SetReadDeadline(time.Time{})
	gc := &GorillaClient{conn: conn}
	gc.Client = NewClient(
		func(b []byte) error { return conn.WriteMessage(websocket.TextMessage, b) },
		func() error { return conn.Close() },
	)
	return gc
}
