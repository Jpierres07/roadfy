// Panel de Administración - Dashboard
async function renderAdminDashboard() {
    if (!auth.isAuthenticated() || (!auth.isSuperAdmin() && !auth.isBusinessAdmin())) {
        router.navigate('/');
        return;
    }

    const main = document.getElementById('main-content');
    main.innerHTML = `
        <div class="container">
            <div class="card">
                <h1 style="margin-bottom: 2rem;">Panel de Administración</h1>
                
                <div id="dashboard-stats" class="loading">
                    <i class="fas fa-spinner"></i> Cargando estadísticas...
                </div>
            </div>
        </div>
    `;

    loadAdminDashboardStats();
}

async function loadAdminDashboardStats() {
    try {
        const stats = await api.get('/stats/dashboard');
        const container = document.getElementById('dashboard-stats');
        
        container.innerHTML = `
            <div class="grid grid-4">
                <div class="card" style="text-align: center;">
                    <div style="font-size: 2.5rem; color: var(--primary-color); margin-bottom: 0.5rem;">
                        <i class="fas fa-car-side"></i>
                    </div>
                    <h3 style="font-size: 2rem; margin-bottom: 0.5rem;">${stats.total_tires || 0}</h3>
                    <p style="color: var(--text-secondary);">Llantas</p>
                </div>
                
                <div class="card" style="text-align: center;">
                    <div style="font-size: 2.5rem; color: var(--success-color); margin-bottom: 0.5rem;">
                        <i class="fas fa-store"></i>
                    </div>
                    <h3 style="font-size: 2rem; margin-bottom: 0.5rem;">${stats.total_businesses || 0}</h3>
                    <p style="color: var(--text-secondary);">Negocios</p>
                </div>
                
                <div class="card" style="text-align: center;">
                    <div style="font-size: 2.5rem; color: var(--warning-color); margin-bottom: 0.5rem;">
                        <i class="fas fa-boxes"></i>
                    </div>
                    <h3 style="font-size: 2rem; margin-bottom: 0.5rem;">${stats.total_inventory_items || 0}</h3>
                    <p style="color: var(--text-secondary);">Items en Inventario</p>
                </div>
                
                <div class="card" style="text-align: center;">
                    <div style="font-size: 2.5rem; color: var(--danger-color); margin-bottom: 0.5rem;">
                        <i class="fas fa-users"></i>
                    </div>
                    <h3 style="font-size: 2rem; margin-bottom: 0.5rem;">${stats.total_users || 0}</h3>
                    <p style="color: var(--text-secondary);">Usuarios</p>
                </div>
            </div>
            
            ${auth.isSuperAdmin() ? `
                <div style="margin-top: 2rem;">
                    <h2 style="margin-bottom: 1rem;">Accesos Rápidos</h2>
                    <div class="grid grid-4">
                        <a href="/administracion/llantas" data-link class="card" style="text-decoration: none; text-align: center;">
                            <i class="fas fa-car-side" style="font-size: 2rem; color: var(--primary-color); margin-bottom: 0.5rem;"></i>
                            <h3>Gestionar Llantas</h3>
                        </a>
                        <a href="/administracion/inventario" data-link class="card" style="text-decoration: none; text-align: center;">
                            <i class="fas fa-boxes" style="font-size: 2rem; color: var(--success-color); margin-bottom: 0.5rem;"></i>
                            <h3>Gestionar Inventario</h3>
                        </a>
                        <a href="/administracion/solicitudes-negocios" data-link class="card" style="text-decoration: none; text-align: center;">
                            <i class="fas fa-clipboard-list" style="font-size: 2rem; color: var(--warning-color); margin-bottom: 0.5rem;"></i>
                            <h3>Solicitudes de Negocios</h3>
                        </a>
                        <a href="/administracion/reportes?tab=governance" data-link class="card" style="text-decoration: none; text-align: center;">
                            <i class="fas fa-shield-alt" style="font-size: 2rem; color: var(--danger-color); margin-bottom: 0.5rem;"></i>
                            <h3>Gobierno de Datos</h3>
                        </a>
                    </div>
                </div>
            ` : `
                <div style="margin-top: 2rem;">
                    <h2 style="margin-bottom: 1rem;">Accesos Rápidos</h2>
                    <div class="grid grid-2">
                        <a href="/administracion/inventario" data-link class="card" style="text-decoration: none; text-align: center;">
                            <i class="fas fa-boxes" style="font-size: 2rem; color: var(--success-color); margin-bottom: 0.5rem;"></i>
                            <h3>Mi Inventario</h3>
                        </a>
                        <a href="/administracion/mi-negocio" data-link class="card" style="text-decoration: none; text-align: center;">
                            <i class="fas fa-store" style="font-size: 2rem; color: var(--primary-color); margin-bottom: 0.5rem;"></i>
                            <h3>Mi Negocio</h3>
                        </a>
                    </div>
                </div>
            `}
        `;
    } catch (error) {
        document.getElementById('dashboard-stats').innerHTML = 
            `<div class="alert alert-error">Error al cargar estadísticas: ${error.message}</div>`;
    }
}

