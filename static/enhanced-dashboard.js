// Enhanced Security Dashboard JavaScript
// מערכת אבטחה מתקדמת - קוד JavaScript

// Global variables
let ws = null;
let isRecording = false;
let isDarkMode = false;
let activityChart = null;
let motionData = [];
let soundData = [];
let timeLabels = [];
let alerts = [];
let mediaItems = {
  photos: [],
  recordings: [],
};
let systemControls = {
  camera: true,
  audio: true,
  motion: true,
  notifications: true,
};

// Initialize the dashboard
document.addEventListener("DOMContentLoaded", function () {
  // Connect to WebSocket
  connectWebSocket();

  // Initialize UI components
  initializeThemeToggle();
  initializeSystemControls();
  initializeSensitivitySliders();
  initializeActionButtons();
  initializeMediaTabs();
  initializeActivityChart();

  // Load initial data
  loadPhotos();
  loadRecordings();

  // Set up periodic updates
  setInterval(updateStats, 2000);
  setInterval(loadPhotos, 30000);
  setInterval(loadRecordings, 30000);

  // Set up fullscreen functionality
  document
    .getElementById("fullscreenBtn")
    .addEventListener("click", toggleFullscreen);

  // Show welcome notification
  showNotification(
    "ברוך הבא למערכת האבטחה המתקדמת",
    "המערכת פעילה ומנטרת את הסביבה.",
    "info"
  );
});

// WebSocket connection
function connectWebSocket() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

  ws.onopen = function () {
    document.getElementById("connectionStatus").className =
      "connection-status connected";
    document.getElementById("connectionStatus").innerHTML =
      '<i class="fas fa-wifi"></i> <span>מחובר</span>';
    showNotification("חיבור הושלם", "המערכת מחוברת לשרת בהצלחה", "success");
  };

  ws.onclose = function () {
    document.getElementById("connectionStatus").className =
      "connection-status disconnected";
    document.getElementById("connectionStatus").innerHTML =
      '<i class="fas fa-wifi"></i> <span>מנותק</span>';
    showNotification("החיבור נותק", "מנסה להתחבר מחדש...", "error");

    // Try to reconnect
    setTimeout(connectWebSocket, 3000);
  };

  ws.onmessage = function (event) {
    const message = JSON.parse(event.data);
    handleWebSocketMessage(message);
  };
}

// Handle WebSocket messages
function handleWebSocketMessage(message) {
  console.log("Received message:", message);

  switch (message.type) {
    case "stats_update":
      updateStats(message.data);
      break;

    case "motion_alert":
      handleMotionAlert(message);
      break;

    case "audio_alert":
      handleAudioAlert(message);
      break;

    case "photo_captured":
      showNotification("תמונה נשמרה", "תמונה חדשה נשמרה בהצלחה", "success");
      loadPhotos();
      break;

    case "recording_saved":
      showNotification(
        "הקלטה נשמרה",
        "הקלטת אודיו חדשה נשמרה בהצלחה",
        "success"
      );
      loadRecordings();
      break;

    case "sensitivity_changed":
      showNotification(
        "רגישות עודכנה",
        `רגישות זיהוי תנועה עודכנה ל-${message.level}`,
        "info"
      );
      break;

    case "voice_message":
      showNotification(
        "הודעה קולית",
        `הודעה קולית הושמעה: "${message.text}"`,
        "info"
      );
      break;
  }
}

