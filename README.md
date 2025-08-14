# IOT-GAL Enhanced Security Dashboard

מערכת ניטור אבטחה מתקדמת עם ממשק משתמש מודרני

## Overview

The IOT-GAL Enhanced Security Dashboard is a modern, responsive web interface for security monitoring systems. It provides real-time monitoring of video feeds, audio detection, and motion alerts through an intuitive and visually appealing dashboard.

## Features

- **Real-time Monitoring**: Live video feed with motion detection
- **Audio Monitoring**: Sound level visualization and audio alerts
- **Interactive Controls**: Camera, audio, and system function controls
- **Media Management**: View and manage captured photos and audio recordings
- **Activity Charts**: Visual representation of motion and sound detection trends
- **Dark/Light Theme**: Toggle between dark and light modes for different viewing preferences
- **Responsive Design**: Works on desktop and mobile devices
- **WebSocket Communication**: Real-time updates without page refreshes

## Technical Details

The dashboard is built using:

- **Backend**: FastAPI (Python)
- **Frontend**: HTML5, CSS3, JavaScript
- **Real-time Communication**: WebSockets
- **Visualization**: Chart.js
- **UI Components**: Bootstrap 5
- **Icons**: Font Awesome

## Installation

1. Clone the repository:

   ```
   git clone https://github.com/yourusername/IOT-GAL-Dashboard.git
   cd IOT-GAL-Dashboard
   ```

2. Install the required dependencies:

   ```
   pip install -r requirements.txt
   ```

3. Run the application:

   ```
   python app.py
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:8000
   ```

## Integration

This dashboard can be integrated with various security systems by modifying the WebSocket communication protocol to match your system's data format. The current implementation is designed to work with the IOT-GAL security monitoring system.

## License

MIT License

## Credits

Developed as part of the IOT-GAL security monitoring system.
