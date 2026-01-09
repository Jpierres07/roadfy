// Página de Detalle de Negocio
async function renderBusinessDetail() {
    const businessId = router.getRouteId();
    console.log('Loading business detail for ID:', businessId);
    
    if (!businessId) {
        const main = document.getElementById('main-content');
        main.innerHTML = `
            <div class="container">
                <div class="alert alert-error">
                    <i class="fas fa-exclamation-circle"></i> 
                    ID de negocio no válido. <a href="/negocios" data-link>Volver a negocios</a>
                </div>
            </div>
        `;
        return;
    }
    
    const main = document.getElementById('main-content');
    
    main.innerHTML = `
        <div class="container">
            <div id="business-detail-container" class="loading">
                <i class="fas fa-spinner"></i> Cargando...
            </div>
        </div>
    `;

    try {
        if (!businessId) {
            throw new Error('ID de negocio no válido');
        }
        
        // Registrar interacción: vista de negocio
        api.post('/governance/interactions', {
            interaction_type: 'VIEW',
            entity_type: 'BUSINESS',
            entity_id: businessId
        }).catch(() => {}); // No bloquear si falla el tracking
        
        const [business, reviews] = await Promise.all([
            api.get(`/businesses/${businessId}`).catch(err => {
                console.error('Error cargando negocio:', err);
                throw new Error(`Error al cargar el negocio: ${err.message}`);
            }),
            api.get(`/reviews/business/${businessId}`).catch(err => {
                console.warn('Error cargando reseñas:', err);
                // Si falla cargar reseñas, continuar con array vacío
                return [];
            })
        ]);
        
        const container = document.getElementById('business-detail-container');
        
        container.innerHTML = `
            <div class="card">
                <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 2rem; margin-bottom: 2rem;">
                    ${business.imageUrl ? `
                        <div>
                            <img src="${business.imageUrl}" 
                                 alt="${business.name}" 
                                 style="width: 100%; border-radius: var(--radius);">
                        </div>
                    ` : ''}
                    <div>
                        <h1 style="font-size: 2rem; margin-bottom: 1rem;">${business.name}</h1>
                        ${business.reviewCount > 0 ? `
                            <div class="rating" style="font-size: 1.25rem; margin-bottom: 1rem;">
                                <i class="fas fa-star"></i>
                                <span>${business.rating.toFixed(1)}</span>
                                <span style="color: var(--text-secondary);">
                                    (${business.reviewCount} ${business.reviewCount === 1 ? 'reseña' : 'reseñas'})
                                </span>
                            </div>
                        ` : `
                            <div style="color: var(--text-secondary); margin-bottom: 1rem;">
                                <i class="fas fa-star" style="opacity: 0.3;"></i>
                                <span>Sin reseñas aún</span>
                            </div>
                        `}
                        <p style="margin-bottom: 0.5rem;">
                            <i class="fas fa-map-marker-alt"></i> <strong>Dirección:</strong> ${business.address}
                        </p>
                        <p style="margin-bottom: 0.5rem;">
                            <i class="fas fa-phone"></i> <strong>Teléfono:</strong> ${business.contact.phone}
                        </p>
                        <p style="margin-bottom: 0.5rem;">
                            <i class="fas fa-envelope"></i> <strong>Email:</strong> ${business.contact.email}
                        </p>
                        <p style="margin-bottom: 1rem;">
                            <i class="fas fa-clock"></i> <strong>Horarios:</strong> ${business.hours}
                        </p>
                        ${business.description ? `
                            <p style="color: var(--text-secondary); margin-top: 1rem;">
                                ${business.description}
                            </p>
                        ` : ''}
                    </div>
                </div>

                ${business.googleMapsEmbedUrl ? `
                    <div class="card" style="margin-top: 2rem;">
                        <h2 style="margin-bottom: 1rem;">Ubicación</h2>
                        <iframe src="${business.googleMapsEmbedUrl}" 
                                width="100%" 
                                height="400" 
                                style="border:0; border-radius: var(--radius);" 
                                allowfullscreen="" 
                                loading="lazy">
                        </iframe>
                    </div>
                ` : ''}

                <div class="card" style="margin-top: 2rem;">
                    <div class="flex-between" style="margin-bottom: 1.5rem;">
                        <h2>Reseñas</h2>
                        ${auth.isAuthenticated() ? `
                            <button onclick="showReviewForm('${businessId}')" class="btn btn-primary">
                                <i class="fas fa-plus"></i> Dejar Reseña
                            </button>
                        ` : `
                            <a href="/iniciar-sesion" data-link class="btn btn-primary">
                                <i class="fas fa-sign-in-alt"></i> Inicia sesión para reseñar
                            </a>
                        `}
                    </div>
                    
                    <div id="review-form-container"></div>
                    
                    <div id="reviews-list">
                        ${reviews.length > 0 ? reviews.map(review => {
                            const currentUser = auth.getCurrentUser();
                            const canDelete = currentUser && currentUser.id === review.user_id;
                            return `
                            <div style="padding: 1rem; border-bottom: 1px solid var(--border-color);">
                                <div class="flex-between" style="margin-bottom: 0.5rem;">
                                    <div>
                                        <strong>${review.user_name || 'Usuario'}</strong>
                                        <div class="rating" style="display: inline-block; margin-left: 0.5rem;">
                                            ${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}
                                        </div>
                                    </div>
                                    <div style="display: flex; align-items: center; gap: 1rem;">
                                        <span style="color: var(--text-secondary); font-size: 0.875rem;">
                                            ${new Date(review.created_at).toLocaleDateString()}
                                        </span>
                                        ${canDelete ? `
                                            <button onclick="deleteReview('${review.id}', '${businessId}')" 
                                                    class="btn btn-danger" style="padding: 0.25rem 0.5rem; font-size: 0.875rem;">
                                                <i class="fas fa-trash"></i>
                                            </button>
                                        ` : ''}
                                    </div>
                                </div>
                                ${review.comment ? `<p style="color: var(--text-secondary);">${review.comment}</p>` : ''}
                            </div>
                        `;
                        }).join('') : '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">No hay reseñas aún</p>'}
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        document.getElementById('business-detail-container').innerHTML = 
            `<div class="alert alert-error">Error al cargar el negocio: ${error.message}</div>`;
    }
}

// Funciones globales para reseñas
window.showReviewForm = function(businessId) {
    const container = document.getElementById('review-form-container');
    container.innerHTML = `
        <div class="card" style="background: var(--bg-secondary); margin-bottom: 1.5rem;">
            <h3 style="margin-bottom: 1rem;">Dejar Reseña</h3>
            <form onsubmit="submitReview(event, '${businessId}')">
                <div class="form-group">
                    <label class="form-label">Calificación</label>
                    <select id="review-rating" class="form-select" required>
                        <option value="">Selecciona una calificación</option>
                        <option value="5">5 - Excelente</option>
                        <option value="4">4 - Muy bueno</option>
                        <option value="3">3 - Bueno</option>
                        <option value="2">2 - Regular</option>
                        <option value="1">1 - Malo</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Comentario (opcional)</label>
                    <textarea id="review-comment" class="form-textarea" rows="4"></textarea>
                </div>
                <div class="form-group">
                    <button type="submit" class="btn btn-primary">Enviar Reseña</button>
                    <button type="button" onclick="document.getElementById('review-form-container').innerHTML = ''" 
                            class="btn btn-secondary" style="margin-left: 0.5rem;">
                        Cancelar
                    </button>
                </div>
            </form>
        </div>
    `;
}

window.submitReview = async function(event, businessId) {
    event.preventDefault();
    const rating = parseInt(document.getElementById('review-rating').value);
    const comment = document.getElementById('review-comment').value;
    
    try {
        await api.post('/reviews', {
            business_id: businessId,
            rating: rating,
            comment: comment
        });
        
        document.getElementById('review-form-container').innerHTML = 
            '<div class="alert alert-success">Reseña enviada correctamente</div>';
        
        // Recargar página
        setTimeout(() => {
            renderBusinessDetail();
        }, 1000);
    } catch (error) {
        document.getElementById('review-form-container').innerHTML = 
            `<div class="alert alert-error">Error: ${error.message}</div>`;
    }
}

window.deleteReview = async function(reviewId, businessId) {
    if (!confirm('¿Estás seguro de eliminar esta reseña?')) return;
    
    try {
        await api.delete(`/reviews/${reviewId}`);
        alert('Reseña eliminada correctamente');
        renderBusinessDetail();
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}
