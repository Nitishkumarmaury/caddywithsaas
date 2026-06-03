# EC2 Setup Tasks and Commands (Ubuntu 22.04)

This file lists the tasks and the exact commands to deploy the app on an EC2 instance.

## 0) Prereqs (manual tasks)

- EC2: Ubuntu 22.04 LTS
- Security Group inbound: 22 (SSH), 80 (HTTP), 443 (HTTPS)
- Domain name and DNS access
- SSH access to the instance

## 1) System update

```bash
sudo apt-get update
sudo apt-get -y upgrade
```

## 2) Install Node.js LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs
```

## 3) Install PM2

```bash
sudo npm install -g pm2
```

## 4) Deploy app to /var/www/saas-demo

```bash
sudo mkdir -p /var/www/saas-demo
sudo chown -R ubuntu:ubuntu /var/www/saas-demo
```

Copy the project files to `/var/www/saas-demo`, then:

```bash
cd /var/www/saas-demo
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:deploy
```

## 5) Start with PM2

```bash
pm2 start npm --name saas-demo -- start
pm2 save
pm2 startup
```

## 6) Install Caddy

```bash
sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt-get update
sudo apt-get install -y caddy
```

## 6a) Build Caddy with Name.com DNS module (required for wildcard TLS)

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

## 7) Configure Caddy

Tasks:
- Copy the project `Caddyfile` to `/etc/caddy/Caddyfile`.
- Replace `MYDOMAIN.com` placeholders.
- Set Name.com DNS credentials in the Caddy environment:
	- `NAMEDOTCOM_USER`
	- `NAMEDOTCOM_TOKEN`
	- `NAMEDOTCOM_SERVER` (use `https://api.name.com` or `https://api.dev.name.com`)
- Set `ASK_SECRET` in the environment.

Commands:

```bash
sudo cp /var/www/saas-demo/Caddyfile /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

## 8) DNS setup

Tasks:
- Add wildcard A record pointing to the EC2 public IP.
- (Optional) Add root A record for the marketing page.

Example:

```
Type: A
Name: *
Value: <EC2_PUBLIC_IP>
```

## 9) Verify

- Visit `https://<your-subdomain>.<your-domain>`
- Add a custom domain in the app and verify the TXT record

## 10) Updates (repeat as needed)

```bash
cd /var/www/saas-demo
npm install
npm run prisma:deploy
pm2 restart saas-demo
```
