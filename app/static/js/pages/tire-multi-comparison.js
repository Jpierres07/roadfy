// Página de Comparación de Múltiples Llantas
let selectedTires = []; // Array de IDs de llantas seleccionadas

async function renderTireMultiComparison() {
    const params = router.getParams();
    const tireIds = params.tire_ids ? params.tire_ids.split(',') : 
                    (params.tire_ids_str ? params.tire_ids_str.split(',') : []);
    
    const main = document.getElementById('main-content');
    
    main.innerHTML = `
        <div class="container">
            <div class="card">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                    <h1>Comparación de Múltiples Llantas</h1>
                    <button onclick="addTireToComparison()" class="btn btn-primary">
                        <i class="fas fa-plus"></i> Agregar Llanta
                    </button>
                </div>
                
                ${tireIds.length === 0 ? `
                    <div class="alert alert-info">
                        <p><strong>Compara hasta 4 llantas lado a lado</strong></p>
                        <p>Selecciona llantas del catálogo para comparar sus características y precios.</p>
                        <a href="/llantas" data-link class="btn btn-primary" style="margin-top: 1rem;">
                            <i class="fas fa-search"></i> Ver Catálogo de Llantas
                        </a>
                    </div>
                ` : `
                    <div id="comparison-container" class="loading">
                        <i class="fas fa-spinner"></i> Cargando comparación...
                    </div>
                `}
            </div>
        </div>
    `;

    if (tireIds.length > 0) {
        selectedTires = tireIds;
        loadMultiComparison(tireIds);
    } else {
        selectedTires = [];
    }
}