// Update statistics
function updateStats(data) {
  if (!data) return;

  // Update counters
  if (data.motion_count !== undefined) {
    document.getElementById("motionCount").textContent = data.motion_count;
  }

  if (data.sound_alerts !== undefined) {
    document.getElementById("soundCount").textContent = data.sound_alerts;
  }

  // Update last motion time
  if (data.last_motion) {
    const lastMotion = new Date(data.last_motion);
    document.getElementById("lastMotion").textContent =
      lastMotion.toLocaleTimeString("he-IL");
  }

  // Update uptime
  if (data.uptime) {
    const uptime = new Date() - new Date(data.uptime);
    const minutes = Math.floor(uptime / 60000);
    const hours = Math.floor(minutes / 60);
    document.getElementById("uptime").textContent =
      `${hours.toString().padStart(2, "0")}:${(minutes % 60).toString().padStart(2, "0")}`;
  }

  // Update audio visualization
  if (data.audio_stats) {
    const volumePercent = Math.min(data.audio_stats.current_volume * 100, 100);
    document.getElementById("volumeFill").style.width = volumePercent + "%";
    document.getElementById("volumeText").textContent =
      data.audio_stats.current_db.toFixed(1) + " dB";

    // Update audio indicator
    const audioIndicator = document.getElementById("audioIndicator");
    if (data.audio_stats.current_volume > 0.05) {
      audioIndicator.innerHTML =
        '<i class="fas fa-volume-up fa-2x text-warning"></i><div class="mt-2 text-light">קול זוהה</div>';
    } else {
      audioIndicator.innerHTML =
        '<i class="fas fa-microphone fa-2x text-success"></i><div class="mt-2 text-light">מאזין...</div>';
    }

    // Update activity chart
    updateActivityChart(data);
  }

  // Update recording status
  if (data.is_recording !== undefined) {
    isRecording = data.is_recording;
    updateRecordingUI();
  }

  // Update system status indicators
  updateSystemStatus(data);
}

// Handle motion alerts
function handleMotionAlert(alert) {
  // Show motion status badge
  const badge = document.getElementById("motionStatus");
  badge.style.display = "flex";
  badge.classList.add("status-live");

  // Hide after 3 seconds
  setTimeout(() => {
    badge.style.display = "none";
    badge.classList.remove("status-live");
  }, 3000);

  // Add alert to list
  addAlert({
    type: "motion",
    timestamp: new Date(alert.timestamp),
    details: `תנועה זוהתה - שטח: ${alert.area.toLocaleString()} פיקסלים`,
    count: alert.count,
  });

  // Show notification if enabled
  if (systemControls.notifications) {
    showNotification(
      "זוהתה תנועה!",
      `תנועה זוהתה בשטח של ${alert.area.toLocaleString()} פיקסלים`,
      "warning"
    );
  }
}

// Handle audio alerts
function handleAudioAlert(alert) {
  // Add alert to list
  addAlert({
    type: "sound",
    timestamp: new Date(alert.timestamp),
    details: `קול זוהה - עוצמה: ${alert.db_level.toFixed(1)} dB`,
    sound_type: alert.sound_type,
  });

  // Show notification if enabled
  if (systemControls.notifications) {
    showNotification(
      "זוהה קול!",
      `קול מסוג ${alert.sound_type} זוהה בעוצמה ${alert.db_level.toFixed(1)} dB`,
      "info"
    );
  }
}

// Add alert to the alerts list
function addAlert(alert) {
  alerts.unshift(alert);

  // Keep only the last 20 alerts
  if (alerts.length > 20) {
    alerts = alerts.slice(0, 20);
  }

  updateAlertsList();
}

// Update the alerts list in the UI
function updateAlertsList() {
  const alertsContainer = document.getElementById("alertsList");
  if (!alertsContainer) return;

  if (alerts.length === 0) {
    alertsContainer.innerHTML =
      '<div class="text-muted text-center">אין התראות</div>';
    return;
  }

  alertsContainer.innerHTML = alerts
    .map((alert) => {
      const iconClass = alert.type === "motion" ? "fa-running" : "fa-volume-up";
      const alertClass = alert.type === "motion" ? "" : "sound";

      return `
            <div class="alert-item ${alertClass}">
                <div class="alert-icon">
                    <i class="fas ${iconClass}"></i>
                </div>
                <div class="alert-content">
                    <div><strong>${alert.timestamp.toLocaleTimeString("he-IL")}</strong></div>
                    <div>${alert.details}</div>
                </div>
            </div>
        `;
    })
    .join("");
}

// Load photos from the server
function loadPhotos() {
  fetch("/api/captures")
    .then((response) => response.json())
    .then((photos) => {
      mediaItems.photos = photos;
      document.getElementById("capturesCount").textContent = photos.length;
      updateMediaGrid("photos");
    })
    .catch((error) => console.error("Error loading photos:", error));
}

