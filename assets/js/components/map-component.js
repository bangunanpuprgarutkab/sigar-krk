/**
 * Optimized Map Component with Performance Enhancements
 * Handles large GeoJSON datasets efficiently
 */

import { debounce, throttle, performanceMonitor, globalCache } from '../utils/performance.js';
import { CONFIG } from '../config.js';

export class MapComponent {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.options = {
            center: CONFIG.DEFAULT_MAP_CENTER,
            zoom: CONFIG.DEFAULT_MAP_ZOOM,
            maxZoom: 18,
            minZoom: 8,
            enableClustering: true,
            enableHeatmap: false,
            tileLayer: CONFIG.MAP_TILE_URL,
            attribution: CONFIG.MAP_ATTRIBUTION,
            ...options
        };
        
        this.map = null;
        this.geoJsonLayer = null;
        this.markerLayer = null;
        this.clusterGroup = null;
        this.heatmapLayer = null;
        
        this.currentData = null;
        this.isInitialized = false;
        this.renderQueue = [];
        this.isRendering = false;
        
        this.init();
    }

    async init() {
        performanceMonitor.startTiming('mapInit');
        
        try {
            await this.loadLeaflet();
            this.initializeMap();
            this.setupEventHandlers();
            this.isInitialized = true;
            
            performanceMonitor.endTiming('mapInit');
        } catch (error) {
            console.error('Map initialization failed:', error);
            performanceMonitor.endTiming('mapInit');
            throw error;
        }
    }

    async loadLeaflet() {
        // Check if Leaflet is already loaded
        if (window.L) return;
        
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    initializeMap() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            throw new Error(`Map container with id '${this.containerId}' not found`);
        }

        // Create map instance
        this.map = L.map(container, {
            center: this.options.center,
            zoom: this.options.zoom,
            maxZoom: this.options.maxZoom,
            minZoom: this.options.minZoom,
            zoomControl: true,
            attributionControl: true,
            preferCanvas: true // Better performance for large datasets
        });

        // Add tile layer
        L.tileLayer(this.options.tileLayer, {
            attribution: this.options.attribution,
            maxZoom: this.options.maxZoom
        }).addTo(this.map);

        // Initialize clustering if enabled
        if (this.options.enableClustering && window.L.markerClusterGroup) {
            this.clusterGroup = L.markerClusterGroup({
                chunkedLoading: true,
                chunkInterval: 200,
                chunkDelay: 50
            });
            this.map.addLayer(this.clusterGroup);
        }

        // Add scale control
        L.control.scale({
            position: 'bottomleft',
            metric: true,
            imperial: false
        }).addTo(this.map);

        // Add loading control
        this.addLoadingControl();
    }

    addLoadingControl() {
        const LoadingControl = L.Control.extend({
            onAdd: function(map) {
                const div = L.DomUtil.create('div', 'leaflet-control-loading');
                div.innerHTML = '<div class="spinner-border spinner-border-sm d-none" role="status"></div>';
                return div;
            }
        });

        this.loadingControl = new LoadingControl({ position: 'topright' });
        this.loadingControl.addTo(this.map);
    }

    setupEventHandlers() {
        // Throttled zoom and pan handlers
        this.map.on('zoomend', throttle(() => {
            this.onZoomChange();
        }, 100));

        this.map.on('moveend', throttle(() => {
            this.onMoveEnd();
        }, 100));

        // Debounced resize handler
        this.map.on('resize', debounce(() => {
            this.onResize();
        }, 250));
    }

    onZoomChange() {
        const zoom = this.map.getZoom();
        
        // Optimize rendering based on zoom level
        if (zoom < 12) {
            this.enableClustering();
        } else {
            this.disableClustering();
        }
        
        // Update marker sizes based on zoom
        this.updateMarkerSizes(zoom);
    }

    onMoveEnd() {
        // Update visible markers based on viewport
        this.updateVisibleMarkers();
    }

    onResize() {
        // Invalidate size to prevent display issues
        this.map.invalidateSize();
    }

    async displayGeoJSON(geoJsonData, options = {}) {
        if (!this.isInitialized) {
            await this.init();
        }

        performanceMonitor.startTiming('displayGeoJSON');
        
        try {
            // Cache the data
            const cacheKey = `geojson_${this.generateDataHash(geoJsonData)}`;
            globalCache.set(cacheKey, geoJsonData);
            
            this.currentData = geoJsonData;
            
            // Clear existing layers
            this.clearLayers();
            
            // Show loading indicator
            this.showLoading();
            
            // Process data in chunks for better performance
            await this.processGeoJSONInChunks(geoJsonData, options);
            
            // Fit bounds to data
            if (this.geoJsonLayer && this.geoJsonLayer.getBounds().isValid()) {
                this.map.fitBounds(this.geoJsonLayer.getBounds(), {
                    padding: [20, 20],
                    maxZoom: 16
                });
            }
            
            // Hide loading indicator
            this.hideLoading();
            
            performanceMonitor.endTiming('displayGeoJSON');
        } catch (error) {
            console.error('Error displaying GeoJSON:', error);
            this.hideLoading();
            performanceMonitor.endTiming('displayGeoJSON');
            throw error;
        }
    }

    async processGeoJSONInChunks(geoJsonData, options) {
        const features = geoJsonData.features || [];
        const chunkSize = 50; // Process 50 features at a time
        
        for (let i = 0; i < features.length; i += chunkSize) {
            const chunk = features.slice(i, i + chunkSize);
            const chunkGeoJSON = {
                type: 'FeatureCollection',
                features: chunk
            };
            
            await this.processGeoJSONChunk(chunkGeoJSON, options);
            
            // Yield control to prevent blocking
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }

    async processGeoJSONChunk(chunkGeoJSON, options) {
        const layer = L.geoJSON(chunkGeoJSON, {
            style: this.getFeatureStyle.bind(this),
            pointToLayer: this.createPointMarker.bind(this),
            onEachFeature: this.onEachFeature.bind(this),
            ...options
        });
        
        if (!this.geoJsonLayer) {
            this.geoJsonLayer = L.layerGroup();
            this.map.addLayer(this.geoJsonLayer);
        }
        
        this.geoJsonLayer.addLayer(layer);
    }

    getFeatureStyle(feature) {
        // Default style with performance optimizations
        return {
            color: '#0D47A1',
            weight: 2,
            opacity: 0.8,
            fillColor: '#4CAF50',
            fillOpacity: 0.3,
            interactive: true
        };
    }

    createPointMarker(feature, latlng) {
        const properties = feature.properties || {};
        const markerIndex = this.getMarkerIndex();
        
        // Create custom marker with number
        const marker = L.circleMarker(latlng, {
            radius: 8,
            fillColor: '#0D47A1',
            color: 'white',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
        });
        
        // Add number label
        const icon = L.divIcon({
            className: 'coordinate-marker-icon',
            html: `<span>${markerIndex}</span>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });
        
        const numberMarker = L.marker(latlng, { icon });
        
        // Group marker and number
        const group = L.layerGroup([marker, numberMarker]);
        
        return group;
    }

    onEachFeature(feature, layer) {
        const properties = feature.properties || {};
        
        // Create popup content
        const popupContent = this.createPopupContent(properties);
        
        if (popupContent) {
            layer.bindPopup(popupContent, {
                maxWidth: 300,
                className: 'custom-popup'
            });
        }
        
        // Add hover effects
        layer.on({
            mouseover: this.highlightFeature.bind(this),
            mouseout: this.resetHighlight.bind(this),
            click: this.onFeatureClick.bind(this)
        });
    }

    createPopupContent(properties) {
        if (!properties || Object.keys(properties).length === 0) {
            return null;
        }
        
        let content = '<div class="popup-content">';
        
        for (const [key, value] of Object.entries(properties)) {
            if (value !== null && value !== undefined && value !== '') {
                content += `<div><strong>${key}:</strong> ${value}</div>`;
            }
        }
        
        content += '</div>';
        return content;
    }

    highlightFeature(e) {
        const layer = e.target;
        
        if (layer.setStyle) {
            layer.setStyle({
                weight: 3,
                opacity: 1,
                fillOpacity: 0.5
            });
            
            if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
                layer.bringToFront();
            }
        }
    }

    resetHighlight(e) {
        if (this.geoJsonLayer && e.target.setStyle) {
            this.geoJsonLayer.resetStyle(e.target);
        }
    }

    onFeatureClick(e) {
        const feature = e.target.feature;
        const properties = feature.properties || {};
        
        // Emit custom event
        this.map.fire('featureclick', {
            feature,
            properties,
            latlng: e.latlng
        });
    }

    addCoordinateMarkers(coordinates) {
        if (!Array.isArray(coordinates)) return;
        
        performanceMonitor.startTiming('addCoordinateMarkers');
        
        // Clear existing markers
        if (this.markerLayer) {
            this.map.removeLayer(this.markerLayer);
        }
        
        this.markerLayer = L.layerGroup();
        
        coordinates.forEach((coord, index) => {
            if (coord.lat && coord.lng) {
                const marker = this.createCoordinateMarker(coord, index + 1);
                this.markerLayer.addLayer(marker);
            }
        });
        
        this.map.addLayer(this.markerLayer);
        
        performanceMonitor.endTiming('addCoordinateMarkers');
    }

    createCoordinateMarker(coord, number) {
        const icon = L.divIcon({
            className: 'coordinate-marker-icon',
            html: `<span>K${number}</span>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });
        
        const marker = L.marker([coord.lat, coord.lng], { icon });
        
        // Add popup with coordinate info
        const popupContent = `
            <div class="coordinate-popup">
                <h6>Koordinat K${number}</h6>
                <p><strong>Latitude:</strong> ${coord.lat}</p>
                <p><strong>Longitude:</strong> ${coord.lng}</p>
                ${coord.elevation ? `<p><strong>Elevasi:</strong> ${coord.elevation}m</p>` : ''}
            </div>
        `;
        
        marker.bindPopup(popupContent);
        
        return marker;
    }

    enableClustering() {
        if (!this.clusterGroup || !this.markerLayer) return;
        
        this.markerLayer.eachLayer(layer => {
            this.clusterGroup.addLayer(layer);
        });
        
        this.map.removeLayer(this.markerLayer);
    }

    disableClustering() {
        if (!this.clusterGroup || !this.markerLayer) return;
        
        this.clusterGroup.clearLayers();
        this.map.addLayer(this.markerLayer);
    }

    updateMarkerSizes(zoom) {
        const size = Math.max(16, Math.min(32, zoom * 2));
        
        if (this.markerLayer) {
            this.markerLayer.eachLayer(layer => {
                if (layer.setIcon) {
                    const currentIcon = layer.getIcon();
                    if (currentIcon.options.iconSize) {
                        currentIcon.options.iconSize = [size, size];
                        currentIcon.options.iconAnchor = [size / 2, size / 2];
                        layer.setIcon(currentIcon);
                    }
                }
            });
        }
    }

    updateVisibleMarkers() {
        const bounds = this.map.getBounds();
        
        if (this.markerLayer) {
            this.markerLayer.eachLayer(layer => {
                const isVisible = bounds.contains(layer.getLatLng());
                layer.getElement().style.display = isVisible ? 'block' : 'none';
            });
        }
    }

    clearLayers() {
        if (this.geoJsonLayer) {
            this.map.removeLayer(this.geoJsonLayer);
            this.geoJsonLayer = null;
        }
        
        if (this.markerLayer) {
            this.map.removeLayer(this.markerLayer);
            this.markerLayer = null;
        }
        
        if (this.clusterGroup) {
            this.clusterGroup.clearLayers();
        }
    }

    showLoading() {
        const spinner = this.map.getContainer().querySelector('.spinner-border');
        if (spinner) {
            spinner.classList.remove('d-none');
        }
    }

    hideLoading() {
        const spinner = this.map.getContainer().querySelector('.spinner-border');
        if (spinner) {
            spinner.classList.add('d-none');
        }
    }

    getMarkerIndex() {
        if (!this.markerLayer) return 1;
        return this.markerLayer.getLayers().length + 1;
    }

    generateDataHash(data) {
        return btoa(JSON.stringify(data)).slice(0, 16);
    }

    // Screenshot functionality
    async captureScreenshot(options = {}) {
        performanceMonitor.startTiming('captureScreenshot');
        
        try {
            // Import html2canvas dynamically
            if (!window.html2canvas) {
                await this.loadHtml2Canvas();
            }
            
            const mapContainer = this.map.getContainer();
            
            const canvas = await html2canvas(mapContainer, {
                useCORS: true,
                allowTaint: true,
                scale: 2,
                backgroundColor: '#ffffff',
                ...options
            });
            
            performanceMonitor.endTiming('captureScreenshot');
            return canvas.toDataURL('image/png');
        } catch (error) {
            console.error('Screenshot capture failed:', error);
            performanceMonitor.endTiming('captureScreenshot');
            throw error;
        }
    }

    async loadHtml2Canvas() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // Utility methods
    fitBounds(bounds, options = {}) {
        if (bounds && bounds.isValid()) {
            this.map.fitBounds(bounds, {
                padding: [10, 10],
                maxZoom: 16,
                ...options
            });
        }
    }

    setView(center, zoom) {
        this.map.setView(center, zoom);
    }

    getCenter() {
        return this.map.getCenter();
    }

    getZoom() {
        return this.map.getZoom();
    }

    getBounds() {
        return this.map.getBounds();
    }

    invalidateSize() {
        this.map.invalidateSize();
    }

    // Event handling
    on(event, handler) {
        this.map.on(event, handler);
    }

    off(event, handler) {
        this.map.off(event, handler);
    }

    // Cleanup
    destroy() {
        if (this.map) {
            this.clearLayers();
            this.map.remove();
            this.map = null;
        }
        
        this.currentData = null;
        this.isInitialized = false;
    }
}