async function loadMultiComparison(tireIds) {
    try {
        // Limitar a 4 llantas máximo
        const limitedIds = tireIds.slice(0, 4);
        
        // Cargar información de todas las llantas
        const tiresData = await Promise.all(
            limitedIds.map(id => api.get(`/tires/${id}`).catch(() => null))
        );
        
        // Filtrar llantas válidas
        const validTires = tiresData.filter(t => t !== null);
        
        if (validTires.length === 0) {
            const errorContainer = document.getElementById('comparison-container');
            if (errorContainer) {
                errorContainer.innerHTML = `
                    <div class="alert alert-error">
                        <p>No se pudieron cargar las llantas seleccionadas.</p>
                    </div>
                `;
            }
            return;
        }
        
        // Cargar inventario y precios para cada llanta
        const tiresWithPrices = await Promise.all(
            validTires.map(async (tire) => {
                try {
                    const inventory = await api.get(`/inventory?tire_id=${tire.id}`);
                    const prices = inventory
                        .filter(item => item.quantity > 0)
                        .map(item => item.price);
                    
                    return {
                        ...tire,
                        prices: prices,
                        minPrice: prices.length > 0 ? Math.min(...prices) : null,
                        maxPrice: prices.length > 0 ? Math.max(...prices) : null,
                        avgPrice: prices.length > 0 ? (prices.reduce((a, b) => a + b, 0) / prices.length) : null,
                        availability: inventory.filter(item => item.quantity > 0).length,
                        totalStock: inventory.reduce((sum, item) => sum + item.quantity, 0)
                    };
                } catch (e) {
                    return {
                        ...tire,
                        prices: [],
                        minPrice: null,
                        maxPrice: null,
                        avgPrice: null,
                        availability: 0,
                        totalStock: 0
                    };
                }
            })
        );
        
        const container = document.getElementById('comparison-container');
        if (!container) {
            console.error('Comparison container not found');
            return;
        }
        
        container.innerHTML = `
            <div style="margin-bottom: 2rem;">
                <button onclick="clearComparison()" class="btn btn-secondary">
                    <i class="fas fa-times"></i> Limpiar Comparación
                </button>
                ${validTires.length < 4 ? `
                    <button onclick="addTireToComparison()" class="btn btn-primary" style="margin-left: 0.5rem;">
                        <i class="fas fa-plus"></i> Agregar Otra Llanta
                    </button>
                ` : ''}
            </div>
            
            <div class="table-container" style="overflow-x: auto;">
                <table style="min-width: 100%;">
                    <thead>
                        <tr>
                            <th style="position: sticky; left: 0; background: var(--bg-color); z-index: 10;">Característica</th>
                            ${tiresWithPrices.map((tire, index) => `
                                <th style="min-width: 200px;">
                                    <div style="text-align: center;">
                                        <button onclick="removeTireFromComparison(${index})" 
                                                class="btn btn-danger" 
                                                style="padding: 0.25rem 0.5rem; float: right;"
                                                title="Quitar de comparación">
                                            <i class="fas fa-times"></i>
                                        </button>
                                        <div style="margin-top: 0.5rem;">
                                            <strong>${tire.brand} ${tire.model}</strong>
                                        </div>
                                    </div>
                                </th>
                            `).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style="position: sticky; left: 0; background: var(--bg-color); font-weight: 600;"><strong>Imagen</strong></td>
                            ${tiresWithPrices.map(tire => `
                                <td style="text-align: center;">
                                    <img src="${tire.imageUrl || 'https://placehold.co/200x200/27272a/e5e5e5/png?text=No+Image'}" 
                                         alt="${tire.brand} ${tire.model}" 
                                         style="max-width: 150px; max-height: 150px; border-radius: var(--radius);"
                                         onerror="this.src='https://placehold.co/200x200/27272a/e5e5e5/png?text=No+Image'">
                                </td>
                            `).join('')}
                        </tr>
                        <tr>
                            <td style="position: sticky; left: 0; background: var(--bg-color); font-weight: 600;"><strong>Marca</strong></td>
                            ${tiresWithPrices.map(tire => `<td>${tire.brand}</td>`).join('')}
                        </tr>
                        <tr>
                            <td style="position: sticky; left: 0; background: var(--bg-color); font-weight: 600;"><strong>Modelo</strong></td>
                            ${tiresWithPrices.map(tire => `<td>${tire.model}</td>`).join('')}
                        </tr>
                        <tr>
                            <td style="position: sticky; left: 0; background: var(--bg-color); font-weight: 600;"><strong>Tamaño</strong></td>
                            ${tiresWithPrices.map(tire => `<td>${tire.size.width}/${tire.size.aspectRatio}R${tire.size.diameter}</td>`).join('')}
                        </tr>
                        <tr>
                            <td style="position: sticky; left: 0; background: var(--bg-color); font-weight: 600;"><strong>Tipo</strong></td>
                            ${tiresWithPrices.map(tire => `<td>${tire.type}</td>`).join('')}
                        </tr>
                        <tr>
                            <td style="position: sticky; left: 0; background: var(--bg-color); font-weight: 600;"><strong>Precio Mínimo</strong></td>
                            ${tiresWithPrices.map(tire => `
                                <td style="color: var(--primary-color); font-weight: 600;">
                                    ${tire.minPrice !== null ? `S/ ${tire.minPrice.toFixed(2)}` : 'N/A'}
                                </td>
                            `).join('')}
                        </tr>
                        <tr>
                            <td style="position: sticky; left: 0; background: var(--bg-color); font-weight: 600;"><strong>Precio Máximo</strong></td>
                            ${tiresWithPrices.map(tire => `
                                <td style="color: var(--primary-color); font-weight: 600;">
                                    ${tire.maxPrice !== null ? `S/ ${tire.maxPrice.toFixed(2)}` : 'N/A'}
                                </td>
                            `).join('')}
                        </tr>
                        <tr>
                            <td style="position: sticky; left: 0; background: var(--bg-color); font-weight: 600;"><strong>Precio Promedio</strong></td>
                            ${tiresWithPrices.map(tire => `
                                <td style="color: var(--text-secondary);">
                                    ${tire.avgPrice !== null ? `S/ ${tire.avgPrice.toFixed(2)}` : 'N/A'}
                                </td>
                            `).join('')}
                        </tr>
                        <tr>
                            <td style="position: sticky; left: 0; background: var(--bg-color); font-weight: 600;"><strong>Disponibilidad</strong></td>
                            ${tiresWithPrices.map(tire => `
                                <td>
                                    ${tire.availability > 0 ? `
                                        <span style="color: var(--success-color);">
                                            <i class="fas fa-check-circle"></i> ${tire.availability} ${tire.availability === 1 ? 'negocio' : 'negocios'}
                                        </span>
                                        <br>
                                        <small style="color: var(--text-secondary);">
                                            Stock total: ${tire.totalStock} unidades
                                        </small>
                                    ` : `
                                        <span style="color: var(--danger-color);">
                                            <i class="fas fa-times-circle"></i> Sin stock
                                        </span>
                                    `}
                                </td>
                            `).join('')}
                        </tr>
                        <tr>
                            <td style="position: sticky; left: 0; background: var(--bg-color); font-weight: 600;"><strong>Acciones</strong></td>
                            ${tiresWithPrices.map(tire => `
                                <td>
                                    <a href="/llantas/${tire.id}" data-link class="btn btn-primary" style="padding: 0.5rem 1rem; margin-bottom: 0.5rem; display: block; text-align: center;">
                                        <i class="fas fa-info-circle"></i> Ver Detalles
                                    </a>
                                    <a href="/llantas/comparar?tire_id=${tire.id}" data-link class="btn btn-secondary" style="padding: 0.5rem 1rem; display: block; text-align: center;">
                                        <i class="fas fa-balance-scale"></i> Comparar Precios
                                    </a>
                                </td>
                            `).join('')}
                        </tr>
                    </tbody>
                </table>
            </div>
            
            ${validTires.length < 4 ? `
                <div style="margin-top: 2rem; text-align: center;">
                    <p style="color: var(--text-secondary); margin-bottom: 1rem;">
                        Puedes agregar hasta ${4 - validTires.length} ${4 - validTires.length === 1 ? 'llanta más' : 'llantas más'} a la comparación
                    </p>
                    <button onclick="addTireToComparison()" class="btn btn-primary">
                        <i class="fas fa-plus"></i> Agregar Llanta
                    </button>
                </div>
            ` : `
                <div style="margin-top: 2rem; text-align: center;">
                    <p style="color: var(--text-secondary);">
                        <i class="fas fa-info-circle"></i> Máximo 4 llantas en comparación
                    </p>
                </div>
            `}
        `;
    } catch (error) {
        const errorContainer = document.getElementById('comparison-container');
        if (errorContainer) {
            errorContainer.innerHTML = 
                `<div class="alert alert-error">Error al cargar la comparación: ${error.message}</div>`;
        } else {
            console.error('Error loading comparison:', error);
        }
    }
}

