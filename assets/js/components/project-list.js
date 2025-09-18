/**
 * Optimized Project List Component with Virtual Scrolling
 * Handles large project datasets efficiently
 */

import { VirtualScroller, debounce, performanceMonitor } from '../utils/performance.js';
import { projectStorage } from '../core/storage.js';
import { CONFIG } from '../config.js';

export class ProjectListComponent {
    constructor(container, onProjectSelect, onProjectDelete) {
        this.container = container;
        this.onProjectSelect = onProjectSelect;
        this.onProjectDelete = onProjectDelete;
        
        this.projects = [];
        this.filteredProjects = [];
        this.searchQuery = '';
        this.sortBy = 'lastModified';
        this.sortOrder = 'desc';
        
        this.virtualScroller = null;
        this.searchInput = null;
        
        this.init();
    }

    init() {
        this.createSearchInterface();
        this.setupVirtualScrolling();
        this.loadProjects();
        this.bindEvents();
    }

    createSearchInterface() {
        const searchContainer = document.createElement('div');
        searchContainer.className = 'project-search-container mb-3';
        
        searchContainer.innerHTML = `
            <div class="input-group">
                <input type="text" class="form-control" id="project-search" placeholder="Cari proyek...">
                <button class="btn btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown">
                    <i class="bi bi-sort-down"></i>
                </button>
                <ul class="dropdown-menu">
                    <li><a class="dropdown-item" href="#" data-sort="lastModified">Terakhir Dimodifikasi</a></li>
                    <li><a class="dropdown-item" href="#" data-sort="projectName">Nama Proyek</a></li>
                    <li><a class="dropdown-item" href="#" data-sort="created">Tanggal Dibuat</a></li>
                    <li><hr class="dropdown-divider"></li>
                    <li><a class="dropdown-item" href="#" data-order="desc">Descending</a></li>
                    <li><a class="dropdown-item" href="#" data-order="asc">Ascending</a></li>
                </ul>
            </div>
        `;
        
        this.container.insertBefore(searchContainer, this.container.firstChild);
        this.searchInput = searchContainer.querySelector('#project-search');
    }

    setupVirtualScrolling() {
        // Create virtual scroll container
        const scrollContainer = document.createElement('div');
        scrollContainer.className = 'virtual-scroll-container';
        scrollContainer.style.height = 'calc(100vh - 200px)';
        
        this.container.appendChild(scrollContainer);
        
        this.virtualScroller = new VirtualScroller(
            scrollContainer,
            CONFIG.VIRTUAL_SCROLL_ITEM_HEIGHT,
            (index) => this.renderProjectItem(index),
            () => this.filteredProjects.length
        );
    }

