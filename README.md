## Description

This repository contains implementation for task specified in `Backend.js Test Assignment_ Distributed Video Surveillance System.pdf`.

## Setup

Requirements:
- node (v24)
- docker, docker compose

Download ffmpeg for you OS (https://github.com/BtbN/FFmpeg-Builds/releases) and save it to 'camera-simulator/bin/win32/ffmpeg.exe' or 'camera-simulator/bin/linux64/ffmpeg' (depending on which OS you are running camera-simulator)

## Environment configuration

Check docker-compose.yaml for dev and docker-compose.prod.yaml for prod.
By default there is configuration for development.

## Running locally (watch mode)
1. Copy 'frontend/.env.example' to 'frontend/.env'

2. Start docker compose: 
```docker compose up```

3. Start camera simulator.

In 'camera-simulator':
```
pnpm install
pnpm start:dev
```

4. Open browser: http://localhost


## Running locally (prod mode)
1. Copy 'frontend/.env.example' to 'frontend/.env'

2. Start docker compose

```
docker compose  -f docker-compose.yml -f docker-compose.prod.yml up
```

3. Start camera-simulator.

In 'camera-simulator' run:
```
pnpm install
pnpm build
pnpm start
```

4. Open browser: http://localhost


## Default users

```
login: admin
password: password123
role: operator

login: viewer
password: password123
role: viewer
```