// Función para agregar llanta a la comparación
window.addTireToComparison = function() {
    if (selectedTires.length >= 4) {
        alert('Máximo 4 llantas en comparación');
        return;
    }
    
    // Mostrar modal o redirigir al catálogo con modo comparación
    const tireId = prompt('Ingresa el ID de la llanta o ve al catálogo para seleccionarla');
    if (tireId && !selectedTires.includes(tireId)) {
        selectedTires.push(tireId);
        router.navigate(`/llantas/comparar-multi?tire_ids=${selectedTires.join(',')}`);
    } else if (tireId) {
        alert('Esta llanta ya está en la comparación');
    }
}

// Función para quitar llanta de la comparación
window.removeTireFromComparison = function(index) {
    selectedTires.splice(index, 1);
    if (selectedTires.length === 0) {
        router.navigate('/llantas/comparar-multi');
    } else {
        router.navigate(`/llantas/comparar-multi?tire_ids=${selectedTires.join(',')}`);
    }
}

// Función para limpiar comparación
window.clearComparison = function() {
    selectedTires = [];
    router.navigate('/llantas/comparar-multi');
}

// Función para agregar desde el detalle de llanta
window.addToComparison = function(tireId) {
    if (selectedTires.length >= 4) {
        alert('Máximo 4 llantas en comparación. Elimina una para agregar otra.');
        return;
    }
    
    if (selectedTires.includes(tireId)) {
        alert('Esta llanta ya está en la comparación');
        return;
    }
    
    selectedTires.push(tireId);
    router.navigate(`/llantas/comparar-multi?tire_ids=${selectedTires.join(',')}`);
}

