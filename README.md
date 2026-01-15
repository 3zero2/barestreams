# lazy-torrentio

Minimal Stremio addon that serves empty stream results with Redis-backed caching.

## Run with Docker Compose

```bash
docker compose up --build
```

Addon will be available at:

- http://localhost:19080/manifest.json

## Run e2e tests with FlareSolverr

```bash
docker compose -f docker-compose.test.yml up --abort-on-container-exit --build
```

## Configuration

- `EZTV_URL`: Comma-separated list of EZTV base URLs to try in order.
- `YTS_URL`: Comma-separated list of YTS base URLs to try in order.
- `TGX_URL`: Comma-separated list of TorrentGalaxy base URLs to try in order.
- `PIRATEBAY_URL`: Comma-separated list of Pirate Bay base URLs to try in order.
- `X1337X_URL`: Comma-separated list of 1337x base URLs to try in order.

## IMDb datasets

On startup the addon downloads and extracts the IMDb TSV datasets into `data/imdb`. If the files are older than 24 hours they are refreshed in the background.