// Load recordings from the server
function loadRecordings() {
  fetch("/api/recordings")
    .then((response) => response.json())
    .then((recordings) => {
      mediaItems.recordings = recordings;
      document.getElementById("recordingsCount").textContent =
        recordings.length;
      updateMediaGrid("recordings");
    })
    .catch((error) => console.error("Error loading recordings:", error));
}

// Update media grid based on type (photos or recordings)
function updateMediaGrid(type) {
  const gridContainer = document.getElementById(`${type}Grid`);
  if (!gridContainer) return;

  const items = mediaItems[type];

  if (items.length === 0) {
    gridContainer.innerHTML = `<div class="text-muted text-center">אין ${type === "photos" ? "תמונות" : "הקלטות"}</div>`;
    return;
  }

  if (type === "photos") {
    gridContainer.innerHTML = items
      .slice(0, 12)
      .map(
        (item) => `
            <div class="media-item" data-fancybox="gallery" data-src="/captures/${item.filename}">
                <img src="/captures/${item.filename}" alt="${item.filename}">
                <div class="media-overlay">
                    ${new Date(item.created).toLocaleTimeString("he-IL")}
                </div>
                <div class="media-actions">
                    <button class="media-action-btn" onclick="downloadMedia('${item.filename}', 'photo'); event.stopPropagation();">
                        <i class="fas fa-download"></i>
                    </button>
                    <button class="media-action-btn" onclick="deleteMedia('${item.filename}', 'photo'); event.stopPropagation();">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `
      )
      .join("");
  } else {
    gridContainer.innerHTML = items
      .slice(0, 12)
      .map(
        (item) => `
            <div class="media-item">
                <audio src="/recordings/${item.filename}" controls></audio>
                <div class="media-overlay">
                    ${new Date(item.created).toLocaleTimeString("he-IL")}
                </div>
                <div class="media-actions">
                    <button class="media-action-btn" onclick="downloadMedia('${item.filename}', 'recording'); event.stopPropagation();">
                        <i class="fas fa-download"></i>
                    </button>
                    <button class="media-action-btn" onclick="deleteMedia('${item.filename}', 'recording'); event.stopPropagation();">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `
      )
      .join("");
  }

  // Initialize Fancybox for photos
  if (type === "photos" && typeof Fancybox !== "undefined") {
    Fancybox.bind('[data-fancybox="gallery"]', {
      caption: function (fancybox, slide) {
        return slide.caption || slide.thumbSrc.split("/").pop();
      },
    });
  }
}

// Download media file
function downloadMedia(filename, type) {
  const path =
    type === "photo" ? `/captures/${filename}` : `/recordings/${filename}`;
  const a = document.createElement("a");
  a.href = path;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// Delete media file
function deleteMedia(filename, type) {
  if (
    !confirm(
      `האם אתה בטוח שברצונך למחוק את ה${type === "photo" ? "תמונה" : "הקלטה"}?`
    )
  ) {
    return;
  }

  const endpoint =
    type === "photo" ? "/api/delete_capture" : "/api/delete_recording";

  fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ filename }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        showNotification(
          "נמחק בהצלחה",
          `ה${type === "photo" ? "תמונה" : "הקלטה"} נמחקה בהצלחה`,
          "success"
        );
        if (type === "photo") {
          loadPhotos();
        } else {
          loadRecordings();
        }
      } else {
        showNotification(
          "שגיאה במחיקה",
          data.message || "אירעה שגיאה במחיקת הקובץ",
          "error"
        );
      }
    })
    .catch((error) => {
      console.error("Error deleting media:", error);
      showNotification("שגיאה במחיקה", "אירעה שגיאה בתקשורת עם השרת", "error");
    });
}

// Initialize theme toggle
function initializeThemeToggle() {
  const themeToggle = document.getElementById("themeToggle");

  themeToggle.addEventListener("click", function () {
    isDarkMode = !isDarkMode;

    if (isDarkMode) {
      document.documentElement.setAttribute("data-bs-theme", "dark");
      themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    } else {
      document.documentElement.removeAttribute("data-bs-theme");
      themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    }
  });
}

