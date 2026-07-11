const createExpoWebpackConfigAsync = require("@expo/webpack-config");

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  // NOTE: the deploy subpath ("/HomeVault/") is set via the "homepage" field in
  // package.json, which Expo applies to the bundle AND every injected PWA/icon
  // link in production, while keeping dev served from root. Don't override
  // output.publicPath here — doing so also rewrites it in dev and breaks asset
  // loading against the dev server.

  // --- webpack-dev-server v4 compatibility (dev only) --------------------------
  // Expo 48's @expo/cli 0.7.3 was written for webpack-dev-server v3, but v4 is
  // installed. Two v4 incompatibilities crash `expo start --web`:
  //   1. Reload broadcasts call the removed v3 API `server.sockWrite(...)` →
  //      "Expected Webpack dev server, found: Server".
  //   2. The v4 websocket heartbeat calls `client.ping` on clients that lack it →
  //      "client.ping is not a function" as soon as a browser connects.
  // Rather than shim both, disable the live-reload websocket. The app still
  // serves and runs; refresh the browser manually to pick up changes.
  if (config.devServer) {
    config.devServer.hot = false;
    config.devServer.liveReload = false;
    config.devServer.webSocketServer = false;

    // Belt-and-suspenders: if a reload is still broadcast, bridge the v3 API onto
    // the v4 server so it no-ops instead of throwing.
    const previousOnListening = config.devServer.onListening;
    config.devServer.onListening = (devServer) => {
      if (typeof previousOnListening === "function") {
        previousOnListening(devServer);
      }
      if (devServer && typeof devServer.sockWrite !== "function") {
        Object.defineProperty(devServer, "sockets", {
          configurable: true,
          get() {
            return devServer.webSocketServer
              ? devServer.webSocketServer.clients
              : [];
          },
        });
        devServer.sockWrite = (clients, type, data) => {
          if (typeof devServer.sendMessage === "function") {
            devServer.sendMessage(clients, type, data);
          }
        };
      }
    };
  }

  return config;
};
