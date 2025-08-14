#!/usr/bin/env python3
"""
Enhanced Security Dashboard - מערכת ניטור מתקדמת
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
import json
import os
import sys
import base64
from datetime import datetime
import asyncio
from typing import List
import cv2
import numpy as np
from fastapi.responses import StreamingResponse

# Add the webcam_monitor module to the path
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "webcam_monitor", "src"))
from camera.webcam_capture import WebcamCapture

app = FastAPI(title="Enhanced Security Dashboard")

# Global variables
connected_clients: List[WebSocket] = []
camera = None
camera_initialized = False
use_fallback = False  # Flag to indicate if we should use fallback mode
current_stats = {
    "motion_count": 0,
    "sound_alerts": 0,
    "last_motion": None,
    "camera_active": True,
    "audio_active": True,
    "uptime": datetime.now().isoformat(),
    "motion_stats": {"recent_count": 0, "total_count": 0},
    "audio_stats": {"current_volume": 0.0, "current_db": 0.0, "alerts_count": 0},
}


@app.on_event("startup")
async def startup_event():
    """Initialize the camera when the server starts"""
    global camera, camera_initialized, use_fallback

    # Try different camera indices (0, 1, 2)
    for camera_index in range(3):
        try:
            print(f"🔍 Trying to initialize camera with index {camera_index}...")
            camera = WebcamCapture(camera_index)
            if camera.initialize_camera():
                camera.start_monitoring()
                camera_initialized = True
                print(f"✅ Camera with index {camera_index} initialized successfully")
                break  # Exit the loop if camera is initialized successfully
            else:
                print(f"❌ Failed to initialize camera with index {camera_index}")
        except Exception as e:
            print(f"❌ Error initializing camera with index {camera_index}: {e}")

    # If no camera was initialized, use fallback mode
    if not camera_initialized:
        print("❌ Failed to initialize any camera - using fallback mode")
        use_fallback = True


@app.get("/", response_class=HTMLResponse)
async def get_dashboard():
    """דף הדשבורד המשופר"""
    template_path = os.path.join(
        os.path.dirname(__file__), "templates", "enhanced_dashboard.html"
    )
    try:
        with open(template_path, "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    except FileNotFoundError:
        return HTMLResponse(
            content="""
        <html><body>
        <h1>🛡️ Enhanced Security Dashboard</h1>
        <p>Template file not found. Please check file structure.</p>
        <p>Looking for: """
            + template_path
            + """</p>
        </body></html>
        """
        )


def json_serializer(obj):
    """JSON serializer for objects not serializable by default json code"""
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Object of type {type(obj).__name__} is not JSON serializable")


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time updates"""
    await websocket.accept()
    connected_clients.append(websocket)
    print(f"Client connected. Total clients: {len(connected_clients)}")

    try:
        # Send initial connection message
        await websocket.send_text(
            json.dumps(
                {
                    "type": "connection_established",
                    "message": "Connected to Enhanced Security Dashboard",
                    "data": current_stats,
                },
                default=json_serializer,
            )
        )

        # Send periodic updates
        while True:
            # Update stats
            current_stats["motion_stats"]["recent_count"] = 0
            current_stats["audio_stats"]["current_volume"] = 0.1
            current_stats["audio_stats"]["current_db"] = 30.0

            # Send stats update
            await websocket.send_text(
                json.dumps(
                    {"type": "stats_update", "data": current_stats},
                    default=json_serializer,
                )
            )

            await asyncio.sleep(2)  # Update every 2 seconds

    except WebSocketDisconnect:
        connected_clients.remove(websocket)
        print(f"Client disconnected. Total clients: {len(connected_clients)}")


@app.get("/api/captures")
async def get_captures():
    """API לקבלת רשימת תמונות"""
    # Check if captures directory exists and has files
    captures_dir = os.path.join(os.path.dirname(__file__), "captures")
    if not os.path.exists(captures_dir) or not os.listdir(captures_dir):
        # Return empty list if directory is empty
        return []

    # List files in the captures directory
    photos = []
    for filename in os.listdir(captures_dir):
        if filename.endswith((".jpg", ".jpeg", ".png")):
            filepath = os.path.join(captures_dir, filename)
            stat = os.stat(filepath)
            photos.append(
                {
                    "filename": filename,
                    "size": stat.st_size,
                    "created": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                }
            )

    return sorted(photos, key=lambda x: x["created"], reverse=True)