    renderProjectItem(index) {
        const project = this.filteredProjects[index];
        if (!project) return document.createElement('div');
        
        const item = document.createElement('div');
        item.className = `list-group-item list-group-item-action d-flex justify-content-between align-items-center project-item ${
            project.id === projectStorage.activeProjectId ? 'active' : ''
        }`;
        item.dataset.id = project.id;
        
        // Use DocumentFragment for better performance
        const fragment = document.createDocumentFragment();
        
        // Project info container
        const infoContainer = document.createElement('div');
        infoContainer.className = 'project-info flex-grow-1';
        
        // Project name
        const nameElement = document.createElement('div');
        nameElement.className = 'project-name fw-semibold';
        nameElement.textContent = project.projectName;
        nameElement.title = project.projectName;
        
        // Project details
        const detailsElement = document.createElement('div');
        detailsElement.className = 'project-details small text-muted';
        
        const lastModified = new Date(project.lastModified).toLocaleDateString('id-ID');
        const pemohonName = project.analysisResult?.pemohon?.nama || '';
        
        detailsElement.innerHTML = `
            <div>Dimodifikasi: ${lastModified}</div>
            ${pemohonName ? `<div>Pemohon: ${pemohonName}</div>` : ''}
        `;
        
        infoContainer.appendChild(nameElement);
        infoContainer.appendChild(detailsElement);
        
        // Action buttons container
        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'project-actions';
        
        // Status indicator
        const statusIndicator = document.createElement('span');
        statusIndicator.className = `badge ${this.getStatusBadgeClass(project)} me-2`;
        statusIndicator.textContent = this.getProjectStatus(project);
        
        // Delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = `btn btn-sm ${project.id === projectStorage.activeProjectId ? 'btn-light' : 'btn-outline-danger'}`;
        deleteBtn.innerHTML = '<i class="bi bi-trash-fill"></i>';
        deleteBtn.title = "Hapus Proyek";
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.onProjectDelete(project.id);
        });
        
        actionsContainer.appendChild(statusIndicator);
        actionsContainer.appendChild(deleteBtn);
        
        // Add click handler for project selection
        item.addEventListener('click', () => {
            this.selectProject(project.id);
        });
        
        fragment.appendChild(infoContainer);
        fragment.appendChild(actionsContainer);
        item.appendChild(fragment);
        
        return item;
    }

    getProjectStatus(project) {
        if (!project.analysisResult) return 'Baru';
        if (project.analysisResult.analisis_zona?.length > 0) return 'Selesai';
        if (project.mapFileContent) return 'Analisis';
        if (project.analysisResult.pemohon?.nama) return 'Data Ekstrak';
        return 'Upload';
    }

    getStatusBadgeClass(project) {
        const status = this.getProjectStatus(project);
        switch (status) {
            case 'Selesai': return 'bg-success';
            case 'Analisis': return 'bg-warning';
            case 'Data Ekstrak': return 'bg-info';
            case 'Upload': return 'bg-secondary';
            default: return 'bg-light text-dark';
        }
    }

    selectProject(projectId) {
        performanceMonitor.startTiming('selectProject');
        
        // Update active project
        projectStorage.setActiveProject(projectId);
        
        // Update UI
        this.container.querySelectorAll('.project-item').forEach(item => {
            item.classList.toggle('active', item.dataset.id === projectId);
        });
        
        // Notify parent component
        this.onProjectSelect(projectId);
        
        performanceMonitor.endTiming('selectProject');
    }

    loadProjects() {
        performanceMonitor.startTiming('loadProjects');
        
        this.projects = projectStorage.getSortedProjects(this.sortBy, this.sortOrder);
        this.applyFilter();
        
        performanceMonitor.endTiming('loadProjects');
    }

    applyFilter() {
        performanceMonitor.startTiming('applyFilter');
        
        if (!this.searchQuery.trim()) {
            this.filteredProjects = this.projects;
        } else {
            this.filteredProjects = projectStorage.searchProjects(this.searchQuery);
        }
        
        // Update virtual scroller
        if (this.virtualScroller) {
            this.virtualScroller.refresh();
        }
        
        performanceMonitor.endTiming('applyFilter');
    }

    bindEvents() {
        // Debounced search
        const debouncedSearch = debounce((query) => {
            this.searchQuery = query;
            this.applyFilter();
        }, CONFIG.DEBOUNCE_DELAY);
        
        this.searchInput.addEventListener('input', (e) => {
            debouncedSearch(e.target.value);
        });
        
        // Sort dropdown handlers
        this.container.addEventListener('click', (e) => {
            if (e.target.matches('[data-sort]')) {
                e.preventDefault();
                this.sortBy = e.target.dataset.sort;
                this.loadProjects();
            }
            
            if (e.target.matches('[data-order]')) {
                e.preventDefault();
                this.sortOrder = e.target.dataset.order;
                this.loadProjects();
            }
        });
    }

    refresh() {
        this.loadProjects();
    }

    addProject(project) {
        performanceMonitor.startTiming('addProject');
        
        // Add to storage
        projectStorage.addProject(project);
        
        // Refresh list
        this.loadProjects();
        
        // Select new project
        this.selectProject(project.id);
        
        performanceMonitor.endTiming('addProject');
    }

    deleteProject(projectId) {
        performanceMonitor.startTiming('deleteProject');
        
        // Remove from storage
        const success = projectStorage.deleteProject(projectId);
        
        if (success) {
            // Refresh list
            this.loadProjects();
            
            // Select first project if available
            if (this.filteredProjects.length > 0) {
                this.selectProject(this.filteredProjects[0].id);
            }
        }
        
        performanceMonitor.endTiming('deleteProject');
        return success;
    }

    updateProject(projectId, updates) {
        performanceMonitor.startTiming('updateProject');
        
        // Update in storage
        const success = projectStorage.updateProject(projectId, updates);
        
        if (success) {
            // Refresh list to show updated data
            this.loadProjects();
        }
        
        performanceMonitor.endTiming('updateProject');
        return success;
    }

    getSelectedProject() {
        return projectStorage.getActiveProject();
    }

    scrollToProject(projectId) {
        const index = this.filteredProjects.findIndex(p => p.id === projectId);
        if (index !== -1 && this.virtualScroller) {
            this.virtualScroller.scrollToIndex(index);
        }
    }

    // Performance optimization: batch updates
    batchUpdate(updates) {
        performanceMonitor.startTiming('batchUpdate');
        
        let hasChanges = false;
        
        updates.forEach(({ projectId, data }) => {
            if (projectStorage.updateProject(projectId, data)) {
                hasChanges = true;
            }
        });
        
        if (hasChanges) {
            this.loadProjects();
        }
        
        performanceMonitor.endTiming('batchUpdate');
        return hasChanges;
    }

    // Export filtered projects
    exportFiltered() {
        return {
            projects: this.filteredProjects,
            searchQuery: this.searchQuery,
            sortBy: this.sortBy,
            sortOrder: this.sortOrder,
            exportDate: new Date().toISOString()
        };
    }

    // Get statistics
    getStats() {
        return {
            total: this.projects.length,
            filtered: this.filteredProjects.length,
            active: projectStorage.activeProjectId,
            searchQuery: this.searchQuery,
            sortBy: this.sortBy,
            sortOrder: this.sortOrder
        };
    }

    destroy() {
        if (this.virtualScroller) {
            this.virtualScroller.destroy();
        }
        
        // Remove event listeners
        this.searchInput?.removeEventListener('input', this.debouncedSearch);
        
        // Clear references
        this.projects = [];
        this.filteredProjects = [];
        this.virtualScroller = null;
    }
}

// Skeleton loader for project items
export class ProjectListSkeleton {
    static create(count = 5) {
        const fragment = document.createDocumentFragment();
        
        for (let i = 0; i < count; i++) {
            const item = document.createElement('div');
            item.className = 'list-group-item skeleton-item';
            item.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <div class="flex-grow-1">
                        <div class="skeleton skeleton-text" style="width: 70%; height: 1.2rem;"></div>
                        <div class="skeleton skeleton-text" style="width: 50%; height: 0.9rem; margin-top: 0.5rem;"></div>
                    </div>
                    <div class="skeleton" style="width: 60px; height: 24px; border-radius: 12px;"></div>
                </div>
            `;
            fragment.appendChild(item);
        }
        
        return fragment;
    }

    static show(container, count = 5) {
        container.innerHTML = '';
        container.appendChild(this.create(count));
    }

    static hide(container) {
        container.querySelectorAll('.skeleton-item').forEach(item => item.remove());
    }
}
