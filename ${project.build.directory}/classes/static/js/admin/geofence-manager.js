
let geofenceMap = null;
let geofencePolygon = null;
let geofencePoints = [];
let currentInstitutionId = null;
let mapMarkers = [];

function openGeofenceModal(institutionId) {
    currentInstitutionId = institutionId;
    const modal = document.getElementById('geofence-modal');
    const backdrop = document.getElementById('gm-backdrop');
    const content = document.getElementById('gm-content');

    modal.classList.remove('hidden');
    setTimeout(() => {
        backdrop.classList.add('opacity-100');
        content.classList.remove('scale-90', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
        
        initGeofenceMap();
        loadGeofenceData(institutionId);
    }, 10);
}

function closeGeofenceModal() {
    const modal = document.getElementById('geofence-modal');
    const backdrop = document.getElementById('gm-backdrop');
    const content = document.getElementById('gm-content');

    content.classList.add('scale-90', 'opacity-0');
    backdrop.classList.remove('opacity-100');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}

function initGeofenceMap() {
    if (geofenceMap) return;

    geofenceMap = L.map('geofence-map').setView([3.848, 11.502], 13); // Default to Yaoundé

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(geofenceMap);

    geofenceMap.on('click', onMapClick);
}

function onMapClick(e) {
    const latlng = e.latlng;
    geofencePoints.push([latlng.lat, latlng.lng]);
    updatePolygon();
}

function updatePolygon() {
    // Clear old markers
    mapMarkers.forEach(m => geofenceMap.removeLayer(m));
    mapMarkers = [];

    // Add markers for each point
    geofencePoints.forEach((p, index) => {
        const marker = L.marker(p, {
            draggable: true,
            icon: L.divIcon({
                className: 'bg-blue-500 w-3 h-3 rounded-full border-2 border-white shadow-lg',
                iconSize: [12, 12]
            })
        }).addTo(geofenceMap);

        marker.on('drag', function (e) {
            geofencePoints[index] = [e.target.getLatLng().lat, e.target.getLatLng().lng];
            updatePolygon(true); // Update without re-creating markers to avoid jitter
        });
        
        mapMarkers.push(marker);
    });

    if (geofencePolygon) {
        geofenceMap.removeLayer(geofencePolygon);
    }

    if (geofencePoints.length > 2) {
        geofencePolygon = L.polygon(geofencePoints, {
            color: '#3b82f6',
            fillColor: '#3b82f6',
            fillOpacity: 0.2
        }).addTo(geofenceMap);
    }
    
    document.getElementById('gm-point-count').textContent = geofencePoints.length;
}

function loadGeofenceData(id) {
    fetch(`/api/admin/institutions/${id}/geofence`)
        .then(res => res.json())
        .then(data => {
            if (data.geofenceData) {
                try {
                    geofencePoints = JSON.parse(data.geofenceData);
                    if (geofencePoints.length > 0) {
                        updatePolygon();
                        geofenceMap.fitBounds(geofencePolygon.getBounds());
                    }
                } catch (e) {
                    console.error("Failed to parse geofence data", e);
                }
            }
            document.getElementById('gm-enabled-toggle').checked = data.geofencingEnabled;
        })
        .catch(err => console.error("Error loading geofence", err));
}

function saveGeofence() {
    if (geofencePoints.length < 3) {
        Swal.fire('Error', 'Please define at least 3 points for the perimeter.', 'error');
        return;
    }

    const payload = {
        geofenceData: JSON.stringify(geofencePoints),
        geofencingEnabled: document.getElementById('gm-enabled-toggle').checked
    };

    fetch(`/api/admin/institutions/${currentInstitutionId}/geofence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(res => {
        if (res.ok) {
            Swal.fire('Success', 'Geofence perimeter saved successfully!', 'success');
            closeGeofenceModal();
        } else {
            Swal.fire('Error', 'Failed to save geofence.', 'error');
        }
    })
    .catch(err => Swal.fire('Error', 'An error occurred while saving.', 'error'));
}

// Search Location
function searchLocation() {
    const query = document.getElementById('gm-search-input').value;
    if (!query) return;

    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`)
        .then(res => res.json())
        .then(data => {
            if (data && data.length > 0) {
                const loc = data[0];
                geofenceMap.setView([loc.lat, loc.lon], 16);
            } else {
                Swal.fire('Not Found', 'Could not locate the specified place.', 'warning');
            }
        });
}

// Event Listeners
document.getElementById('gm-close-btn').addEventListener('click', closeGeofenceModal);
document.getElementById('gm-cancel-btn').addEventListener('click', closeGeofenceModal);
document.getElementById('gm-save-btn').addEventListener('click', saveGeofence);
document.getElementById('gm-clear-btn').addEventListener('click', () => {
    geofencePoints = [];
    updatePolygon();
});
document.getElementById('gm-search-btn').addEventListener('click', searchLocation);
document.getElementById('gm-search-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchLocation();
});