// Initialize system control buttons
function initializeSystemControls() {
  document
    .getElementById("cameraToggle")
    .addEventListener("click", function () {
      systemControls.camera = !systemControls.camera;
      updateSystemControlUI("camera", systemControls.camera);
      sendCommand("toggle_camera", { enabled: systemControls.camera });
    });

  document.getElementById("audioToggle").addEventListener("click", function () {
    systemControls.audio = !systemControls.audio;
    updateSystemControlUI("audio", systemControls.audio);
    sendCommand("toggle_audio", { enabled: systemControls.audio });
  });

  document
    .getElementById("motionToggle")
    .addEventListener("click", function () {
      systemControls.motion = !systemControls.motion;
      updateSystemControlUI("motion", systemControls.motion);
      sendCommand("toggle_motion", { enabled: systemControls.motion });
    });

  document
    .getElementById("notificationsToggle")
    .addEventListener("click", function () {
      systemControls.notifications = !systemControls.notifications;
      updateSystemControlUI("notifications", systemControls.notifications);

      if (systemControls.notifications) {
        showNotification(
          "התראות הופעלו",
          "התראות מערכת הופעלו בהצלחה",
          "success"
        );
      }
    });
}

// Update system control UI
function updateSystemControlUI(control, enabled) {
  const button = document.getElementById(`${control}Toggle`);

  if (enabled) {
    button.classList.remove("inactive");
    button.classList.add("active");
  } else {
    button.classList.remove("active");
    button.classList.add("inactive");
  }
}

// Initialize sensitivity sliders
function initializeSensitivitySliders() {
  const motionSlider = document.getElementById("sensitivitySlider");
  const motionValue = document.getElementById("sensitivityValue");

  motionSlider.addEventListener("input", function () {
    const value = this.value;
    let sensitivityText = "";

    if (value <= 3) {
      sensitivityText = "רגישות נמוכה";
    } else if (value <= 7) {
      sensitivityText = "רגישות בינונית";
    } else {
      sensitivityText = "רגישות גבוהה";
    }

    motionValue.textContent = `${sensitivityText} (${value})`;
  });

  motionSlider.addEventListener("change", function () {
    const value = this.value;
    let level = "medium";

    if (value <= 3) {
      level = "low";
    } else if (value <= 7) {
      level = "medium";
    } else {
      level = "high";
    }

    sendCommand("change_sensitivity", { level });
  });

  const audioSlider = document.getElementById("audioSensitivitySlider");
  const audioValue = document.getElementById("audioSensitivityValue");

  audioSlider.addEventListener("input", function () {
    const value = this.value;
    let sensitivityText = "";

    if (value <= 3) {
      sensitivityText = "רגישות נמוכה";
    } else if (value <= 7) {
      sensitivityText = "רגישות בינונית";
    } else {
      sensitivityText = "רגישות גבוהה";
    }

    audioValue.textContent = `${sensitivityText} (${value})`;
  });

  audioSlider.addEventListener("change", function () {
    const value = this.value;
    let threshold = 0.12; // Default medium

    if (value <= 3) {
      threshold = 0.2; // Low
    } else if (value <= 7) {
      threshold = 0.12; // Medium
    } else {
      threshold = 0.06; // High
    }

    sendCommand("change_audio_sensitivity", { threshold });

    // Update threshold display
    const thresholdDb = Math.round(20 * Math.log10(threshold) + 60);
    document.getElementById("audioThreshold").textContent =
      `סף: ${thresholdDb} dB`;
  });
}

