// In-memory pub-sub, scoped per site, used to push live fleet updates
// (location pings, checkpoint scans, clock in/out, incidents, SOS) to
// every Command Portal connected via Server-Sent Events.
//
// This works as-is for a single Node process, which covers Render/Railway/
// Fly.io's default single-instance deployment. If you later scale to
// multiple instances behind a load balancer, swap this for a Redis pub/sub
// adapter (e.g. ioredis) so events reach portals connected to a different
// instance than the one that received the update — the publish/subscribe
// call sites elsewhere in the codebase don't need to change either way.
const { EventEmitter } = require('events');

const bus = new EventEmitter();
bus.setMaxListeners(0);

function publish(siteId, event) {
  bus.emit(`site:${siteId}`, event);
}

function subscribe(siteId, handler) {
  const channel = `site:${siteId}`;
  bus.on(channel, handler);
  return () => bus.off(channel, handler);
}

module.exports = { publish, subscribe };
