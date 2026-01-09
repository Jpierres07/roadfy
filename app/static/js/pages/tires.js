// Página de Listado de Llantas
let currentFilters = {
    brand: '',
    type: '',
    width: '',
    aspectRatio: '',
    diameter: '',
    search: '',
    minPrice: '',
    maxPrice: '',
    hasStock: 'true'  // Por defecto solo mostrar con stock
};

async function renderTires() {
    const main = document.getElementById('main-content');
    main.innerHTML = `
        <div class="container">
            <div class="card">
                <h1 style="margin-bottom: 2rem;">Catálogo de Llantas</h1>
                
                <div class="filters">
                    <h3 class="filters-title">Filtros de Búsqueda</h3>
                    <div class="filters-grid">
                        <div class="form-group">
                            <label class="form-label">Buscar</label>
                            <input type="text" id="search-input" class="form-input" 
                                   placeholder="Marca, modelo..." 
                                   value="${currentFilters.search}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Marca</label>
                            <input type="text" id="brand-input" class="form-input" 
                                   placeholder="Ej: Michelin" 
                                   value="${currentFilters.brand}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Tipo</label>
                            <select id="type-select" class="form-select">
                                <option value="">Todos</option>
                                <option value="Pista / Carretera (H/T)">Pista / Carretera (H/T)</option>
                                <option value="Uso Mixto (A/T)">Uso Mixto (A/T)</option>
                                <option value="Todo Terreno (M/T)">Todo Terreno (M/T)</option>
                                <option value="Deportiva (UHP)">Deportiva (UHP)</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Ancho</label>
                            <input type="number" id="width-input" class="form-input" 
                                   placeholder="Ej: 205" 
                                   value="${currentFilters.width}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Perfil</label>
                            <input type="number" id="aspect-ratio-input" class="form-input" 
                                   placeholder="Ej: 55" 
                                   value="${currentFilters.aspectRatio}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Diámetro</label>
                            <input type="number" id="diameter-input" class="form-input" 
                                   placeholder="Ej: 16" 
                                   value="${currentFilters.diameter}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Precio Mínimo (S/)</label>
                            <input type="number" id="min-price-input" class="form-input" 
                                   placeholder="Ej: 100" 
                                   step="0.01"
                                   value="${currentFilters.minPrice}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Precio Máximo (S/)</label>
                            <input type="number" id="max-price-input" class="form-input" 
                                   placeholder="Ej: 1000" 
                                   step="0.01"
                                   value="${currentFilters.maxPrice}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Disponibilidad</label>
                            <select id="has-stock-select" class="form-select">
                                <option value="true" ${currentFilters.hasStock === 'true' ? 'selected' : ''}>Solo con stock</option>
                                <option value="false" ${currentFilters.hasStock === 'false' ? 'selected' : ''}>Todas</option>
                            </select>
                        </div>
                    </div>
                    <div style="margin-top: 1rem;">
                        <button onclick="applyFilters()" class="btn btn-primary">
                            <i class="fas fa-search"></i> Buscar
                        </button>
                        <button onclick="clearFilters()" class="btn btn-secondary" style="margin-left: 0.5rem;">
                            <i class="fas fa-times"></i> Limpiar
                        </button>
                    </div>
                </div>

                <div id="tires-container" class="loading">
                    <i class="fas fa-spinner"></i> Cargando llantas...
                </div>
            </div>
        </div>
    `;

    // Configurar valores de filtros
    if (currentFilters.type) {
        document.getElementById('type-select').value = currentFilters.type;
    }

    // Cargar llantas
    loadTires();
}