// Initialize action buttons
function initializeActionButtons() {
  document.getElementById("captureBtn").addEventListener("click", function () {
    sendCommand("capture_photo");
  });

  document.getElementById("recordBtn").addEventListener("click", function () {
    if (!isRecording) {
      sendCommand("start_recording");
      isRecording = true;
      updateRecordingUI();
    }
  });

  document
    .getElementById("stopRecordBtn")
    .addEventListener("click", function () {
      if (isRecording) {
        sendCommand("stop_recording");
        isRecording = false;
        updateRecordingUI();
      }
    });

  document
    .getElementById("playVoiceBtn")
    .addEventListener("click", function () {
      const text = prompt("הזן את ההודעה להשמעה:");
      if (text) {
        sendCommand("play_voice", { text });
      }
    });

  document.getElementById("refreshBtn").addEventListener("click", function () {
    location.reload();
  });
}

// Update recording UI based on recording state
function updateRecordingUI() {
  const recordBtn = document.getElementById("recordBtn");
  const stopRecordBtn = document.getElementById("stopRecordBtn");
  const recordingStatus = document.getElementById("recordingStatus");

  if (isRecording) {
    recordBtn.style.display = "none";
    stopRecordBtn.style.display = "flex";
    recordingStatus.style.display = "flex";
  } else {
    recordBtn.style.display = "flex";
    stopRecordBtn.style.display = "none";
    recordingStatus.style.display = "none";
  }
}

// Initialize media tabs
function initializeMediaTabs() {
  // Create tab content containers if they don't exist
  const tabContent = document.createElement("div");
  tabContent.className = "tab-content";
  tabContent.id = "mediaTabContent";

  const photosPane = document.createElement("div");
  photosPane.className = "tab-pane fade show active";
  photosPane.id = "photos";
  photosPane.setAttribute("role", "tabpanel");

  const recordingsPane = document.createElement("div");
  recordingsPane.className = "tab-pane fade";
  recordingsPane.id = "recordings";
  recordingsPane.setAttribute("role", "tabpanel");

  // Add search and filter UI to photos pane
  photosPane.innerHTML = `
        <div class="search-bar">
            <i class="fas fa-search"></i>
            <input type="text" id="photoSearch" placeholder="חיפוש תמונות...">
        </div>
        <div class="filter-buttons">
            <button class="filter-btn active" data-filter="all">הכל</button>
            <button class="filter-btn" data-filter="motion">תנועה</button>
            <button class="filter-btn" data-filter="manual">ידני</button>
        </div>
        <div id="photosGrid" class="media-grid"></div>
    `;

  // Add search and filter UI to recordings pane
  recordingsPane.innerHTML = `
        <div class="search-bar">
            <i class="fas fa-search"></i>
            <input type="text" id="recordingSearch" placeholder="חיפוש הקלטות...">
        </div>
        <div class="filter-buttons">
            <button class="filter-btn active" data-filter="all">הכל</button>
            <button class="filter-btn" data-filter="auto">אוטומטי</button>
            <button class="filter-btn" data-filter="manual">ידני</button>
        </div>
        <div id="recordingsGrid" class="media-grid"></div>
    `;

  // Append to tab content
  tabContent.appendChild(photosPane);
  tabContent.appendChild(recordingsPane);

  // Find the media card body and append the tab content
  const mediaCardBody = document.querySelector(
    ".card-header:has(> h5 > i.fa-photo-video)"
  ).nextElementSibling;
  mediaCardBody.appendChild(tabContent);

  // Add event listeners for search and filter
  setTimeout(() => {
    // Photo search
    const photoSearch = document.getElementById("photoSearch");
    if (photoSearch) {
      photoSearch.addEventListener("input", function () {
        filterMedia("photos", this.value);
      });
    }

    // Recording search
    const recordingSearch = document.getElementById("recordingSearch");
    if (recordingSearch) {
      recordingSearch.addEventListener("input", function () {
        filterMedia("recordings", this.value);
      });
    }

    // Photo filters
    const photoFilters = document.querySelectorAll("#photos .filter-btn");
    photoFilters.forEach((btn) => {
      btn.addEventListener("click", function () {
        photoFilters.forEach((b) => b.classList.remove("active"));
        this.classList.add("active");
        filterMedia("photos", photoSearch.value, this.dataset.filter);
      });
    });

    // Recording filters
    const recordingFilters = document.querySelectorAll(
      "#recordings .filter-btn"
    );
    recordingFilters.forEach((btn) => {
      btn.addEventListener("click", function () {
        recordingFilters.forEach((b) => b.classList.remove("active"));
        this.classList.add("active");
        filterMedia("recordings", recordingSearch.value, this.dataset.filter);
      });
    });
  }, 500);
}

