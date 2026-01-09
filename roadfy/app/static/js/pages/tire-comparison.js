// Página de Comparación de Precios
async function renderTireComparison() {
    const params = router.getParams();
    const tireId = params.tire_id;
    const main = document.getElementById('main-content');
    
    main.innerHTML = `
        <div class="container">
            <div class="card">
                <h1 style="margin-bottom: 2rem;">Comparación de Precios</h1>
                
                ${tireId ? `
                    <div id="comparison-container" class="loading">
                        <i class="fas fa-spinner"></i> Cargando comparación...
                    </div>
                ` : `
                    <div class="alert alert-info">
                        <p>Selecciona una llanta para comparar precios entre diferentes negocios.</p>
                        <a href="/llantas" data-link class="btn btn-primary" style="margin-top: 1rem;">
                            Ver Catálogo de Llantas
                        </a>
                    </div>
                `}
            </div>
        </div>
    `;

    if (tireId) {
        loadComparison(tireId);
    }
}

async function loadComparison(tireId) {
    try {
        // Registrar interacción: comparación de llanta
        api.post('/governance/interactions', {
            interaction_type: 'COMPARE',
            entity_type: 'TIRE',
            entity_id: tireId
        }).catch(() => {}); // No bloquear si falla el tracking
        
        const [tire, inventory] = await Promise.all([
            api.get(`/tires/${tireId}`),
            api.get(`/inventory?tire_id=${tireId}`)
        ]);
        
        const container = document.getElementById('comparison-container');
        
        if (inventory.length === 0) {
            container.innerHTML = `
                <div class="alert alert-info">
                    <p>No hay disponibilidad de esta llanta en ningún negocio en este momento.</p>
                </div>
            `;
            return;
        }

        // Ordenar por precio
        inventory.sort((a, b) => a.price - b.price);
        
        // Obtener información de negocios
        const businessesData = await Promise.all(
            inventory.map(item => api.get(`/businesses/${item.business_id}`).catch(() => null))
        );

        container.innerHTML = `
            <div style="margin-bottom: 2rem;">
                <h2 style="margin-bottom: 1rem;">${tire.brand} ${tire.model}</h2>
                <p style="color: var(--text-secondary);">
                    ${tire.size.width}/${tire.size.aspectRatio}R${tire.size.diameter} - ${tire.type}
                </p>
            </div>

            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Negocio</th>
                            <th>Cantidad Disponible</th>
                            <th>Precio</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${inventory.map((item, index) => {
                            const business = businessesData[index];
                            return `
                                <tr>
                                    <td>
                                        ${business ? `
                                            <strong>${business.name}</strong><br>
                                            <small style="color: var(--text-secondary);">${business.address}</small>
                                        ` : `Negocio #${item.business_id}`}
                                    </td>
                                    <td>${item.quantity} unidades</td>
                                    <td style="font-weight: 600; color: var(--primary-color); font-size: 1.125rem;">
                                        S/ ${item.price.toFixed(2)}
                                        ${index === 0 ? '<span style="color: var(--success-color); margin-left: 0.5rem;">⭐ Mejor precio</span>' : ''}
                                    </td>
                                    <td>
                                        ${business ? `
                                            <a href="/negocios/${item.business_id}" data-link class="btn btn-secondary" style="padding: 0.5rem 1rem;">
                                                Ver Negocio
                                            </a>
                                        ` : ''}
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        document.getElementById('comparison-container').innerHTML = 
            `<div class="alert alert-error">Error al cargar la comparación: ${error.message}</div>`;
    }
}

