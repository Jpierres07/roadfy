// Panel de Administración de Negocio - Dashboard Completo
async function renderBusinessDashboard() {
    if (!auth.isAuthenticated() || !auth.isBusinessAdmin()) {
        router.navigate('/');
        return;
    }

    const user = auth.getCurrentUser();
    if (!user.business_id) {
        router.navigate('/registrar-negocio');
        return;
    }

    const main = document.getElementById('main-content');
    main.innerHTML = `
        <div class="container">
            <div id="business-dashboard-container" class="loading">
                <i class="fas fa-spinner"></i> Cargando panel de administración...
            </div>
        </div>
    `;

    loadBusinessDashboard(user.business_id);
}

async function loadBusinessDashboard(businessId) {
    try {
        const [business, inventory, reviews] = await Promise.all([
            api.get(`/businesses/${businessId}`),
            api.get(`/inventory?business_id=${businessId}`),
            api.get(`/reviews?business_id=${businessId}`)
        ]);

        const container = document.getElementById('business-dashboard-container');
        
        // Calcular estadísticas
        const totalItems = inventory.length;
        const totalStock = inventory.reduce((sum, item) => sum + (item.quantity || 0), 0);
        const totalValue = inventory.reduce((sum, item) => sum + ((item.quantity || 0) * (item.price || 0)), 0);
        const lowStockItems = inventory.filter(item => (item.quantity || 0) < 10).length;
        const recentReviews = reviews.slice(0, 5);

        container.innerHTML = `
            <div class="card" style="margin-bottom: 2rem;">
                <div class="flex-between" style="margin-bottom: 2rem;">
                    <h1><i class="fas fa-store"></i> Panel de Administración</h1>
                    <div>
                        <a href="/admin/mi-negocio" data-link class="btn btn-primary" style="margin-right: 0.5rem;">
                            <i class="fas fa-edit"></i> Editar Negocio
                        </a>
                        <a href="/admin/inventario" data-link class="btn btn-secondary">
                            <i class="fas fa-boxes"></i> Gestionar Inventario
                        </a>
                    </div>
                </div>

                <!-- Información del Negocio -->
                <div class="card" style="background: var(--bg-secondary); margin-bottom: 2rem;">
                    <h2 style="margin-bottom: 1rem;"><i class="fas fa-info-circle"></i> Información del Negocio</h2>
                    <div class="grid grid-2">
                        <div>
                            <p style="margin-bottom: 0.5rem;"><strong>Nombre:</strong> ${business.name}</p>
                            <p style="margin-bottom: 0.5rem;"><strong>Dirección:</strong> ${business.address}</p>
                            <p style="margin-bottom: 0.5rem;"><strong>Teléfono:</strong> ${business.contact.phone || 'No especificado'}</p>
                            <p style="margin-bottom: 0.5rem;"><strong>Email:</strong> ${business.contact.email}</p>
                            <p style="margin-bottom: 0.5rem;"><strong>Horarios:</strong> ${business.hours || 'No especificado'}</p>
                        </div>
                        <div>
                            ${business.reviewCount > 0 ? `
                                <div class="rating" style="font-size: 1.5rem; margin-bottom: 1rem;">
                                    <i class="fas fa-star"></i>
                                    <span>${business.rating.toFixed(1)}</span>
                                    <span style="color: var(--text-secondary); font-size: 1rem;">
                                        (${business.reviewCount} ${business.reviewCount === 1 ? 'reseña' : 'reseñas'})
                                    </span>
                                </div>
                            ` : `
                                <div style="color: var(--text-secondary); margin-bottom: 1rem;">
                                    <i class="fas fa-star" style="opacity: 0.3;"></i>
                                    <span>Sin reseñas aún</span>
                                </div>
                            `}
                            ${business.imageUrl ? `
                                <img src="${business.imageUrl}" alt="${business.name}" 
                                     style="width: 100%; max-width: 300px; border-radius: var(--radius); margin-top: 1rem;">
                            ` : ''}
                        </div>
                    </div>
                </div>

                <!-- Estadísticas -->
                <div class="grid grid-4" style="margin-bottom: 2rem;">
                    <div class="card" style="background: var(--primary-color); color: white; text-align: center;">
                        <h3 style="margin: 0; font-size: 2rem;">${totalItems}</h3>
                        <p style="margin: 0.5rem 0 0 0;">Productos en Inventario</p>
                    </div>
                    <div class="card" style="background: var(--success-color); color: white; text-align: center;">
                        <h3 style="margin: 0; font-size: 2rem;">${totalStock}</h3>
                        <p style="margin: 0.5rem 0 0 0;">Unidades Totales</p>
                    </div>
                    <div class="card" style="background: var(--warning-color); color: white; text-align: center;">
                        <h3 style="margin: 0; font-size: 2rem;">S/ ${totalValue.toFixed(2)}</h3>
                        <p style="margin: 0.5rem 0 0 0;">Valor Total</p>
                    </div>
                    <div class="card" style="background: ${lowStockItems > 0 ? 'var(--danger-color)' : 'var(--info-color)'}; color: white; text-align: center;">
                        <h3 style="margin: 0; font-size: 2rem;">${lowStockItems}</h3>
                        <p style="margin: 0.5rem 0 0 0;">Productos Bajo Stock</p>
                    </div>
                </div>

                <!-- Inventario Rápido -->
                <div class="card" style="background: var(--bg-secondary); margin-bottom: 2rem;">
                    <div class="flex-between" style="margin-bottom: 1rem;">
                        <h2><i class="fas fa-boxes"></i> Inventario</h2>
                        <a href="/admin/inventario" data-link class="btn btn-primary">
                            <i class="fas fa-plus"></i> Agregar Item
                        </a>
                    </div>
                    ${inventory.length > 0 ? `
                        <div style="overflow-x: auto;">
                            <table style="width: 100%; border-collapse: collapse;">
                                <thead>
                                    <tr style="border-bottom: 2px solid var(--border-color);">
                                        <th style="padding: 0.75rem; text-align: left;">Llanta</th>
                                        <th style="padding: 0.75rem; text-align: center;">Cantidad</th>
                                        <th style="padding: 0.75rem; text-align: right;">Precio</th>
                                        <th style="padding: 0.75rem; text-align: right;">Total</th>
                                        <th style="padding: 0.75rem; text-align: center;">Estado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${inventory.slice(0, 10).map(item => `
                                        <tr style="border-bottom: 1px solid var(--border-color);">
                                            <td style="padding: 0.75rem;">
                                                <a href="/llantas/${item.tire_id}" data-link style="text-decoration: none; color: var(--primary-color);">
                                                    ${item.tire_id}
                                                </a>
                                            </td>
                                            <td style="padding: 0.75rem; text-align: center;">
                                                <span style="color: ${(item.quantity || 0) < 10 ? 'var(--danger-color)' : 'var(--text-color)'};">
                                                    ${item.quantity || 0}
                                                </span>
                                            </td>
                                            <td style="padding: 0.75rem; text-align: right;">S/ ${(item.price || 0).toFixed(2)}</td>
                                            <td style="padding: 0.75rem; text-align: right;">S/ ${((item.quantity || 0) * (item.price || 0)).toFixed(2)}</td>
                                            <td style="padding: 0.75rem; text-align: center;">
                                                ${(item.quantity || 0) < 10 ? 
                                                    '<span style="color: var(--danger-color);"><i class="fas fa-exclamation-triangle"></i> Bajo Stock</span>' : 
                                                    '<span style="color: var(--success-color);"><i class="fas fa-check"></i> OK</span>'}
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                        ${inventory.length > 10 ? `
                            <div style="margin-top: 1rem; text-align: center;">
                                <a href="/admin/inventario" data-link class="btn btn-secondary">
                                    Ver todos los items (${inventory.length})
                                </a>
                            </div>
                        ` : ''}
                    ` : `
                        <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                            <i class="fas fa-box-open" style="font-size: 3rem; opacity: 0.3; margin-bottom: 1rem;"></i>
                            <p>No hay items en el inventario</p>
                            <a href="/admin/inventario" data-link class="btn btn-primary" style="margin-top: 1rem;">
                                <i class="fas fa-plus"></i> Agregar Primer Item
                            </a>
                        </div>
                    `}
                </div>

                <!-- Reseñas Recientes -->
                ${reviews.length > 0 ? `
                    <div class="card" style="background: var(--bg-secondary);">
                        <h2 style="margin-bottom: 1rem;"><i class="fas fa-star"></i> Reseñas Recientes</h2>
                        <div>
                            ${recentReviews.map(review => `
                                <div style="padding: 1rem; margin-bottom: 1rem; background: var(--bg-color); border-radius: var(--radius); border-left: 4px solid var(--primary-color);">
                                    <div class="flex-between" style="margin-bottom: 0.5rem;">
                                        <div>
                                            <strong>${review.user_name || 'Usuario Anónimo'}</strong>
                                            <div class="rating" style="display: inline-block; margin-left: 0.5rem;">
                                                ${'<i class="fas fa-star"></i>'.repeat(review.rating)}
                                                ${'<i class="far fa-star"></i>'.repeat(5 - review.rating)}
                                            </div>
                                        </div>
                                        <span style="color: var(--text-secondary); font-size: 0.875rem;">
                                            ${new Date(review.created_at).toLocaleDateString('es-PE')}
                                        </span>
                                    </div>
                                    ${review.comment ? `<p style="margin: 0; color: var(--text-secondary);">${review.comment}</p>` : ''}
                                </div>
                            `).join('')}
                            ${reviews.length > 5 ? `
                                <div style="text-align: center; margin-top: 1rem;">
                                    <a href="/negocios/${businessId}" data-link class="btn btn-secondary">
                                        Ver todas las reseñas (${reviews.length})
                                    </a>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                ` : `
                    <div class="card" style="background: var(--bg-secondary); text-align: center; padding: 2rem;">
                        <i class="fas fa-star" style="font-size: 3rem; opacity: 0.3; margin-bottom: 1rem;"></i>
                        <p style="color: var(--text-secondary);">Aún no hay reseñas para tu negocio</p>
                    </div>
                `}
            </div>
        </div>
    `;
    } catch (error) {
        console.error('Error loading business dashboard:', error);
        const container = document.getElementById('business-dashboard-container');
        if (container) {
            container.innerHTML = `
                <div class="alert alert-error">
                    <i class="fas fa-exclamation-circle"></i>
                    <strong>Error al cargar el panel de administración</strong>
                    <p>${error.message || 'Error desconocido'}</p>
                    <button onclick="location.reload()" class="btn btn-primary" style="margin-top: 1rem;">
                        <i class="fas fa-refresh"></i> Recargar
                    </button>
                </div>
            `;
        }
    }
}

// Registrar la ruta (también se registra en app.js, pero esto asegura que esté disponible)
if (typeof router !== 'undefined' && typeof renderBusinessDashboard !== 'undefined') {
    router.route('/admin/dashboard', renderBusinessDashboard);
}
