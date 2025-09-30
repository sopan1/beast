# SOCKS5 Proxy Connection Fix Guide

## Problem Diagnosis
Your SOCKS5 proxy is not connecting because of one of these common issues:

### 1. **Proxy Server Not Running**
- The SOCKS5 proxy server is not running on the specified host/port
- Error: `connect ECONNREFUSED`

### 2. **Wrong Configuration**
- Incorrect proxy host, port, username, or password
- Wrong proxy format in the application

### 3. **Network Issues**
- Firewall blocking the connection
- Network connectivity problems
- DNS resolution issues

## Solutions

### ✅ Solution 1: Verify Your SOCKS5 Proxy Configuration

**Test your actual SOCKS5 proxy using our troubleshooter:**
```bash
# Replace with your actual proxy details
node socks5-troubleshooter.js YOUR_PROXY_HOST:YOUR_PROXY_PORT
node socks5-troubleshooter.js YOUR_PROXY_HOST:YOUR_PROXY_PORT:USERNAME:PASSWORD

# Examples:
node socks5-troubleshooter.js 192.168.1.100:1080
node socks5-troubleshooter.js proxy.example.com:1080:myuser:mypass
```

### ✅ Solution 2: Check Proxy Server Status

**If you're using a third-party SOCKS5 proxy:**
1. Contact your proxy provider to verify the server is running
2. Check if your IP is whitelisted (if required)
3. Verify the correct hostname, port, username, and password

**If you're running your own SOCKS5 server:**
1. Make sure the SOCKS5 server software is running
2. Check the server logs for any errors
3. Verify the port is not blocked by firewall

### ✅ Solution 3: Enhanced Proxy Configuration in BeastBrowser

The application already has robust SOCKS5 support. Make sure you're configuring it correctly:

**Supported Proxy Formats:**
- `host:port` (no authentication)
- `host:port:username:password` (with authentication)
- `socks5://host:port` (URL format)
- `socks5://username:password@host:port` (URL with auth)

**Configuration Steps:**
1. Open BeastBrowser
2. Go to Profile Settings
3. Enter your SOCKS5 proxy in one of the supported formats
4. Select "SOCKS5" as the proxy type
5. Save and test the connection

### ✅ Solution 4: Test with a Free SOCKS5 Proxy

For testing purposes, you can use a free SOCKS5 proxy:

**Free SOCKS5 Proxies (for testing only):**
- Many free proxy lists are available online
- Search for "free SOCKS5 proxy list"
- Use format: `host:port` or `host:port:user:pass`

**⚠️ Warning:** Free proxies may be unreliable and not suitable for production use.

### ✅ Solution 5: Alternative Solutions

**If SOCKS5 continues to fail, try these alternatives:**

1. **Use HTTP/HTTPS Proxy Instead:**
   - Many proxy providers offer HTTP/HTTPS proxies
   - Format: `http://host:port` or `https://host:port`
   - Often more compatible than SOCKS5

2. **Use Built-in Proxy Auto-Detection:**
   - The app can automatically detect and configure proxies
   - Enable "Auto-detect proxy" in settings

3. **Try Different SOCKS5 Providers:**
   - Different providers have different configurations
   - Some may work better with your network setup

## Testing Commands

**Quick test with your actual proxy:**
```bash
# Test proxy format and basic connectivity
node test-socks5-connection.js

# Full diagnostic with your proxy
node socks5-troubleshooter.js YOUR_ACTUAL_PROXY_HERE
```

## Common Error Messages and Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| `ECONNREFUSED` | Proxy server not running or wrong port | Verify proxy server status and port |
| `ENOTFOUND` | Wrong hostname/IP | Check proxy hostname/IP address |
| `ETIMEDOUT` | Network connectivity issues | Check firewall and network connection |
| `Authentication failed` | Wrong username/password | Verify proxy credentials |
| `Connection not allowed` | IP not whitelisted | Contact proxy provider |

## Next Steps

1. **Identify your actual SOCKS5 proxy details**
2. **Test using the troubleshooter tool**
3. **Configure BeastBrowser with correct proxy format**
4. **If issues persist, try HTTP proxy instead**

## Need Help?

If you're still experiencing issues:
1. Run the troubleshooter with your actual proxy
2. Share the error message output
3. Provide your proxy configuration format
4. We can provide specific guidance based on the errors

The SOCKS5 implementation in BeastBrowser is robust and handles most proxy configurations correctly. The issue is likely with the proxy server itself or the configuration format.