async function loadTires() {
    try {
        const params = new URLSearchParams();
        if (currentFilters.search) params.append('search', currentFilters.search);
        if (currentFilters.brand) params.append('brand', currentFilters.brand);
        if (currentFilters.type) params.append('type', currentFilters.type);
        if (currentFilters.width) params.append('width', currentFilters.width);
        if (currentFilters.aspectRatio) params.append('ratio', currentFilters.aspectRatio);
        if (currentFilters.diameter) params.append('diameter', currentFilters.diameter);
        if (currentFilters.minPrice) params.append('min_price', currentFilters.minPrice);
        if (currentFilters.maxPrice) params.append('max_price', currentFilters.maxPrice);
        if (currentFilters.hasStock) params.append('has_stock', currentFilters.hasStock);

        const tires = await api.get(`/tires?${params.toString()}`);
        const container = document.getElementById('tires-container');
        
        if (tires.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 3rem;">No se encontraron llantas con los filtros seleccionados</p>';
            return;
        }

        container.innerHTML = `
            <div class="grid grid-3">
                ${tires.map(tire => `
                    <a href="/llantas/${tire.id}" data-link class="tire-card" style="text-decoration: none; display: block; color: inherit;">
                        <img src="${tire.imageUrl || 'https://placehold.co/400x400/27272a/e5e5e5/png?text=No+Image'}" 
                             alt="${tire.brand} ${tire.model}" 
                             class="tire-card-image"
                             onerror="this.src='https://placehold.co/400x400/27272a/e5e5e5/png?text=No+Image'">
                        <div class="tire-card-body">
                            <h3 class="tire-card-title">${tire.brand} ${tire.model}</h3>
                            <p class="tire-card-info">
                                ${tire.size.width}/${tire.size.aspectRatio}R${tire.size.diameter}
                            </p>
                            <p class="tire-card-info" style="color: var(--text-secondary);">
                                ${tire.type}
                            </p>
                            ${tire.minPrice !== undefined && tire.maxPrice !== undefined ? `
                                <p class="tire-card-info" style="color: var(--primary-color); font-weight: 600; margin-top: 0.5rem;">
                                    ${tire.minPrice === tire.maxPrice ? 
                                        `S/ ${tire.minPrice.toFixed(2)}` : 
                                        `S/ ${tire.minPrice.toFixed(2)} - S/ ${tire.maxPrice.toFixed(2)}`
                                    }
                                </p>
                            ` : ''}
                        </div>
                    </a>
                `).join('')}
            </div>
        `;
    } catch (error) {
        document.getElementById('tires-container').innerHTML = 
            `<div class="alert alert-error">Error al cargar llantas: ${error.message}</div>`;
    }
}

// Funciones globales para filtros
window.applyFilters = function() {
    // Registrar búsqueda
    const searchTerm = document.getElementById('search-input').value;
    const brand = document.getElementById('brand-input').value;
    const type = document.getElementById('type-select').value;
    
    if (searchTerm || brand || type) {
        api.post('/governance/interactions', {
            interaction_type: 'SEARCH',
            entity_type: 'TIRE',
            entity_id: 'search',
            metadata: {
                search: searchTerm,
                brand: brand,
                type: type,
                filters: currentFilters
            }
        }).catch(() => {}); // No bloquear si falla el tracking
    }
    const minPrice = document.getElementById('min-price-input').value;
    const maxPrice = document.getElementById('max-price-input').value;
    
    // Validar rango de precios
    if (minPrice && maxPrice && parseFloat(minPrice) > parseFloat(maxPrice)) {
        alert('El precio mínimo no puede ser mayor que el precio máximo');
        return;
    }
    
    currentFilters = {
        search: document.getElementById('search-input').value,
        brand: document.getElementById('brand-input').value,
        type: document.getElementById('type-select').value,
        width: document.getElementById('width-input').value,
        aspectRatio: document.getElementById('aspect-ratio-input').value,
        diameter: document.getElementById('diameter-input').value,
        minPrice: minPrice,
        maxPrice: maxPrice,
        hasStock: document.getElementById('has-stock-select').value
    };
    loadTires();
}

window.clearFilters = function() {
    currentFilters = {
        brand: '',
        type: '',
        width: '',
        aspectRatio: '',
        diameter: '',
        search: '',
        minPrice: '',
        maxPrice: '',
        hasStock: 'true'
    };
    document.getElementById('search-input').value = '';
    document.getElementById('brand-input').value = '';
    document.getElementById('type-select').value = '';
    document.getElementById('width-input').value = '';
    document.getElementById('aspect-ratio-input').value = '';
    document.getElementById('diameter-input').value = '';
    document.getElementById('min-price-input').value = '';
    document.getElementById('max-price-input').value = '';
    document.getElementById('has-stock-select').value = 'true';
    loadTires();
}

