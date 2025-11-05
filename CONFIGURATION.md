# Configuration Guide

## Environment Variables

The application can be configured using environment variables. Create a `.env` file in the project root directory (use `.env.example` as a template).

### Available Configuration Options

#### Server Configuration

- **APP_HOST** (default: `0.0.0.0`)
  - The host address the server will bind to
  - Use `0.0.0.0` to accept connections from any network interface
  - Use `127.0.0.1` for localhost only

- **APP_PORT** (default: `8001`)
  - The port number the server will listen on

- **DEBUG** (default: `false`)
  - Enable debug mode for detailed logging
  - Set to `true` for development, `false` for production

### Logging Configuration

- **LOG_LEVEL** (default: `INFO`)
  - Available levels: `DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL`

### Camera Configuration

- **CAMERA_INDEX** (optional)
  - Specify which camera device to use
  - Default behavior tries indices 0, 1, 2 in order

## Example Configuration

```bash
# Development
APP_HOST=127.0.0.1
APP_PORT=8001
DEBUG=true
LOG_LEVEL=DEBUG

# Production
APP_HOST=0.0.0.0
APP_PORT=8001
DEBUG=false
LOG_LEVEL=INFO
```

## Security Considerations

1. **Never commit `.env` files** to version control
2. Use strong, unique credentials in production
3. Keep DEBUG=false in production
4. Consider using a reverse proxy (nginx/Apache) in production
5. Enable HTTPS for production deployments

## Troubleshooting

### Camera Not Found

If the application can't find your camera:

1. Check camera permissions
2. Try different CAMERA_INDEX values (0, 1, 2)
3. Ensure no other application is using the camera
4. The application will fall back to simulated mode if no camera is found

### Connection Issues

If WebSocket connections fail:

1. Check firewall settings
2. Ensure the port is not blocked
3. Verify CORS settings if accessing from a different domain
