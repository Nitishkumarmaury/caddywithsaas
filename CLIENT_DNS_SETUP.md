# Client DNS Setup (Custom Domain)

This guide is for your client to connect their custom domain to the app.

## What we need from the client

- A `www` subdomain only (this demo supports `www` subdomains, not root domains).
- Access to their DNS provider (Cloudflare, GoDaddy, Route 53, etc.).

## Step 1: Tell us the domain

Send us the exact `www` domain you want to use, for example:

```
www.clientdomain.com
```

Do not include `http://` or `https://`.

## Step 2: Add the CNAME or A record

Create a DNS record for the `www` host:

Option A (recommended): CNAME

```
Type: CNAME
Name: www
Value: YOUR_APP_DOMAIN
TTL: 300
```

Option B: A record

```
Type: A
Name: www
Value: EC2_PUBLIC_IP
TTL: 300
```

We will provide the correct target (`YOUR_APP_DOMAIN` or `EC2_PUBLIC_IP`).

## Step 3: Add the TXT verification record

We will send you a verification token. Create this TXT record:

```
Type: TXT
Name: _verify.www.clientdomain.com
Value: <TOKEN_WE_SEND>
TTL: 300
```

Important:
- The record name must include the `www` you gave us.
- Do not add extra quotes unless your DNS provider requires it.

## Step 4: Wait for DNS propagation

DNS changes can take a few minutes to a few hours. After it propagates, we will verify and activate the domain.

## Optional: How to check propagation

You can run these commands locally:

```bash
nslookup -type=TXT _verify.www.clientdomain.com
nslookup -type=CNAME www.clientdomain.com
```

If you used an A record instead of CNAME:

```bash
nslookup -type=A www.clientdomain.com
```

## Troubleshooting

- TXT not found: Ensure the name is `_verify.www.clientdomain.com` and the value matches the token.
- Wrong domain: This demo accepts only `www` subdomains.
- Old records: Remove any conflicting CNAME/A records for `www`.
- Still pending: DNS propagation can take time; wait and try again.
