# Hosts File Setup

To use the `cms.test` domain for local development, you need to add entries to your `/etc/hosts` file.

## macOS / Linux

1. Open a terminal
2. Edit the hosts file:

   ```bash
   sudo nano /etc/hosts
   ```

   or

   ```bash
   sudo vim /etc/hosts
   ```

3. Add these lines at the end of the file:

   ```
   127.0.0.1 cms.test
   127.0.0.1 *.cms.test
   ```

   **Note:** Wildcards (`*.cms.test`) don't work in `/etc/hosts` on all systems. For macOS, you may need to add individual entries for each subdomain you create, or use a tool like `dnsmasq`.

4. Save and exit (Ctrl+X, then Y, then Enter for nano, or `:wq` for vim)

5. Flush DNS cache:
   ```bash
   sudo dkillall -HUP mDNSResponder  # macOS
   # or
   sudo systemd-resolve --flush-caches  # Linux (systemd)
   ```

## Windows

1. Open Notepad as Administrator
2. Open `C:\Windows\System32\drivers\etc\hosts`
3. Add these lines at the end:
   ```
   127.0.0.1 cms.test
   ```
4. Save the file
5. Flush DNS cache:
   ```cmd
   ipconfig /flushdns
   ```

## Alternative: Using dnsmasq (macOS)

For better wildcard subdomain support on macOS:

1. Install dnsmasq:

   ```bash
   brew install dnsmasq
   ```

2. Create configuration:

   ```bash
   echo 'address=/.cms.test/127.0.0.1' >> $(brew --prefix)/etc/dnsmasq.conf
   ```

3. Start dnsmasq:

   ```bash
   sudo brew services start dnsmasq
   ```

4. Add to `/etc/resolver/cms.test`:
   ```bash
   sudo mkdir -p /etc/resolver
   echo 'nameserver 127.0.0.1' | sudo tee /etc/resolver/cms.test
   ```

## Verification

After setup, you should be able to access:

- `http://cms.test:3001` - Frontend landing page
- `http://cms.test:3000` - Backend API
- `http://example.cms.test:3001` - Club subdomain (after creating a club)
