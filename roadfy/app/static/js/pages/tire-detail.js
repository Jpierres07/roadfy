// Página de Detalle de Llanta
async function renderTireDetail() {
    const tireId = router.getRouteId();
    const main = document.getElementById('main-content');
    
    main.innerHTML = `
        <div class="container">
            <div id="tire-detail-container" class="loading">
                <i class="fas fa-spinner"></i> Cargando...
            </div>
        </div>
    `;

    try {
        // Registrar interacción: vista de llanta
        api.post('/governance/interactions', {
            interaction_type: 'VIEW',
            entity_type: 'TIRE',
            entity_id: tireId
        }).catch(() => {}); // No bloquear si falla el tracking
        
        const tire = await api.get(`/tires/${tireId}`);
        const inventory = await api.get(`/inventory?tire_id=${tireId}`);
        
        // Obtener información completa de negocios (incluyendo redes sociales)
        const businessIds = [...new Set(inventory.map(item => item.business_id))];
        const businessesData = await Promise.all(
            businessIds.map(id => api.get(`/businesses/${id}`).catch(() => ({ id, name: `Negocio #${id}`, socials: null })))
        );
        const businessesMap = {};
        businessesData.forEach(biz => {
            businessesMap[biz.id] = {
                name: biz.name || `Negocio #${biz.id}`,
                socials: biz.socials || null,
                phone: biz.contact?.phone || null
            };
        });
        
        const container = document.getElementById('tire-detail-container');
        
        container.innerHTML = `
            <div class="card">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem;">
                    <div>
                        <img src="${tire.imageUrl || 'https://placehold.co/600x600/27272a/e5e5e5/png?text=No+Image'}" 
                             alt="${tire.brand} ${tire.model}" 
                             style="width: 100%; border-radius: var(--radius);"
                             onerror="this.src='https://placehold.co/600x600/27272a/e5e5e5/png?text=No+Image'">
                    </div>
                    <div>
                        <h1 style="font-size: 2rem; margin-bottom: 1rem;">${tire.brand} ${tire.model}</h1>
                        <div style="margin-bottom: 1.5rem;">
                            <p style="font-size: 1.25rem; color: var(--text-secondary); margin-bottom: 0.5rem;">
                                <strong>Tamaño:</strong> ${tire.size.width}/${tire.size.aspectRatio}R${tire.size.diameter}
                            </p>
                            <p style="font-size: 1.25rem; color: var(--text-secondary);">
                                <strong>Tipo:</strong> ${tire.type}
                            </p>
                        </div>
                        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                            <a href="/llantas/comparar?tire_id=${tireId}" data-link class="btn btn-primary">
                                <i class="fas fa-balance-scale"></i> Comparar Precios
                            </a>
                            <button onclick="addToComparison('${tireId}')" class="btn btn-secondary">
                                <i class="fas fa-plus"></i> Agregar a Comparación
                            </button>
                        </div>
                    </div>
                </div>

                <div class="card" style="margin-top: 2rem;">
                    <h2 style="margin-bottom: 1.5rem;">Disponibilidad y Precios</h2>
                    ${inventory.length > 0 ? `
                        <div class="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Negocio</th>
                                        <th>Cantidad</th>
                                        <th>Precio</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${inventory.map(item => {
                                        const business = businessesMap[item.business_id] || { name: `Negocio #${item.business_id}`, socials: null, phone: null };
                                        const whatsappUrl = business.socials?.whatsapp || (business.phone ? `https://wa.me/${business.phone.replace(/[^0-9]/g, '')}` : null);
                                        
                                        // Mensaje pre-formateado para WhatsApp
                                        const tireInfo = `${tire.brand} ${tire.model} - ${tire.size.width}/${tire.size.aspectRatio}R${tire.size.diameter}`;
                                        const message = encodeURIComponent(`Hola, me interesa la llanta:\n\n${tireInfo}\nTipo: ${tire.type}\nPrecio: S/ ${item.price.toFixed(2)}\nCantidad disponible: ${item.quantity}\n\n¿Tienen disponibilidad?`);
                                        const whatsappLink = whatsappUrl ? `${whatsappUrl.includes('?') ? whatsappUrl.split('?')[0] : whatsappUrl}?text=${message}` : null;
                                        
                                        return `
                                        <tr>
                                            <td>${business.name}</td>
                                            <td>${item.quantity}</td>
                                            <td style="font-weight: 600; color: var(--primary-color);">
                                                S/ ${item.price.toFixed(2)}
                                            </td>
                                            <td style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                                                <a href="/negocios/${item.business_id}" data-link class="btn btn-secondary" style="padding: 0.5rem 1rem;">
                                                    <i class="fas fa-store"></i> Ver Negocio
                                                </a>
                                                ${whatsappLink ? `
                                                    <a href="${whatsappLink}" 
                                                       target="_blank" 
                                                       rel="noopener noreferrer"
                                                       class="btn btn-success" 
                                                       style="padding: 0.5rem 1rem; background-color: #25D366; border-color: #25D366;">
                                                        <i class="fab fa-whatsapp"></i> Solicitar vía WhatsApp
                                                    </a>
                                                ` : ''}
                                            </td>
                                        </tr>
                                    `;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    ` : '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">No hay disponibilidad en este momento</p>'}
                </div>
            </div>
        `;
    } catch (error) {
        document.getElementById('tire-detail-container').innerHTML = 
            `<div class="alert alert-error">Error al cargar la llanta: ${error.message}</div>`;
    }
}

