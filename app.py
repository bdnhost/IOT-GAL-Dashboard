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
from datetime import datetime
import asyncio
from typing import List

app = FastAPI(title="Enhanced Security Dashboard")

# Global variables
connected_clients: List[WebSocket] = []
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
    # This is a demo endpoint that returns sample data
    return [
        {
            "filename": "sample1.jpg",
            "size": 12345,
            "created": datetime.now().isoformat(),
        },
        {
            "filename": "sample2.jpg",
            "size": 23456,
            "created": datetime.now().isoformat(),
        },
    ]


@app.get("/api/recordings")
async def get_recordings():
    """API לקבלת רשימת הקלטות אודיו"""
    # This is a demo endpoint that returns sample data
    return [
        {
            "filename": "audio1.wav",
            "size": 34567,
            "created": datetime.now().isoformat(),
        },
        {
            "filename": "audio2.wav",
            "size": 45678,
            "created": datetime.now().isoformat(),
        },
    ]


# Serve static files
static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")


# For local development
if __name__ == "__main__":
    import uvicorn

    print("🛡️ מפעיל Enhanced Security Dashboard...")
    print("📱 פתח בדפדפן: http://localhost:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)

# This is for Vercel deployment - it needs to import the app variable
# The variable name 'app' is what Vercel looks for by default
