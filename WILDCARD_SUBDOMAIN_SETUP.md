# Wildcard Subdomain Setup for cms.test

Wildcards (`*.cms.test`) don't work in `/etc/hosts` on macOS. Here are two solutions:

## Solution 1: Use dnsmasq (Recommended)

This provides true wildcard subdomain support.

### Installation

```bash
# Install dnsmasq via Homebrew
brew install dnsmasq
```

### Configuration

1. **Configure dnsmasq:**

   ```bash
   echo 'address=/.cms.test/127.0.0.1' >> $(brew --prefix)/etc/dnsmasq.conf
   ```

2. **Start dnsmasq:**

   ```bash
   sudo brew services start dnsmasq
   ```

3. **Create resolver for cms.test:**

   ```bash
   sudo mkdir -p /etc/resolver
   echo 'nameserver 127.0.0.1' | sudo tee /etc/resolver/cms.test
   ```

4. **Flush DNS cache:**
   ```bash
   sudo dscacheutil -flushcache
   sudo killall -HUP mDNSResponder
   ```

### Verification

Test that wildcard works:

```bash
ping example.cms.test
# Should resolve to 127.0.0.1
```

## Solution 2: Add Individual Subdomains (Quick Fix)

If you don't want to install dnsmasq, add each subdomain manually:

```bash
sudo nano /etc/hosts
```

Add entries for each club you create:

```
127.0.0.1 cms.test
127.0.0.1 example.cms.test
127.0.0.1 testclub.cms.test
127.0.0.1 anotherclub.cms.test
```

Then flush DNS:

```bash
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder
```

## Solution 3: Use a Development Proxy (Alternative)

You can also use a tool like `local-ssl-proxy` or `ngrok` for subdomain routing, but dnsmasq is the simplest for local development.

## Troubleshooting

### dnsmasq not working?

1. Check if dnsmasq is running:

   ```bash
   brew services list | grep dnsmasq
   ```

2. Check dnsmasq logs:

   ```bash
   tail -f /usr/local/var/log/dnsmasq.log
   ```

3. Test DNS resolution:
   ```bash
   dig example.cms.test @127.0.0.1
   ```

### Still not working?

1. Remove the `*.cms.test` entry from `/etc/hosts` (it doesn't work anyway):

   ```bash
   sudo nano /etc/hosts
   # Remove the line: 127.0.0.1 *.cms.test
   ```

2. Make sure only `cms.test` is in hosts file:

   ```
   127.0.0.1 cms.test
   ```

3. Use dnsmasq for all subdomains (Solution 1 above)

## Quick Setup Script

Run this to set up dnsmasq automatically:

```bash
#!/bin/bash

# Install dnsmasq if not installed
if ! command -v dnsmasq &> /dev/null; then
    echo "Installing dnsmasq..."
    brew install dnsmasq
fi

# Configure dnsmasq
echo "Configuring dnsmasq..."
echo 'address=/.cms.test/127.0.0.1' >> $(brew --prefix)/etc/dnsmasq.conf

# Create resolver
echo "Creating resolver..."
sudo mkdir -p /etc/resolver
echo 'nameserver 127.0.0.1' | sudo tee /etc/resolver/cms.test

# Start dnsmasq
echo "Starting dnsmasq..."
sudo brew services start dnsmasq

# Flush DNS
echo "Flushing DNS cache..."
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder

echo "✅ Wildcard subdomain setup complete!"
echo "You can now access any subdomain like example.cms.test:3001"
```

Save as `setup-wildcard.sh`, make executable (`chmod +x setup-wildcard.sh`), and run it.
