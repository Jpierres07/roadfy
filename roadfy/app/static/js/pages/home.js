// Página Home
async function renderHome() {
    console.log('renderHome() called');
    const main = document.getElementById('main-content');
    if (!main) {
        console.error('Main content element not found');
        return;
    }
    console.log('Main content element found, rendering home page...');
    
    main.innerHTML = `
        <div class="container">
            <section class="hero" style="position: relative; text-align: center; padding: 6rem 2rem; background-image: url('/assets/hero-background.jpg'); background-size: cover; background-position: center; background-repeat: no-repeat; border-radius: var(--radius); margin-bottom: 4rem; overflow: hidden;">
                <div style="position: relative; z-index: 1;">
                    <h1 style="font-size: 3.5rem; margin-bottom: 1rem; color: white; text-shadow: 3px 3px 6px rgba(0,0,0,0.7), 0 0 20px rgba(0,0,0,0.5); font-weight: 700;">ROADFY</h1>
                    <p style="font-size: 1.5rem; color: white; margin-bottom: 2.5rem; text-shadow: 2px 2px 4px rgba(0,0,0,0.7), 0 0 15px rgba(0,0,0,0.5);">
                        Encuentra y compara las mejores llantas para tu vehículo
                    </p>
                    <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                        <a href="/llantas" data-link class="btn btn-primary" style="font-size: 1.125rem; padding: 1rem 2rem; background: white; color: var(--primary-color); border: none; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
                            <i class="fas fa-search"></i> Buscar Llantas
                        </a>
                        <a href="/negocios" data-link class="btn btn-secondary" style="font-size: 1.125rem; padding: 1rem 2rem; background: rgba(255,255,255,0.9); color: var(--primary-color); border: 2px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
                            <i class="fas fa-store"></i> Ver Negocios
                        </a>
                    </div>
                </div>
            </section>

            <section class="features" style="margin-top: 4rem;">
                <h2 style="text-align: center; margin-bottom: 2rem; font-size: 2rem;">Características</h2>
                <div class="grid grid-3">
                    <div class="card">
                        <div style="font-size: 3rem; color: var(--primary-color); margin-bottom: 1rem;">
                            <i class="fas fa-search"></i>
                        </div>
                        <h3 style="margin-bottom: 0.5rem;">Búsqueda Avanzada</h3>
                        <p style="color: var(--text-secondary);">
                            Encuentra llantas por marca, modelo, tipo y tamaño
                        </p>
                    </div>
                    <div class="card">
                        <div style="font-size: 3rem; color: var(--primary-color); margin-bottom: 1rem;">
                            <i class="fas fa-dollar-sign"></i>
                        </div>
                        <h3 style="margin-bottom: 0.5rem;">Compara Precios</h3>
                        <p style="color: var(--text-secondary);">
                            Compara precios de la misma llanta en diferentes negocios
                        </p>
                    </div>
                    <div class="card">
                        <div style="font-size: 3rem; color: var(--primary-color); margin-bottom: 1rem;">
                            <i class="fas fa-star"></i>
                        </div>
                        <h3 style="margin-bottom: 0.5rem;">Reseñas Verificadas</h3>
                        <p style="color: var(--text-secondary);">
                            Lee reseñas de otros usuarios sobre los negocios
                        </p>
                    </div>
                </div>
            </section>

            <section class="popular-tires" style="margin-top: 4rem;">
                <h2 style="margin-bottom: 2rem; font-size: 2rem;">Llantas Populares</h2>
                <div id="popular-tires-container" style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                    <i class="fas fa-spinner"></i> Cargando...
                </div>
            </section>
        </div>
    `;

    // Forzar un reflow para asegurar que el DOM esté completamente renderizado
    void main.offsetHeight;
    
    // Cargar llantas populares después de asegurar que el DOM esté listo
    // Usar múltiples capas de verificación para asegurar que el DOM esté completamente renderizado
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            setTimeout(() => {
                loadPopularTires();
            }, 200);
        });
    });
}