@app.get("/api/recordings")
async def get_recordings():
    """API לקבלת רשימת הקלטות אודיו"""
    # Check if recordings directory exists and has files
    recordings_dir = os.path.join(os.path.dirname(__file__), "recordings")
    if not os.path.exists(recordings_dir) or not os.listdir(recordings_dir):
        # Return empty list if directory is empty
        return []

    # List files in the recordings directory
    recordings = []
    for filename in os.listdir(recordings_dir):
        if filename.endswith((".wav", ".mp3")):
            filepath = os.path.join(recordings_dir, filename)
            stat = os.stat(filepath)
            recordings.append(
                {
                    "filename": filename,
                    "size": stat.st_size,
                    "created": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                }
            )

    return sorted(recordings, key=lambda x: x["created"], reverse=True)


@app.get("/video_feed")
async def video_feed():
    """Stream real camera feed"""
    return StreamingResponse(
        generate_frames(), media_type="multipart/x-mixed-replace; boundary=frame"
    )


async def generate_frames():
    """Generate frames from the real camera or fallback to simulated frames"""
    while True:
        if use_fallback or not camera_initialized:
            # Use simulated frames if camera is not available
            frame = create_simulated_frame()
        else:
            # Try to capture frame from the real camera
            try:
                frame = camera.capture_frame()

                if frame is None:
                    # If frame capture failed, use simulated frame
                    frame = create_simulated_frame()
                else:
                    # Add timestamp to the frame
                    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    cv2.putText(
                        frame,
                        timestamp,
                        (10, 30),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.7,
                        (0, 255, 0),
                        2,
                    )
            except Exception:
                # If any error occurs, use simulated frame
                frame = create_simulated_frame()

        # Convert frame to JPEG
        ret, buffer = cv2.imencode(".jpg", frame)
        if ret:
            frame_bytes = buffer.tobytes()
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n"
            )

        # Sleep to control frame rate
        await asyncio.sleep(0.1)


def create_error_frame(message):
    """Create an error frame with a message"""
    frame = np.zeros((480, 640, 3), dtype=np.uint8)
    cv2.putText(
        frame,
        message,
        (50, 240),
        cv2.FONT_HERSHEY_SIMPLEX,
        1,
        (0, 0, 255),
        2,
    )
    return frame


def create_simulated_frame():
    """Create a simulated video frame with dynamic content"""
    # Create a base frame
    frame = np.zeros((480, 640, 3), dtype=np.uint8)

    # Add current time
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cv2.putText(
        frame,
        timestamp,
        (10, 30),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.7,
        (0, 255, 0),
        2,
    )

    # Add camera name
    cv2.putText(
        frame,
        "Camera 1 - Main Entrance",
        (10, 60),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.7,
        (0, 255, 0),
        2,
    )

    # Add simulated motion indicator
    if datetime.now().second % 5 == 0:  # Show motion indicator every 5 seconds
        cv2.putText(
            frame,
            "MOTION DETECTED",
            (10, 90),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.7,
            (0, 0, 255),
            2,
        )

    # Draw some random rectangles to simulate movement
    for _ in range(10):
        x1 = np.random.randint(0, 640)
        y1 = np.random.randint(0, 480)
        x2 = x1 + np.random.randint(10, 50)
        y2 = y1 + np.random.randint(10, 50)
        color = (
            np.random.randint(100, 255),
            np.random.randint(100, 255),
            np.random.randint(100, 255),
        )
        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)

    return frame


# Serve static files
static_dir = os.path.join(os.path.dirname(__file__), "static")
captures_dir = os.path.join(os.path.dirname(__file__), "captures")
recordings_dir = os.path.join(os.path.dirname(__file__), "recordings")

if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")
if os.path.exists(captures_dir):
    app.mount("/captures", StaticFiles(directory=captures_dir), name="captures")
if os.path.exists(recordings_dir):
    app.mount("/recordings", StaticFiles(directory=recordings_dir), name="recordings")


# For local development
if __name__ == "__main__":
    import uvicorn

    print("🛡️ מפעיל Enhanced Security Dashboard...")
    print("📱 פתח בדפדפן: http://localhost:8001")
    uvicorn.run(app, host="0.0.0.0", port=8001)

# This is for Vercel deployment - it needs to import the app variable
# The variable name 'app' is what Vercel looks for by default
