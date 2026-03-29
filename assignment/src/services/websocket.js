/**
 * WebSocket client singleton.
 *
 * Handles connection lifecycle, JSON serialisation, and automatic
 * reconnection with exponential backoff. The caller supplies a Redux
 * dispatch function; received messages are dispatched as:
 *
 *   { type: 'ws/messageReceived', payload: <parsed JSON> }
 *
 * Status changes are dispatched as:
 *
 *   { type: 'connection/setStatus', payload: 'connecting' | 'connected' | 'disconnected' | 'error' }
 */

const BACKOFF_MS = [1000, 2000, 4000, 8000, 16000, 30000];

let _socket = null;
let _dispatch = null;
let _url = null;
let _reconnectTimer = null;
let _attempt = 0;
let _closing = false;   // true when disconnect() was called intentionally

function connect(url, dispatch) {
  if (_socket && (_socket.readyState === WebSocket.OPEN || _socket.readyState === WebSocket.CONNECTING)) {
    return;
  }
  _url = url;
  _dispatch = dispatch;
  _closing = false;
  _open();
}

function _open() {
  _socket = new WebSocket(_url);
  _dispatch({ type: 'connection/setStatus', payload: 'connecting' });

  _socket.onopen = () => {
    _attempt = 0;
    _dispatch({ type: 'connection/setStatus', payload: 'connected' });
  };

  _socket.onclose = () => {
    if (_closing) return;
    _dispatch({ type: 'connection/setStatus', payload: 'disconnected' });
    _scheduleReconnect();
  };

  _socket.onerror = () => {
    _dispatch({ type: 'connection/setStatus', payload: 'error' });
  };

  _socket.onmessage = (ev) => {
    try {
      const msg = JSON.parse(ev.data);
      _dispatch({ type: 'ws/messageReceived', payload: msg });
    } catch {
      console.warn('[ws] Received non-JSON message:', ev.data);
    }
  };
}

function _scheduleReconnect() {
  const delay = BACKOFF_MS[Math.min(_attempt, BACKOFF_MS.length - 1)];
  _attempt += 1;
  _reconnectTimer = setTimeout(_open, delay);
}

function disconnect() {
  _closing = true;
  if (_reconnectTimer !== null) {
    clearTimeout(_reconnectTimer);
    _reconnectTimer = null;
  }
  if (_socket) {
    _socket.close();
    _socket = null;
  }
  if (_dispatch) {
    _dispatch({ type: 'connection/setStatus', payload: 'disconnected' });
  }
}

function send(message) {
  if (!_socket || _socket.readyState !== WebSocket.OPEN) {
    console.warn('[ws] Cannot send — socket not open');
    return;
  }
  _socket.send(JSON.stringify(message));
}

export default { connect, disconnect, send };