async function loadPopularTires() {
    // Esperar y verificar que el contenedor exista (con reintentos)
    let container = null;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (!container && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100));
        container = document.getElementById('popular-tires-container');
        attempts++;
        
        if (!container) {
            console.warn(`Container not found, attempt ${attempts}/${maxAttempts}`);
        }
    }
    
    if (!container) {
        console.error('Container not found for popular tires after', maxAttempts, 'attempts');
        // Intentar encontrar el main-content y mostrar un mensaje
        const main = document.getElementById('main-content');
        if (main) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'alert alert-error';
            errorDiv.innerHTML = '<i class="fas fa-exclamation-circle"></i> Error: No se pudo encontrar el contenedor de llantas populares';
            main.appendChild(errorDiv);
        }
        return;
    }
    
    // Actualizar inmediatamente para mostrar que está cargando
    container.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-secondary);"><i class="fas fa-spinner fa-spin"></i> Cargando llantas...</div>';
    
    try {
        console.log('Loading popular tires...');
        console.log('API Base URL:', CONFIG.API_BASE_URL);
        
        let tires = [];
        let errorOccurred = false;
        
        // Opción 1: Intentar /tires directamente (más simple)
        try {
            console.log('Trying /tires?limit=6...');
            const response = await api.get('/tires?limit=6');
            console.log('Response type:', typeof response);
            console.log('Response is array:', Array.isArray(response));
            
            if (Array.isArray(response)) {
                tires = response;
            } else if (response && typeof response === 'object' && response.data && Array.isArray(response.data)) {
                tires = response.data;
            } else {
                console.warn('Unexpected response format:', response);
                tires = [];
            }
            
            console.log('Got tires from /tires:', tires?.length || 0);
            
            if (tires && Array.isArray(tires) && tires.length > 0) {
                console.log('Successfully loaded', tires.length, 'tires from /tires');
                console.log('First tire:', tires[0]);
            }
        } catch (e) {
            console.error('Error getting tires from /tires:', e);
            console.error('Error details:', e.message, e.stack);
            errorOccurred = true;
        }
        
        // Opción 2: Si no hay resultados, intentar /stats/popular-tires
        if ((!tires || tires.length === 0) && !errorOccurred) {
            try {
                console.log('Trying /stats/popular-tires...');
                const popular = await api.get('/stats/popular-tires');
                console.log('Got popular tires:', popular?.length || 0);
                
                if (popular && Array.isArray(popular) && popular.length > 0) {
                    // Cargar detalles completos de cada llanta
                    console.log('Loading details for', popular.length, 'popular tires...');
                    const detailed = await Promise.all(
                        popular.slice(0, 6).map(async (p) => {
                            try {
                                const tireDetail = await api.get(`/tires/${p.id}`);
                                return tireDetail;
                            } catch (e) {
                                console.warn(`Error loading tire ${p.id}:`, e.message);
                                return null;
                            }
                        })
                    );
                    tires = detailed.filter(t => t !== null && t !== undefined);
                    console.log('Got detailed tires:', tires.length);
                }
            } catch (e) {
                console.warn('Error getting popular tires:', e.message);
            }
        }
        
        // Si aún no hay llantas, mostrar mensaje
        if (!tires || tires.length === 0) {
            console.log('No tires found, showing empty message');
            console.log('Tires value:', tires);
            container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">No hay llantas disponibles en este momento. Agrega inventario desde el Panel Admin.</p>';
            return;
        }

        console.log('Rendering', tires.length, 'tires');
        console.log('Tires data:', tires);
        
        // Validar y filtrar llantas válidas
        const validTires = tires.filter(tire => {
            const isValid = tire && tire.id;
            if (!isValid) {
                console.warn('Invalid tire:', tire);
            }
            return isValid;
        });
        
        console.log('Valid tires:', validTires.length);
        
        if (validTires.length === 0) {
            console.warn('No valid tires after filtering');
            container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">No hay llantas disponibles en este momento.</p>';
            return;
        }
        
        // Actualizar el contenido del contenedor
        container.innerHTML = `
            <div class="grid grid-3">
                ${validTires.map(tire => {
                    const brand = tire.brand || 'Sin marca';
                    const model = tire.model || 'Sin modelo';
                    const size = tire.size || {};
                    const width = size.width || '?';
                    const aspectRatio = size.aspectRatio || '?';
                    const diameter = size.diameter || '?';
                    const type = tire.type || 'Sin tipo';
                    const imageUrl = tire.imageUrl || 'https://placehold.co/400x400/27272a/e5e5e5/png?text=No+Image';
                    
                    return `
                    <a href="/llantas/${tire.id}" data-link class="tire-card" style="text-decoration: none; display: block;">
                        <img src="${imageUrl}" 
                             alt="${brand} ${model}" 
                             class="tire-card-image"
                             onerror="this.src='https://placehold.co/400x400/27272a/e5e5e5/png?text=No+Image'">
                        <div class="tire-card-body">
                            <h3 class="tire-card-title">${brand} ${model}</h3>
                            <p class="tire-card-info">
                                ${width}/${aspectRatio}R${diameter} - ${type}
                            </p>
                        </div>
                    </a>
                `;
                }).join('')}
            </div>
        `;
    } catch (error) {
        console.error('Error loading popular tires:', error);
        const errorMsg = error.message || 'Error desconocido';
        container.innerHTML = 
            `<div class="alert alert-error" style="text-align: center;">
                <i class="fas fa-exclamation-circle"></i> 
                Error al cargar llantas: ${errorMsg}
                <br>
                <small style="color: var(--text-secondary);">Verifica que el backend esté corriendo en http://localhost:8000/api</small>
            </div>`;
    }
}