// Filter media based on search text and filter type
function filterMedia(type, searchText, filterType = "all") {
  const items = mediaItems[type];
  let filtered = items;

  // Apply search filter
  if (searchText) {
    const searchLower = searchText.toLowerCase();
    filtered = filtered.filter(
      (item) =>
        item.filename.toLowerCase().includes(searchLower) ||
        new Date(item.created).toLocaleString("he-IL").includes(searchLower)
    );
  }

  // Apply type filter
  if (filterType !== "all") {
    filtered = filtered.filter((item) => {
      if (type === "photos") {
        return item.filename.startsWith(filterType);
      } else {
        return item.filename.startsWith(filterType);
      }
    });
  }

  // Update the grid with filtered items
  const gridContainer = document.getElementById(`${type}Grid`);
  if (!gridContainer) return;

  if (filtered.length === 0) {
    gridContainer.innerHTML = `<div class="text-muted text-center">לא נמצאו ${type === "photos" ? "תמונות" : "הקלטות"}</div>`;
    return;
  }

  // Use the same rendering logic as updateMediaGrid but with filtered items
  if (type === "photos") {
    gridContainer.innerHTML = filtered
      .slice(0, 24)
      .map(
        (item) => `
            <div class="media-item" data-fancybox="gallery" data-src="/captures/${item.filename}">
                <img src="/captures/${item.filename}" alt="${item.filename}">
                <div class="media-overlay">
                    ${new Date(item.created).toLocaleTimeString("he-IL")}
                </div>
                <div class="media-actions">
                    <button class="media-action-btn" onclick="downloadMedia('${item.filename}', 'photo'); event.stopPropagation();">
                        <i class="fas fa-download"></i>
                    </button>
                    <button class="media-action-btn" onclick="deleteMedia('${item.filename}', 'photo'); event.stopPropagation();">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `
      )
      .join("");
  } else {
    gridContainer.innerHTML = filtered
      .slice(0, 24)
      .map(
        (item) => `
            <div class="media-item">
                <audio src="/recordings/${item.filename}" controls></audio>
                <div class="media-overlay">
                    ${new Date(item.created).toLocaleTimeString("he-IL")}
                </div>
                <div class="media-actions">
                    <button class="media-action-btn" onclick="downloadMedia('${item.filename}', 'recording'); event.stopPropagation();">
                        <i class="fas fa-download"></i>
                    </button>
                    <button class="media-action-btn" onclick="deleteMedia('${item.filename}', 'recording'); event.stopPropagation();">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `
      )
      .join("");
  }

  // Reinitialize Fancybox for photos
  if (type === "photos" && typeof Fancybox !== "undefined") {
    Fancybox.bind('[data-fancybox="gallery"]');
  }
}

// Initialize activity chart
function initializeActivityChart() {
  const ctx = document.getElementById("activityChart");
  if (!ctx) return;

  // Initialize with empty data
  for (let i = 0; i < 10; i++) {
    timeLabels.push("");
    motionData.push(0);
    soundData.push(0);
  }

  activityChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: timeLabels,
      datasets: [
        {
          label: "תנועה",
          data: motionData,
          borderColor: "#ff6b6b",
          backgroundColor: "rgba(255, 107, 107, 0.1)",
          tension: 0.4,
          fill: true,
        },
        {
          label: "קול",
          data: soundData,
          borderColor: "#4e54c8",
          backgroundColor: "rgba(78, 84, 200, 0.1)",
          tension: 0.4,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top",
          labels: {
            font: {
              family: "Segoe UI, Tahoma, Geneva, Verdana, sans-serif",
            },
          },
        },
        tooltip: {
          mode: "index",
          intersect: false,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0,
          },
        },
      },
    },
  });
}

