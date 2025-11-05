# Changelog

## [Unreleased] - 2025-11-05

### Added
- Environment variable configuration support via `.env` file
- `.env.example` template file for configuration
- Comprehensive logging system throughout the application
- Graceful shutdown handler for camera resources
- Exponential backoff for WebSocket reconnection
- Better error handling in JavaScript for Chart.js initialization
- Configuration documentation in CONFIGURATION.md
- Python type hints for better code quality

### Changed
- Updated FastAPI from 0.104.1 to 0.115.5
- Updated uvicorn from 0.24.0 to 0.34.0
- Updated websockets from 12.0 to 14.1
- Updated opencv-python from 4.7.0.72 to 4.10.0.84
- Updated numpy from 1.24.3 to 1.26.4
- Updated python-multipart from 0.0.6 to 0.0.20
- Replaced print statements with proper logging
- Improved error handling in all API endpoints
- Enhanced WebSocket error handling
- Better camera initialization with fallback mode

### Fixed
- Removed duplicate StreamingResponse import
- Fixed hardcoded dependency on webcam_monitor module
- Added error handling for missing template files
- Fixed WebSocket reconnection without backoff
- Added proper error handling for video frame generation
- Fixed potential crash when camera is not available

### Security
- Added `.env` to .gitignore to prevent credential leaks
- Updated dependencies to latest secure versions
- Added proper error status codes in HTTP responses

### Improved
- README with better installation instructions
- Code organization and structure
- Error messages are more informative
- WebSocket connection stability
- Camera fallback mechanism

## Previous Versions

See git history for earlier changes.
