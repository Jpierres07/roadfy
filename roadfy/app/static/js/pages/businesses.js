// Página de Listado de Negocios
async function renderBusinesses() {
    const main = document.getElementById('main-content');
    main.innerHTML = `
        <div class="container">
            <div class="card">
                <h1 style="margin-bottom: 2rem;">Negocios de Llantas</h1>
                
                <div id="businesses-container" class="loading">
                    <i class="fas fa-spinner"></i> Cargando negocios...
                </div>
            </div>
        </div>
    `;

    loadBusinesses();
}

async function loadBusinesses() {
    try {
        const businesses = await api.get('/businesses');
        const container = document.getElementById('businesses-container');
        
        if (businesses.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 3rem;">No hay negocios disponibles</p>';
            return;
        }

        container.innerHTML = `
            <div class="grid grid-2">
                ${businesses.map(business => `
                    <a href="/negocios/${business.id}" data-link class="business-card" style="text-decoration: none; display: block; color: inherit;">
                        ${(() => {
                            const src = business.imageUrl || 'https://placehold.co/600x300/111827/e5e7eb?text=Sin+imagen';
                            return `<img src="${src}" alt="${business.name}" class="business-card-image" onerror="this.src='https://placehold.co/600x300/111827/e5e7eb?text=Sin+imagen'">`;
                        })()}
                        <div class="business-card-header">
                            <h3 class="business-card-name">${business.name}</h3>
                            ${business.reviewCount > 0 ? `
                                <div class="rating">
                                    <i class="fas fa-star"></i>
                                    <span>${business.rating.toFixed(1)}</span>
                                    <span style="color: var(--text-secondary); font-size: 0.875rem;">
                                        (${business.reviewCount})
                                    </span>
                                </div>
                            ` : `
                                <div style="color: var(--text-secondary); font-size: 0.875rem;">
                                    Sin reseñas aún
                                </div>
                            `}
                        </div>
                        <p class="business-card-info">
                            <i class="fas fa-map-marker-alt"></i> ${business.address}
                        </p>
                        <p class="business-card-info">
                            <i class="fas fa-phone"></i> ${business.contact.phone}
                        </p>
                        <p class="business-card-info">
                            <i class="fas fa-clock"></i> ${business.hours}
                        </p>
                        ${business.description ? `
                            <p style="color: var(--text-secondary); margin-top: 1rem; font-size: 0.875rem;">
                                ${business.description.substring(0, 100)}${business.description.length > 100 ? '...' : ''}
                            </p>
                        ` : ''}
                    </a>
                `).join('')}
            </div>
        `;
    } catch (error) {
        document.getElementById('businesses-container').innerHTML = 
            `<div class="alert alert-error">Error al cargar negocios: ${error.message}</div>`;
    }
}

