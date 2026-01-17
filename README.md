# lazy-torrentio

Minimal Stremio addon that serves torrent stream results with Redis-backed caching.

## Run with Docker Compose

```bash
docker compose up --build
```

Addon will be available at:

- http://localhost:19080/manifest.json

### Optional services

The Docker setup includes optional containers that you can remove if you don't need them:

- `gluetun`: VPN gateway. Requires `.env` values if enabled.
- `redis`: Caching backend. If disabled, remove `REDIS_URL`.
- `flaresolverr`: Used by some scrapers to bypass protections. If disabled, remove `FLARESOLVERR_URL`.

## Run e2e tests with FlareSolverr

```bash
docker compose -f docker-compose.test.yml up --abort-on-container-exit --build
```

## Configuration

- `REDIS_URL`: Redis connection URL (optional).
- `EZTV_URL`: Comma-separated list of EZTV base URLs to try in order.
- `YTS_URL`: Comma-separated list of YTS base URLs to try in order.
- `TGX_URL`: Comma-separated list of TorrentGalaxy base URLs to try in order.
- `PIRATEBAY_URL`: Comma-separated list of Pirate Bay base URLs to try in order.
- `X1337X_URL`: Comma-separated list of 1337x base URLs to try in order.
- `FLARESOLVERR_URL`: FlareSolverr base URL (optional).
- `FLARESOLVERR_SESSIONS`: Number of FlareSolverr sessions to keep (optional).

If you keep `gluetun` enabled, you will also need `.env` entries such as:

```
NORDVPN_USER=...
NORDVPN_PASS=...
NORDVPN_SERVER_COUNTRIES=...
TZ=...
```

## IMDb datasets

On startup the addon downloads and extracts the IMDb TSV datasets into `data/imdb`. If the files are older than 24 hours they are refreshed in the background.