// Update activity chart with new data
function updateActivityChart(data) {
  if (!activityChart) return;

  // Add new data point
  const now = new Date();
  timeLabels.push(
    now.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })
  );

  // Add motion data
  if (data.motion_stats && data.motion_stats.recent_count !== undefined) {
    motionData.push(data.motion_stats.recent_count);
  } else {
    // If no new data, use previous value or 0
    motionData.push(
      motionData.length > 0 ? motionData[motionData.length - 1] : 0
    );
  }

  // Add sound data
  if (data.audio_stats && data.audio_stats.alerts_count !== undefined) {
    soundData.push(data.audio_stats.alerts_count);
  } else {
    // If no new data, use previous value or 0
    soundData.push(soundData.length > 0 ? soundData[soundData.length - 1] : 0);
  }

  // Remove oldest data point if we have more than 10
  if (timeLabels.length > 10) {
    timeLabels.shift();
    motionData.shift();
    soundData.shift();
  }

  // Update chart
  activityChart.update();
}

// Update system status based on data
function updateSystemStatus(data) {
  // Update camera status
  if (data.camera_active !== undefined) {
    systemControls.camera = data.camera_active;
    updateSystemControlUI("camera", systemControls.camera);

    const videoStatus = document.getElementById("videoStatus");
    if (videoStatus) {
      if (data.camera_active) {
        videoStatus.className = "status-badge status-live";
        videoStatus.innerHTML = '<i class="fas fa-video"></i> שידור חי';
      } else {
        videoStatus.className = "status-badge status-offline";
        videoStatus.innerHTML =
          '<i class="fas fa-video-slash"></i> מצלמה כבויה';
      }
    }
  }

  // Update audio status
  if (data.audio_active !== undefined) {
    systemControls.audio = data.audio_active;
    updateSystemControlUI("audio", systemControls.audio);

    const audioStatus = document.getElementById("audioStatus");
    if (audioStatus) {
      if (data.audio_active) {
        audioStatus.className = "status-badge status-audio";
        audioStatus.innerHTML = '<i class="fas fa-microphone"></i> אודיו פעיל';
      } else {
        audioStatus.className = "status-badge status-offline";
        audioStatus.innerHTML =
          '<i class="fas fa-microphone-slash"></i> אודיו כבוי';
      }
    }
  }
}

// Toggle fullscreen for video container
function toggleFullscreen() {
  const videoContainer = document.getElementById("videoContainer");

  if (!document.fullscreenElement) {
    if (videoContainer.requestFullscreen) {
      videoContainer.requestFullscreen();
    } else if (videoContainer.mozRequestFullScreen) {
      // Firefox
      videoContainer.mozRequestFullScreen();
    } else if (videoContainer.webkitRequestFullscreen) {
      // Chrome, Safari and Opera
      videoContainer.webkitRequestFullscreen();
    } else if (videoContainer.msRequestFullscreen) {
      // IE/Edge
      videoContainer.msRequestFullscreen();
    }
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }
  }
}

// Show notification
function showNotification(title, message, type = "info") {
  const notificationCenter = document.getElementById("notificationCenter");
  if (!notificationCenter) return;

  const toast = document.createElement("div");
  toast.className = "toast show";
  toast.setAttribute("role", "alert");
  toast.setAttribute("aria-live", "assertive");
  toast.setAttribute("aria-atomic", "true");

  toast.innerHTML = `
        <div class="toast-header">
            <strong class="me-auto">${title}</strong>
            <small>${new Date().toLocaleTimeString("he-IL")}</small>
            <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
        <div class="toast-body">
            ${message}
        </div>
    `;

  notificationCenter.appendChild(toast);

  // Remove after 5 seconds
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => {
      notificationCenter.removeChild(toast);
    }, 300);
  }, 5000);
}

// Send command to server
function sendCommand(type, data = {}) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    const command = { type, ...data };
    ws.send(JSON.stringify(command));
    console.log("Sent command:", command);
  } else {
    console.error("WebSocket not connected");
    showNotification(
      "שגיאת תקשורת",
      "לא ניתן לשלוח פקודה - אין חיבור לשרת",
      "error"
    );
  }
}
