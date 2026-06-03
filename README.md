# Caddy Mini-Site Builder (Demo)

A minimal multi-tenant mini-site builder demo with:

- Node.js + Express
- SQLite + Prisma
- Static frontend calling JSON APIs
- PM2 process manager
- Caddy for automatic HTTPS (wildcard + on-demand)

## Local development

1. Copy env sample:

```
cp .env.example .env
```

2. Install dependencies:

```
npm install
```

3. Generate Prisma client and migrate:

```
npm run prisma:generate
npm run prisma:migrate
```

4. Start server:

```
npm start
```

Visit http://localhost:3000

## Environment variables

See [.env.example](.env.example) for defaults.

- `BASE_DOMAIN`: root domain for subdomains (e.g. `mydomain.com`)
- `MYDOMAIN`: same as `BASE_DOMAIN` (used for UI subdomain URLs)
- `DATABASE_URL`: SQLite file path
- `ASK_SECRET`: shared secret used by the app's `/caddy/ask` endpoint and Caddy
- `PORT`: server port (default 3000)

## Owner vs client tasks (who does what)

### Owner tasks (you)

1. Create the EC2 instance and open ports 80/443.
2. Install Node.js, PM2, and Caddy.
3. Build Caddy with the Name.com DNS module (required for wildcard TLS).
4. Configure the app `.env` and Caddy environment variables.
5. Point `*.MYDOMAIN.com` to your EC2 public IP in Name.com DNS.
6. Run Prisma migrations and start the app with PM2.
7. Reload Caddy and verify subdomains and custom domains.

### Client tasks (your customer)

1. Add their domain in the app (must be a `www.` hostname).
2. Create the TXT record shown in the UI:
	- `_verify.www.clientdomain.com` = `<token>`
3. Wait for DNS to propagate.
4. Click Verify in the app.

## Where to paste API tokens and secrets

### App (.env)

- `BASE_DOMAIN` and `MYDOMAIN` should be your root domain.
- `ASK_SECRET` must be set and should match the Caddy environment.
- `DATABASE_URL` is the SQLite file path (default uses `./prisma/dev.db`).

### Caddy service environment

Set these on the server for the Caddy service (do not paste tokens in chat):

- `NAMEDOTCOM_USER`
- `NAMEDOTCOM_TOKEN`
- `NAMEDOTCOM_SERVER` (`https://api.name.com` or `https://api.dev.name.com`)
- `ASK_SECRET` (must match the app)

Use this split:

- `NAMEDOTCOM_TOKEN` is the Name.com API token for wildcard DNS records.
- `ASK_SECRET` is the shared secret for Caddy's on-demand TLS ask endpoint.

You can set these with a systemd drop-in, for example:

```
sudo systemctl edit caddy
```

Then add:

```
[Service]
Environment="NAMEDOTCOM_USER=..."
Environment="NAMEDOTCOM_TOKEN=..."
Environment="NAMEDOTCOM_SERVER=https://api.name.com"
Environment="ASK_SECRET=..."
```

Reload the service after changes:

```
sudo systemctl daemon-reload
sudo systemctl restart caddy
```

## Where domains are saved

Custom domains are stored in the SQLite database in the `Domain` table.
By default, the database file lives at `./prisma/dev.db` unless you change `DATABASE_URL`.

## Custom domain flow

1. Add a domain via the app (stored as pending).
	- For this demo, only `www` hostnames are accepted.
2. Set a TXT record for `_verify.<your-domain>` with the token shown in the UI.
3. Click verify. The app checks the TXT record and marks the domain active.
4. Caddy uses on-demand TLS and the `/caddy/ask` endpoint to issue certs.

## Core routes

- `GET /` create-site form
- `POST /api/sites` create site
- `GET /success` success page
- `GET /app/sites/:handle/edit` edit form
- `POST /api/sites/:handle` update site content
- `GET /app/sites/:handle/domains` connect domain page
- `POST /api/sites/:handle/domains` add domain (pending)
- `POST /api/sites/:handle/domains/:domainId/verify` verify DNS and activate
- `GET /caddy/ask?domain=example.com&token=...` allow on-demand TLS only for active domains
- `GET /*` render tenant site based on Host header

## EC2 deployment (Ubuntu 22.04)

### 1) Install Node.js LTS

```
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2) Install PM2

```
sudo npm install -g pm2
```

### 3) Deploy the app

```
sudo mkdir -p /var/www/saas-demo
sudo chown -R ubuntu:ubuntu /var/www/saas-demo
```

Copy project files to `/var/www/saas-demo`, then:

```
cd /var/www/saas-demo
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:deploy
```

### 4) Start with PM2

```
pm2 start npm --name saas-demo -- start
pm2 save
pm2 startup
```

### 5) Install Caddy

```
sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt-get update
sudo apt-get install -y caddy
```

### 5a) Build Caddy with the Name.com DNS module (required for wildcard TLS)

```bash
sudo apt-get install -y golang-go
go install github.com/caddyserver/xcaddy/cmd/xcaddy@latest
cd ~
~/go/bin/xcaddy build --with github.com/caddy-dns/namedotcom
sudo systemctl stop caddy
sudo mv /usr/bin/caddy /usr/bin/caddy.orig
sudo cp ./caddy /usr/bin/caddy
sudo systemctl start caddy
```

### 6) Configure Caddy

Copy the provided `Caddyfile` into `/etc/caddy/Caddyfile` and update:

- `MYDOMAIN.com` placeholders
- Name.com DNS credentials for wildcard TLS:
	- `NAMEDOTCOM_USER`
	- `NAMEDOTCOM_TOKEN`
	- `NAMEDOTCOM_SERVER` (use `https://api.name.com` or `https://api.dev.name.com`)
- `ASK_SECRET`

Then reload:

```
sudo systemctl reload caddy
```

### 7) Open security group ports

Allow inbound ports 80 and 443 on your EC2 security group.

### 8) DNS setup

- `*.MYDOMAIN.com` should resolve to your EC2 public IP (A record).
- Optional: set `MYDOMAIN.com` to the same IP for marketing page.

## DNS examples

### Wildcard subdomains (your main domain)

```
Type: A
Name: *
Value: <EC2_PUBLIC_IP>
```

### Custom domains (client-owned)

```
Type: TXT
Name: _verify.www.clientdomain.com
Value: <token from app>
```

## Caddy ask endpoint

Caddy calls:

```
http://localhost:3000/caddy/ask?domain=example.com&token=YOUR_SHARED_SECRET
```

The app returns 200 only for active domains.
