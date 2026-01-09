// Panel Admin - Mi Negocio
async function renderAdminMyBusiness() {
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
            <div id="business-info-container" class="loading">
                <i class="fas fa-spinner"></i> Cargando información del negocio...
            </div>
        </div>
    `;

    loadBusinessInfo(user.business_id);
}

async function loadBusinessInfo(businessId) {
    try {
        const business = await api.get(`/businesses/${businessId}`);
        const container = document.getElementById('business-info-container');
        
        container.innerHTML = `
            <div class="card">
                <div class="flex-between" style="margin-bottom: 2rem;">
                    <div>
                        <h1 style="margin-bottom: 0.5rem;">Mi Negocio</h1>
                        <a href="/admin/dashboard" data-link style="color: var(--text-secondary); text-decoration: none;">
                            <i class="fas fa-arrow-left"></i> Volver al Panel
                        </a>
                    </div>
                    <button onclick="showEditBusinessForm()" class="btn btn-primary">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                </div>
                
                <div id="edit-form-container"></div>
                
                <div class="grid grid-2" style="margin-bottom: 2rem;">
                    <div>
                        <h3 style="margin-bottom: 1rem;">Información General</h3>
                        <p style="margin-bottom: 0.5rem;"><strong>Nombre:</strong> ${business.name}</p>
                        <p style="margin-bottom: 0.5rem;"><strong>Dirección:</strong> ${business.address}</p>
                        <p style="margin-bottom: 0.5rem;"><strong>Teléfono:</strong> ${business.contact.phone}</p>
                        <p style="margin-bottom: 0.5rem;"><strong>Email:</strong> ${business.contact.email}</p>
                        <p style="margin-bottom: 0.5rem;"><strong>Horarios:</strong> ${business.hours}</p>
                        ${business.description ? `<p style="margin-top: 1rem;"><strong>Descripción:</strong><br>${business.description}</p>` : ''}
                    </div>
                    <div>
                        <h3 style="margin-bottom: 1rem;">Estadísticas</h3>
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
                                 style="width: 100%; border-radius: var(--radius); margin-top: 1rem;">
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        document.getElementById('business-info-container').innerHTML = 
            `<div class="alert alert-error">Error al cargar información: ${error.message}</div>`;
    }
}

// Funciones globales para negocio
window.showEditBusinessForm = async function() {
    const user = auth.getCurrentUser();
    try {
        const business = await api.get(`/businesses/${user.business_id}`);
        const container = document.getElementById('edit-form-container');
        
        container.innerHTML = `
            <div class="card" style="background: var(--bg-secondary); margin-bottom: 2rem;">
                <h2 style="margin-bottom: 1rem;">Editar Negocio</h2>
                <form onsubmit="updateBusiness(event, '${user.business_id}')">
                    <div class="form-group">
                        <label class="form-label">Nombre *</label>
                        <input type="text" id="business-name" class="form-input" value="${business.name}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Dirección *</label>
                        <input type="text" id="business-address" class="form-input" value="${business.address}" required>
                    </div>
                    <div class="grid grid-2">
                        <div class="form-group">
                            <label class="form-label">Teléfono *</label>
                            <input type="tel" id="business-phone" class="form-input" value="${business.contact.phone}" required
                                   pattern="[0-9+\-() ]+"
                                   title="Solo números y símbolos: +, -, espacios, paréntesis">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Email *</label>
                            <input type="email" id="business-email" class="form-input" value="${business.contact.email}" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Horarios *</label>
                        <input type="text" id="business-hours" class="form-input" value="${business.hours}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Descripción</label>
                        <textarea id="business-description" class="form-textarea" rows="4">${business.description || ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label class="form-label">URL de Imagen</label>
                        <input type="url" id="business-image-url" class="form-input" value="${business.imageUrl || ''}"
                               pattern="https?://.+"
                               title="La URL debe comenzar con http:// o https://">
                    </div>
                    <div class="form-group">
                        <label class="form-label">URL de Google Maps (embed)</label>
                        <input type="url" id="business-maps-url" class="form-input" value="${business.googleMapsEmbedUrl || ''}"
                               pattern="https?://.+"
                               title="La URL debe comenzar con http:// o https://">
                    </div>
                    <div class="form-group">
                        <button type="submit" class="btn btn-primary">Guardar Cambios</button>
                        <button type="button" onclick="document.getElementById('edit-form-container').innerHTML = ''" 
                                class="btn btn-secondary" style="margin-left: 0.5rem;">
                            Cancelar
                        </button>
                    </div>
                </form>
            </div>
        `;
        
        // Aplicar validación de formulario
        setTimeout(() => {
            const form = container.querySelector('form');
            if (form && window.formValidation) {
                window.formValidation.setupFormValidation(form);
            }
        }, 100);
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

window.updateBusiness = async function(event, businessId) {
    event.preventDefault();
    const data = {
        name: document.getElementById('business-name').value,
        address: document.getElementById('business-address').value,
        contact: {
            phone: document.getElementById('business-phone').value,
            email: document.getElementById('business-email').value
        },
        hours: document.getElementById('business-hours').value,
        description: document.getElementById('business-description').value,
        imageUrl: document.getElementById('business-image-url').value || null,
        googleMapsEmbedUrl: document.getElementById('business-maps-url').value || null
    };

    try {
        await api.put(`/businesses/${businessId}`, data);
        alert('Negocio actualizado correctamente');
        document.getElementById('edit-form-container').innerHTML = '';
        loadBusinessInfo(businessId);
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

