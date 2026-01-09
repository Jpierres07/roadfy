// Panel Admin - Reportes
async function renderAdminReports() {
    if (!auth.isAuthenticated() || !auth.isSuperAdmin()) {
        router.navigate('/');
        return;
    }

    const main = document.getElementById('main-content');
    main.innerHTML = `
        <div class="container">
            <div class="card">
                <h1 style="margin-bottom: 2rem;">Reportes y Estadísticas</h1>
                
                <div id="reports-tabs" style="margin-bottom: 2rem; border-bottom: 2px solid var(--border-color);">
                    <button onclick="showReportTab('dashboard')" class="report-tab active" id="tab-dashboard">
                        Dashboard
                    </button>
                    <button onclick="showReportTab('popular-tires')" class="report-tab" id="tab-popular-tires">
                        Llantas Populares
                    </button>
                    <button onclick="showReportTab('most-searched')" class="report-tab" id="tab-most-searched">
                        Más Buscadas
                    </button>
                    <button onclick="showReportTab('active-businesses')" class="report-tab" id="tab-active-businesses">
                        Negocios Activos
                    </button>
                    <button onclick="showReportTab('price-trends')" class="report-tab" id="tab-price-trends">
                        Tendencias de Precio
                    </button>
                    <button onclick="showReportTab('inventory-by-type')" class="report-tab" id="tab-inventory-by-type">
                        Inventario por Tipo
                    </button>
                    <button onclick="showReportTab('inventory-over-time')" class="report-tab" id="tab-inventory-over-time">
                        Inventario en el Tiempo
                    </button>
                    <button onclick="showReportTab('governance')" class="report-tab" id="tab-governance">
                        Gobierno de Datos
                    </button>
                </div>
                
                <div id="reports-container" class="loading">
                    <i class="fas fa-spinner"></i> Cargando reportes...
                </div>
            </div>
        </div>
    `;

    // Esperar un poco para asegurar que el DOM esté listo
    setTimeout(() => {
        const params = router.getParams();
        const initialTab = params.tab || 'dashboard';
        showReportTab(initialTab);
    }, 100);
}

let currentTab = 'dashboard';

// Función para traducir tipos de acceso al español
function translateAccessType(type) {
    const translations = {
        'LOGIN': 'Inicio de Sesión',
        'LOGIN_FAILED': 'Inicio de Sesión Fallido',
        'LOGOUT': 'Cierre de Sesión',
        'API_ACCESS': 'Acceso a API',
        'DATA_ACCESS': 'Acceso a Datos',
        'FILE_DOWNLOAD': 'Descarga de Archivo',
        'REPORT_GENERATION': 'Generación de Reporte',
        'ADMIN_ACTION': 'Acción de Administrador',
        'DATA_EXPORT': 'Exportación de Datos',
        'DATA_IMPORT': 'Importación de Datos'
    };
    return translations[type] || type;
}

// Función para traducir acciones de auditoría al español
function translateAuditAction(action) {
    const translations = {
        'INSERT': 'Inserción',
        'UPDATE': 'Actualización',
        'DELETE': 'Eliminación',
        'SELECT': 'Consulta',
        'CREATE': 'Creación',
        'MODIFY': 'Modificación',
        'REMOVE': 'Remoción'
    };
    return translations[action] || action;
}

// Función global para tabs de reportes
window.showReportTab = async function(tabName) {
    currentTab = tabName;
    
    // Remover clase 'active' de todos los botones y añadir al actual
    document.querySelectorAll('.report-tab').forEach(button => {
        button.classList.remove('active');
    });
    const activeTab = document.getElementById(`tab-${tabName}`);
    if (activeTab) {
        activeTab.classList.add('active');
    }

    // Verificar que el contenedor existe
    const container = document.getElementById('reports-container');
    if (!container) {
        console.error('Reports container not found, waiting for DOM...');
        setTimeout(() => {
            window.showReportTab(tabName);
        }, 100);
        return;
    }
    
    container.innerHTML = '<div style="text-align: center; padding: 2rem;"><i class="fas fa-spinner fa-spin"></i> Cargando...</div>';

    try {
        switch (tabName) {
            case 'dashboard':
                await loadDashboardStats();
                break;
            case 'popular-tires':
                await new Promise(resolve => setTimeout(resolve, 100));
                await loadPopularTiresReport();
                break;
            case 'most-searched':
                await loadMostSearchedTires();
                break;
            case 'active-businesses':
                await loadActiveBusinesses();
                break;
            case 'price-trends':
                await loadPriceTrends();
                break;
            case 'inventory-by-type':
                await loadInventoryByType();
                break;
            case 'inventory-over-time':
                await loadInventoryOverTime();
                break;
            case 'governance':
                await loadGovernanceMetrics();
                break;
            default:
                container.innerHTML = '<div class="alert alert-warning">Reporte no encontrado.</div>';
                break;
        }
    } catch (error) {
        if (container) {
            container.innerHTML = `<div class="alert alert-error">Error al cargar reporte: ${error.message}</div>`;
        }
    }
}

async function loadDashboardStats() {
    const container = document.getElementById('reports-container');
    if (!container) {
        console.error('Reports container not found');
        return;
    }
    
    try {
        const stats = await api.get('/stats/dashboard');
        
        container.innerHTML = `
        <div class="grid grid-3" style="margin-bottom: 2rem;">
            <div class="card" style="text-align: center;">
                <h2 style="font-size: 2.5rem; color: var(--primary-color); margin-bottom: 0.5rem;">
                    ${stats.total_tires || 0}
                </h2>
                <p style="color: var(--text-secondary);">Total de Llantas</p>
            </div>
            <div class="card" style="text-align: center;">
                <h2 style="font-size: 2.5rem; color: var(--primary-color); margin-bottom: 0.5rem;">
                    ${stats.total_businesses || 0}
                </h2>
                <p style="color: var(--text-secondary);">Total de Negocios</p>
            </div>
            <div class="card" style="text-align: center;">
                <h2 style="font-size: 2.5rem; color: var(--primary-color); margin-bottom: 0.5rem;">
                    ${stats.total_inventory_items || 0}
                </h2>
                <p style="color: var(--text-secondary);">Items en Inventario</p>
            </div>
            <div class="card" style="text-align: center;">
                <h2 style="font-size: 2.5rem; color: var(--primary-color); margin-bottom: 0.5rem;">
                    S/ ${(stats.total_inventory_value || 0).toFixed(2)}
                </h2>
                <p style="color: var(--text-secondary);">Valor Total Inventario</p>
            </div>
            <div class="card" style="text-align: center;">
                <h2 style="font-size: 2.5rem; color: var(--primary-color); margin-bottom: 0.5rem;">
                    ${stats.total_users || 0}
                </h2>
                <p style="color: var(--text-secondary);">Total de Usuarios</p>
            </div>
        </div>
        
        <!-- Gráfico de distribución general -->
        <div class="card" style="background: var(--bg-secondary); margin-top: 2rem;">
            <h3 style="margin-bottom: 1rem;"><i class="fas fa-chart-pie"></i> Distribución General del Sistema</h3>
            <canvas id="dashboardOverviewChart" style="max-height: 400px;"></canvas>
        </div>
    `;
        
        // Renderizar gráfico después de que el DOM esté listo
        setTimeout(() => {
            renderDashboardChart(stats);
        }, 100);
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
        container.innerHTML = `<div class="alert alert-error">Error al cargar estadísticas: ${error.message}</div>`;
    }
}

async function loadPopularTiresReport() {
    await new Promise(resolve => setTimeout(resolve, 150));
    
    const container = document.getElementById('reports-container');
    if (!container) {
        console.error('Reports container not found');
        return;
    }
    
    try {
        const popular = await api.get('/stats/popular-tires');
        
        if (!popular || !Array.isArray(popular) || popular.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 3rem;">No hay datos disponibles</p>';
            return;
        }
        
        // Cargar detalles completos de cada llanta
        const tires = await Promise.all(
            popular.slice(0, 10).map(async (p) => {
                try {
                    const tireDetail = await api.get(`/tires/${p.id}`);
                    return tireDetail;
                } catch (e) {
                    console.warn(`Error loading tire ${p.id}:`, e.message);
                    return null;
                }
            })
        );
        
        const validTires = tires.filter(t => t !== null && t !== undefined);
        
        if (validTires.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 3rem;">No hay datos disponibles</p>';
            return;
        }
        
        const containerCheck = document.getElementById('reports-container');
        if (!containerCheck) {
            console.error('Reports container not found when trying to render');
            return;
        }
        
        containerCheck.innerHTML = `
            <div style="margin-bottom: 2rem;">
                <h3 style="margin-bottom: 1rem;"><i class="fas fa-chart-bar"></i> Gráfico de Llantas Populares</h3>
                <canvas id="popularTiresChart" style="max-height: 400px;"></canvas>
            </div>
            
            <div class="table-container">
                <h3 style="margin-bottom: 1rem;"><i class="fas fa-table"></i> Tabla Detallada</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Llanta</th>
                            <th>Marca</th>
                            <th>Modelo</th>
                            <th>Tipo</th>
                            <th>Cantidad Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${validTires.map(tire => {
                            const popularItem = popular.find(p => p.id === tire.id);
                            return `
                            <tr>
                                <td><a href="/llantas/${tire.id}" data-link>${tire.brand} ${tire.model}</a></td>
                                <td>${tire.brand || 'N/A'}</td>
                                <td>${tire.model || 'N/A'}</td>
                                <td>${tire.type || 'N/A'}</td>
                                <td style="text-align: center; font-weight: 600; color: var(--primary-color);">
                                    ${popularItem?.total_quantity || 0}
                                </td>
                            </tr>
                        `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
        
        // Renderizar gráfico
        setTimeout(() => {
            renderPopularTiresChart(validTires, popular);
        }, 100);
    } catch (error) {
        console.error('Error loading popular tires:', error);
        const errorContainer = document.getElementById('reports-container');
        if (errorContainer) {
            errorContainer.innerHTML = 
                `<div class="alert alert-error" style="text-align: center;">
                    <i class="fas fa-exclamation-circle"></i> 
                    Error al cargar llantas populares: ${error.message}
                </div>`;
        }
    }
}

async function loadMostSearchedTires() {
    const container = document.getElementById('reports-container');
    if (!container) {
        console.error('Reports container not found');
        return;
    }
    
    try {
        const tires = await api.get('/stats/reports/most-searched-tires');
        
        if (tires.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 3rem;">No hay datos disponibles</p>';
            return;
        }
    
    container.innerHTML = `
        <div style="margin-bottom: 2rem;">
            <h3 style="margin-bottom: 1rem;"><i class="fas fa-chart-line"></i> Gráfico de Llantas Más Buscadas</h3>
            <canvas id="mostSearchedChart" style="max-height: 400px;"></canvas>
        </div>
        
        <div class="table-container">
            <h3 style="margin-bottom: 1rem;"><i class="fas fa-table"></i> Tabla Detallada</h3>
            <table>
                <thead>
                    <tr>
                        <th>Llanta</th>
                        <th>Marca</th>
                        <th>Modelo</th>
                        <th>Items en Inventario</th>
                        <th>Cantidad Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${tires.map(tire => `
                        <tr>
                            <td><a href="/llantas/${tire.id}" data-link>${tire.id}</a></td>
                            <td>${tire.brand}</td>
                            <td>${tire.model}</td>
                            <td style="text-align: center;">${tire.inventory_count}</td>
                            <td style="text-align: center; font-weight: 600;">${tire.total_quantity}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    
    // Renderizar gráfico
    setTimeout(() => {
        renderMostSearchedChart(tires);
    }, 100);
    } catch (error) {
        console.error('Error loading most searched tires:', error);
        container.innerHTML = `<div class="alert alert-error">Error al cargar reporte: ${error.message}</div>`;
    }
}

async function loadActiveBusinesses() {
    const container = document.getElementById('reports-container');
    if (!container) {
        console.error('Reports container not found');
        return;
    }
    
    try {
        const businesses = await api.get('/stats/reports/most-active-businesses');
        
        if (businesses.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 3rem;">No hay datos disponibles</p>';
            return;
        }
    
    container.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem;">
            <div>
                <h3 style="margin-bottom: 1rem;"><i class="fas fa-chart-bar"></i> Items en Inventario por Negocio</h3>
                <canvas id="businessInventoryChart" style="max-height: 350px;"></canvas>
            </div>
            <div>
                <h3 style="margin-bottom: 1rem;"><i class="fas fa-chart-line"></i> Valor Total por Negocio</h3>
                <canvas id="businessValueChart" style="max-height: 350px;"></canvas>
            </div>
        </div>
        
        <div class="table-container">
            <h3 style="margin-bottom: 1rem;"><i class="fas fa-table"></i> Tabla Detallada</h3>
            <table>
                <thead>
                    <tr>
                        <th>Negocio</th>
                        <th>Items en Inventario</th>
                        <th>Cantidad Total</th>
                        <th>Valor Total</th>
                        <th>Calificación</th>
                    </tr>
                </thead>
                <tbody>
                    ${businesses.map(biz => `
                        <tr>
                            <td>
                                <a href="/negocios/${biz.id}" data-link>${biz.name}</a>
                            </td>
                            <td style="text-align: center;">${biz.inventory_count}</td>
                            <td style="text-align: center;">${biz.total_quantity}</td>
                            <td style="text-align: center; font-weight: 600; color: var(--primary-color);">
                                S/ ${biz.total_value.toFixed(2)}
                            </td>
                            <td style="text-align: center;">
                                ${biz.reviewCount > 0 ? `
                                    <span class="rating">
                                        <i class="fas fa-star"></i> ${biz.rating.toFixed(1)}
                                    </span>
                                ` : `
                                    <span style="color: var(--text-secondary);">Sin reseñas</span>
                                `}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    
    // Renderizar gráficos
    setTimeout(() => {
        renderActiveBusinessesCharts(businesses);
    }, 100);
    } catch (error) {
        console.error('Error loading active businesses:', error);
        container.innerHTML = `<div class="alert alert-error">Error al cargar reporte: ${error.message}</div>`;
    }
}

async function loadPriceTrends() {
    const container = document.getElementById('reports-container');
    if (!container) {
        console.error('Reports container not found');
        return;
    }
    
    try {
        const trends = await api.get('/stats/reports/price-trends');
        
        if (trends.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 3rem;">No hay datos disponibles</p>';
            return;
        }
    
    container.innerHTML = `
        <div style="margin-bottom: 2rem;">
            <h3 style="margin-bottom: 1rem;"><i class="fas fa-chart-line"></i> Tendencias de Precio por Tipo</h3>
            <canvas id="priceTrendsChart" style="max-height: 400px;"></canvas>
        </div>
        
        <div class="table-container">
            <h3 style="margin-bottom: 1rem;"><i class="fas fa-table"></i> Tabla Detallada</h3>
            <table>
                <thead>
                    <tr>
                        <th>Tipo de Llanta</th>
                        <th>Precio Promedio</th>
                        <th>Precio Mínimo</th>
                        <th>Precio Máximo</th>
                        <th>Cantidad de Items</th>
                    </tr>
                </thead>
                <tbody>
                    ${trends.map(trend => `
                        <tr>
                            <td><strong>${trend.type}</strong></td>
                            <td style="text-align: center; font-weight: 600; color: var(--primary-color);">
                                S/ ${trend.avg_price.toFixed(2)}
                            </td>
                            <td style="text-align: center;">S/ ${trend.min_price.toFixed(2)}</td>
                            <td style="text-align: center;">S/ ${trend.max_price.toFixed(2)}</td>
                            <td style="text-align: center;">${trend.count}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    
    // Renderizar gráfico
    setTimeout(() => {
        renderPriceTrendsChart(trends);
    }, 100);
    } catch (error) {
        console.error('Error loading price trends:', error);
        container.innerHTML = `<div class="alert alert-error">Error al cargar reporte: ${error.message}</div>`;
    }
}

async function loadInventoryByType() {
    const container = document.getElementById('reports-container');
    if (!container) {
        console.error('Reports container not found');
        return;
    }
    
    try {
        const inventory = await api.get('/stats/reports/inventory-by-type');
        
        if (inventory.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 3rem;">No hay datos disponibles</p>';
            return;
        }
    
    container.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem;">
            <div>
                <h3 style="margin-bottom: 1rem;"><i class="fas fa-chart-pie"></i> Distribución por Tipo (Cantidad)</h3>
                <canvas id="inventoryByTypePieChart" style="max-height: 350px;"></canvas>
            </div>
            <div>
                <h3 style="margin-bottom: 1rem;"><i class="fas fa-chart-bar"></i> Cantidad Total por Tipo</h3>
                <canvas id="inventoryByTypeBarChart" style="max-height: 350px;"></canvas>
            </div>
        </div>
        
        <div class="table-container">
            <h3 style="margin-bottom: 1rem;"><i class="fas fa-table"></i> Tabla Detallada</h3>
            <table>
                <thead>
                    <tr>
                        <th>Tipo de Llanta</th>
                        <th>Cantidad Total</th>
                        <th>Items en Inventario</th>
                    </tr>
                </thead>
                <tbody>
                    ${inventory.map(item => `
                        <tr>
                            <td><strong>${item.type}</strong></td>
                            <td style="text-align: center; font-weight: 600; color: var(--primary-color);">
                                ${item.total_quantity}
                            </td>
                            <td style="text-align: center;">${item.item_count}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    
    // Renderizar gráficos
    setTimeout(() => {
        renderInventoryByTypeCharts(inventory);
    }, 100);
    } catch (error) {
        console.error('Error loading inventory by type:', error);
        container.innerHTML = `<div class="alert alert-error">Error al cargar reporte: ${error.message}</div>`;
    }
}

async function loadInventoryOverTime() {
    const container = document.getElementById('reports-container');
    if (!container) {
        console.error('Reports container not found');
        return;
    }
    
    try {
        const data = await api.get('/stats/reports/inventory-over-time');
        
        if (data.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 3rem;">No hay datos disponibles</p>';
            return;
        }
    
    container.innerHTML = `
        <div style="margin-bottom: 2rem;">
            <h3 style="margin-bottom: 1rem;"><i class="fas fa-chart-area"></i> Evolución del Inventario en el Tiempo</h3>
            <canvas id="inventoryOverTimeChart" style="max-height: 400px;"></canvas>
        </div>
        
        <div class="table-container">
            <h3 style="margin-bottom: 1rem;"><i class="fas fa-table"></i> Tabla Detallada</h3>
            <table>
                <thead>
                    <tr>
                        <th>Período</th>
                        <th>Items Agregados</th>
                        <th>Cantidad Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.map(item => `
                        <tr>
                            <td><strong>${item.label}</strong></td>
                            <td style="text-align: center;">${item.item_count}</td>
                            <td style="text-align: center; font-weight: 600; color: var(--primary-color);">
                                ${item.total_quantity}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    
    // Renderizar gráfico
    setTimeout(() => {
        renderInventoryOverTimeChart(data);
    }, 100);
    } catch (error) {
        console.error('Error loading inventory over time:', error);
        container.innerHTML = `<div class="alert alert-error">Error al cargar reporte: ${error.message}</div>`;
    }
}

// ============================================
// FUNCIONES DE RENDERIZADO DE GRÁFICOS
// ============================================

// Gráfico para Dashboard
function renderDashboardChart(stats) {
    const ctx = document.getElementById('dashboardOverviewChart');
    if (ctx && stats) {
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Llantas', 'Negocios', 'Items Inventario', 'Usuarios'],
                datasets: [{
                    label: 'Distribución',
                    data: [
                        stats.total_tires || 0,
                        stats.total_businesses || 0,
                        stats.total_inventory_items || 0,
                        stats.total_users || 0
                    ],
                    backgroundColor: [
                        'rgba(59, 130, 246, 0.8)',
                        'rgba(16, 185, 129, 0.8)',
                        'rgba(245, 158, 11, 0.8)',
                        'rgba(239, 68, 68, 0.8)'
                    ],
                    borderColor: [
                        'rgba(59, 130, 246, 1)',
                        'rgba(16, 185, 129, 1)',
                        'rgba(245, 158, 11, 1)',
                        'rgba(239, 68, 68, 1)'
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    title: {
                        display: true,
                        text: 'Vista General del Sistema'
                    }
                }
            }
        });
    }
}

// Gráfico para Llantas Populares
function renderPopularTiresChart(tires, popular) {
    const ctx = document.getElementById('popularTiresChart');
    if (ctx && tires && tires.length > 0) {
        const top10 = tires.slice(0, 10);
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: top10.map(t => `${t.brand} ${t.model}`.substring(0, 20)),
                datasets: [{
                    label: 'Cantidad Total',
                    data: top10.map(t => {
                        const p = popular.find(p => p.id === t.id);
                        return p?.total_quantity || 0;
                    }),
                    backgroundColor: 'rgba(59, 130, 246, 0.8)',
                    borderColor: 'rgba(59, 130, 246, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: 'Top 10 Llantas Populares'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
}

// Gráfico para Llantas Más Buscadas
function renderMostSearchedChart(tires) {
    const ctx = document.getElementById('mostSearchedChart');
    if (ctx && tires && tires.length > 0) {
        const top10 = tires.slice(0, 10);
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: top10.map(t => `${t.brand} ${t.model}`.substring(0, 15)),
                datasets: [{
                    label: 'Cantidad Total',
                    data: top10.map(t => t.total_quantity || 0),
                    borderColor: 'rgba(16, 185, 129, 1)',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true,
                    tension: 0.4
                }, {
                    label: 'Items en Inventario',
                    data: top10.map(t => t.inventory_count || 0),
                    borderColor: 'rgba(59, 130, 246, 1)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Top 10 Llantas Más Buscadas'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
}

// Gráficos para Negocios Activos
function renderActiveBusinessesCharts(businesses) {
    // Gráfico de items en inventario
    const inventoryCtx = document.getElementById('businessInventoryChart');
    if (inventoryCtx && businesses && businesses.length > 0) {
        const top10 = businesses.slice(0, 10);
        new Chart(inventoryCtx, {
            type: 'bar',
            data: {
                labels: top10.map(b => b.name.substring(0, 15)),
                datasets: [{
                    label: 'Items en Inventario',
                    data: top10.map(b => b.inventory_count || 0),
                    backgroundColor: 'rgba(59, 130, 246, 0.8)',
                    borderColor: 'rgba(59, 130, 246, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: 'Items en Inventario por Negocio'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
    
    // Gráfico de valor total
    const valueCtx = document.getElementById('businessValueChart');
    if (valueCtx && businesses && businesses.length > 0) {
        const top10 = businesses.slice(0, 10);
        new Chart(valueCtx, {
            type: 'bar',
            data: {
                labels: top10.map(b => b.name.substring(0, 15)),
                datasets: [{
                    label: 'Valor Total (S/)',
                    data: top10.map(b => b.total_value || 0),
                    backgroundColor: 'rgba(16, 185, 129, 0.8)',
                    borderColor: 'rgba(16, 185, 129, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: 'Valor Total por Negocio'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return 'S/ ' + value.toFixed(0);
                            }
                        }
                    }
                }
            }
        });
    }
}

// Gráfico para Tendencias de Precio
function renderPriceTrendsChart(trends) {
    const ctx = document.getElementById('priceTrendsChart');
    if (ctx && trends && trends.length > 0) {
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: trends.map(t => t.type),
                datasets: [{
                    label: 'Precio Promedio',
                    data: trends.map(t => t.avg_price || 0),
                    borderColor: 'rgba(59, 130, 246, 1)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true,
                    tension: 0.4
                }, {
                    label: 'Precio Mínimo',
                    data: trends.map(t => t.min_price || 0),
                    borderColor: 'rgba(16, 185, 129, 1)',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: false,
                    borderDash: [5, 5]
                }, {
                    label: 'Precio Máximo',
                    data: trends.map(t => t.max_price || 0),
                    borderColor: 'rgba(239, 68, 68, 1)',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    fill: false,
                    borderDash: [5, 5]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Tendencias de Precio por Tipo de Llanta'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return 'S/ ' + value.toFixed(2);
                            }
                        }
                    }
                }
            }
        });
    }
}

// Gráficos para Inventario por Tipo
function renderInventoryByTypeCharts(inventory) {
    // Gráfico de pastel
    const pieCtx = document.getElementById('inventoryByTypePieChart');
    if (pieCtx && inventory && inventory.length > 0) {
        new Chart(pieCtx, {
            type: 'pie',
            data: {
                labels: inventory.map(i => i.type),
                datasets: [{
                    data: inventory.map(i => i.total_quantity || 0),
                    backgroundColor: [
                        'rgba(59, 130, 246, 0.8)',
                        'rgba(16, 185, 129, 0.8)',
                        'rgba(245, 158, 11, 0.8)',
                        'rgba(239, 68, 68, 0.8)',
                        'rgba(139, 92, 246, 0.8)',
                        'rgba(236, 72, 153, 0.8)'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Distribución por Tipo (Cantidad)'
                    }
                }
            }
        });
    }
    
    // Gráfico de barras
    const barCtx = document.getElementById('inventoryByTypeBarChart');
    if (barCtx && inventory && inventory.length > 0) {
        new Chart(barCtx, {
            type: 'bar',
            data: {
                labels: inventory.map(i => i.type),
                datasets: [{
                    label: 'Cantidad Total',
                    data: inventory.map(i => i.total_quantity || 0),
                    backgroundColor: 'rgba(59, 130, 246, 0.8)',
                    borderColor: 'rgba(59, 130, 246, 1)',
                    borderWidth: 1
                }, {
                    label: 'Items en Inventario',
                    data: inventory.map(i => i.item_count || 0),
                    backgroundColor: 'rgba(16, 185, 129, 0.8)',
                    borderColor: 'rgba(16, 185, 129, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Cantidad Total por Tipo'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
}

// Gráfico para Inventario en el Tiempo
function renderInventoryOverTimeChart(data) {
    const ctx = document.getElementById('inventoryOverTimeChart');
    if (ctx && data && data.length > 0) {
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(d => d.label || new Date(d.date).toLocaleDateString('es-PE')),
                datasets: [{
                    label: 'Cantidad Total',
                    data: data.map(d => d.total_quantity || 0),
                    borderColor: 'rgba(59, 130, 246, 1)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true,
                    tension: 0.4
                }, {
                    label: 'Items Agregados',
                    data: data.map(d => d.items_added || d.item_count || 0),
                    borderColor: 'rgba(16, 185, 129, 1)',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Evolución del Inventario en el Tiempo'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
}

// Función para cargar métricas de gobierno de datos (ya existente en el código anterior)
async function loadGovernanceMetrics() {
    const container = document.getElementById('reports-container');
    if (!container) {
        console.error('Reports container not found');
        return;
    }
    
    try {
        // Cargar múltiples métricas en paralelo
        const [auditSummary, accessSummary, dataQuality, interactionSummary] = await Promise.all([
            api.get('/governance/reports/audit-summary?days=30').catch(() => ({})),
            api.get('/governance/reports/access-summary?days=30').catch(() => ({})),
            api.get('/governance/data-quality').catch(() => ({})),
            api.get('/governance/reports/interaction-summary?days=30').catch(() => ({}))
        ]);
        
        container.innerHTML = `
            <div style="margin-bottom: 2rem;">
                <h2 style="margin-bottom: 1rem;"><i class="fas fa-shield-alt"></i> Métricas de Gobierno de Datos</h2>
                <p style="color: var(--text-secondary); margin-bottom: 2rem;">
                    Información sobre auditoría, accesos y calidad de datos del sistema.
                </p>
                <div style="text-align: right; margin-bottom: 1.5rem;">
                    <button onclick="downloadGovernancePDF('full')" class="btn btn-primary" style="margin-right: 0.5rem;">
                        <i class="fas fa-file-pdf"></i> Descargar PDF Completo
                    </button>
                    <div class="dropdown" style="display: inline-block;">
                        <button class="btn btn-secondary" onclick="this.nextElementSibling.classList.toggle('show')">
                            <i class="fas fa-download"></i> Más Reportes <i class="fas fa-chevron-down"></i>
                        </button>
                        <div class="dropdown-menu" style="display: none; position: absolute; background: white; border: 1px solid var(--border-color); border-radius: var(--radius); box-shadow: var(--shadow-lg); padding: 0.5rem; min-width: 200px; z-index: 1000; margin-top: 0.25rem;">
                            <a href="#" onclick="downloadGovernancePDF('audit'); return false;" style="display: block; padding: 0.5rem; text-decoration: none; color: var(--text-primary); border-radius: var(--radius);">
                                <i class="fas fa-history"></i> Reporte de Auditoría
                            </a>
                            <a href="#" onclick="downloadGovernancePDF('access'); return false;" style="display: block; padding: 0.5rem; text-decoration: none; color: var(--text-primary); border-radius: var(--radius);">
                                <i class="fas fa-sign-in-alt"></i> Reporte de Accesos
                            </a>
                            <a href="#" onclick="downloadGovernancePDF('quality'); return false;" style="display: block; padding: 0.5rem; text-decoration: none; color: var(--text-primary); border-radius: var(--radius);">
                                <i class="fas fa-check-circle"></i> Reporte de Calidad
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Resumen de Auditoría -->
            <div class="card" style="background: var(--bg-secondary); margin-bottom: 2rem;">
                <div class="flex-between" style="margin-bottom: 1rem;">
                    <h3 style="margin: 0;"><i class="fas fa-history"></i> Resumen de Auditoría (Últimos 30 días)</h3>
                    <button onclick="downloadGovernancePDF('audit')" class="btn btn-sm btn-secondary">PDF</button>
                </div>
                ${auditSummary.periodo_dias ? `
                    <div style="margin-bottom: 1rem;">
                        <p><strong>Período:</strong> ${new Date(auditSummary.fecha_inicio).toLocaleDateString('es-PE')} - ${new Date(auditSummary.fecha_fin).toLocaleDateString('es-PE')}</p>
                    </div>
                    <div class="grid grid-3" style="margin-bottom: 1.5rem;">
                        ${auditSummary.resumen_acciones ? auditSummary.resumen_acciones.map(action => `
                            <div class="card" style="text-align: center; padding: 1rem;">
                                <h3 style="font-size: 1.5rem; color: var(--primary-color); margin: 0;">${action.cantidad}</h3>
                                <p style="margin: 0.5rem 0 0 0; color: var(--text-secondary);">${translateAuditAction(action.accion)}</p>
                            </div>
                        `).join('') : '<p>No hay datos de acciones</p>'}
                    </div>
                    <div style="margin-bottom: 2rem;">
                        <canvas id="auditActionsChart"></canvas>
                    </div>
                    ${auditSummary.tablas_mas_modificadas && auditSummary.tablas_mas_modificadas.length > 0 ? `
                        <div style="margin-top: 1.5rem;">
                            <h4 style="margin-bottom: 0.5rem;">Tablas Más Modificadas</h4>
                            <div class="table-container" style="margin-bottom: 1rem;">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Tabla</th>
                                            <th>Cambios</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${auditSummary.tablas_mas_modificadas.map(table => `
                                            <tr>
                                                <td><strong>${table.tabla}</strong></td>
                                                <td style="text-align: center; font-weight: 600; color: var(--primary-color);">
                                                    ${table.cantidad}
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                            <canvas id="modifiedTablesChart"></canvas>
                        </div>
                    ` : ''}
                ` : '<p style="color: var(--text-secondary);">No hay datos de auditoría disponibles</p>'}
            </div>

            <!-- Resumen de Accesos -->
            <div class="card" style="background: var(--bg-secondary); margin-bottom: 2rem;">
                <div class="flex-between" style="margin-bottom: 1rem;">
                    <h3 style="margin: 0;"><i class="fas fa-sign-in-alt"></i> Resumen de Accesos (Últimos 30 días)</h3>
                    <button onclick="downloadGovernancePDF('access')" class="btn btn-sm btn-secondary">PDF</button>
                </div>
                ${accessSummary.periodo_dias ? `
                    <div style="margin-bottom: 1rem;">
                        <p><strong>Período:</strong> ${new Date(accessSummary.fecha_inicio).toLocaleDateString('es-PE')} - ${new Date(accessSummary.fecha_fin).toLocaleDateString('es-PE')}</p>
                    </div>
                    <div class="grid grid-2" style="margin-bottom: 1.5rem;">
                        <div class="card" style="text-align: center; padding: 1rem;">
                            <h3 style="font-size: 1.5rem; color: var(--success-color); margin: 0;">
                                ${accessSummary.resumen_tipos_acceso ? accessSummary.resumen_tipos_acceso.filter(a => a.tipo_acceso === 'LOGIN' && a.exitoso !== false).reduce((sum, a) => sum + a.cantidad, 0) : 0}
                            </h3>
                            <p style="margin: 0.5rem 0 0 0; color: var(--text-secondary);">Logins Exitosos</p>
                        </div>
                        <div class="card" style="text-align: center; padding: 1rem; background: ${accessSummary.intentos_fallidos > 0 ? 'var(--danger-color)' : 'var(--info-color)'}; color: white;">
                            <h3 style="font-size: 1.5rem; margin: 0;">${accessSummary.intentos_fallidos || 0}</h3>
                            <p style="margin: 0.5rem 0 0 0;">Intentos Fallidos</p>
                        </div>
                    </div>
                    <div style="margin-bottom: 2rem;">
                        <canvas id="accessTypesChart"></canvas>
                    </div>
                    ${accessSummary.resumen_tipos_acceso && accessSummary.resumen_tipos_acceso.length > 0 ? `
                        <div style="margin-top: 1.5rem;">
                            <h4 style="margin-bottom: 0.5rem;">Tipos de Acceso</h4>
                            <div class="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Tipo</th>
                                            <th>Cantidad</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${accessSummary.resumen_tipos_acceso.map(access => `
                                            <tr>
                                                <td><strong>${translateAccessType(access.tipo_acceso)}</strong></td>
                                                <td style="text-align: center; font-weight: 600; color: var(--primary-color);">
                                                    ${access.cantidad}
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ` : ''}
                ` : '<p style="color: var(--text-secondary);">No hay datos de accesos disponibles</p>'}
            </div>

            <!-- Interacciones de Usuario -->
            <div class="card" style="background: var(--bg-secondary); margin-bottom: 2rem;">
                <div class="flex-between" style="margin-bottom: 1rem;">
                    <h3 style="margin: 0;"><i class="fas fa-mouse-pointer"></i> Interacciones de Usuario (Últimos 30 días)</h3>
                </div>
                ${interactionSummary.periodo_dias ? `
                    <div style="margin-bottom: 1rem;">
                        <p><strong>Período:</strong> ${new Date(interactionSummary.fecha_inicio).toLocaleDateString('es-PE')} - ${new Date(interactionSummary.fecha_fin).toLocaleDateString('es-PE')}</p>
                    </div>
                    <div class="grid grid-4" style="margin-bottom: 1.5rem;">
                        <div class="card" style="text-align: center; padding: 1rem;">
                            <h3 style="font-size: 1.5rem; color: var(--primary-color); margin: 0;">
                                ${interactionSummary.total_busquedas || 0}
                            </h3>
                            <p style="margin: 0.5rem 0 0 0; color: var(--text-secondary);">Búsquedas</p>
                        </div>
                        <div class="card" style="text-align: center; padding: 1rem;">
                            <h3 style="font-size: 1.5rem; color: var(--success-color); margin: 0;">
                                ${interactionSummary.total_comparaciones || 0}
                            </h3>
                            <p style="margin: 0.5rem 0 0 0; color: var(--text-secondary);">Comparaciones</p>
                        </div>
                        <div class="card" style="text-align: center; padding: 1rem;">
                            <h3 style="font-size: 1.5rem; color: var(--warning-color); margin: 0;">
                                ${interactionSummary.resumen_interacciones ? interactionSummary.resumen_interacciones.filter(i => i.tipo === 'VIEW').reduce((sum, i) => sum + i.cantidad, 0) : 0}
                            </h3>
                            <p style="margin: 0.5rem 0 0 0; color: var(--text-secondary);">Vistas</p>
                        </div>
                        <div class="card" style="text-align: center; padding: 1rem;">
                            <h3 style="font-size: 1.5rem; color: var(--info-color); margin: 0;">
                                ${interactionSummary.resumen_interacciones ? interactionSummary.resumen_interacciones.filter(i => i.tipo === 'CLICK').reduce((sum, i) => sum + i.cantidad, 0) : 0}
                            </h3>
                            <p style="margin: 0.5rem 0 0 0; color: var(--text-secondary);">Clicks</p>
                        </div>
                    </div>
                    
                    ${interactionSummary.resumen_interacciones && interactionSummary.resumen_interacciones.length > 0 ? `
                        <div style="margin-bottom: 2rem;">
                            <h4 style="margin-bottom: 0.5rem;">Tipos de Interacción</h4>
                            <canvas id="interactionTypesChart"></canvas>
                        </div>
                    ` : ''}
                    
                    ${interactionSummary.resumen_dispositivos && interactionSummary.resumen_dispositivos.length > 0 ? `
                        <div style="margin-bottom: 2rem;">
                            <h4 style="margin-bottom: 0.5rem;">Dispositivos Utilizados</h4>
                            <canvas id="deviceTypesChart"></canvas>
                        </div>
                    ` : ''}
                    
                    ${interactionSummary.top_llantas && interactionSummary.top_llantas.length > 0 ? `
                        <div style="margin-top: 1.5rem;">
                            <h4 style="margin-bottom: 0.5rem;">Top 10 Llantas Más Vistas</h4>
                            <div class="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Llanta ID</th>
                                            <th>Vistas</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${interactionSummary.top_llantas.map(llanta => `
                                            <tr>
                                                <td><a href="/llantas/${llanta.llanta_id}" data-link><strong>${llanta.llanta_id}</strong></a></td>
                                                <td style="text-align: center; font-weight: 600; color: var(--primary-color);">
                                                    ${llanta.vistas}
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ` : ''}
                    
                    ${interactionSummary.top_negocios && interactionSummary.top_negocios.length > 0 ? `
                        <div style="margin-top: 1.5rem;">
                            <h4 style="margin-bottom: 0.5rem;">Top 10 Negocios Más Vistos</h4>
                            <div class="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Negocio ID</th>
                                            <th>Vistas</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${interactionSummary.top_negocios.map(negocio => `
                                            <tr>
                                                <td><a href="/negocios/${negocio.negocio_id}" data-link><strong>${negocio.negocio_id}</strong></a></td>
                                                <td style="text-align: center; font-weight: 600; color: var(--primary-color);">
                                                    ${negocio.vistas}
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ` : ''}
                ` : '<p style="color: var(--text-secondary);">No hay datos de interacciones disponibles</p>'}
            </div>

            <!-- Calidad de Datos -->
            <div class="card" style="background: var(--bg-secondary);">
                <div class="flex-between" style="margin-bottom: 1rem;">
                    <h3 style="margin: 0;"><i class="fas fa-check-circle"></i> Calidad de Datos</h3>
                    <button onclick="downloadGovernancePDF('quality')" class="btn btn-sm btn-secondary">PDF</button>
                </div>
                ${dataQuality.total && dataQuality.total > 0 ? `
                    <div class="grid grid-5" style="margin-bottom: 1.5rem;">
                        <div class="card" style="text-align: center; padding: 1rem; background: var(--success-color); color: white;">
                            <h3 style="font-size: 1.5rem; margin: 0;">${dataQuality.EXCELENTE || 0}</h3>
                            <p style="margin: 0.5rem 0 0 0; font-size: 0.875rem;">Excelente</p>
                        </div>
                        <div class="card" style="text-align: center; padding: 1rem; background: var(--info-color); color: white;">
                            <h3 style="font-size: 1.5rem; margin: 0;">${dataQuality.BUENA || 0}</h3>
                            <p style="margin: 0.5rem 0 0 0; font-size: 0.875rem;">Buena</p>
                        </div>
                        <div class="card" style="text-align: center; padding: 1rem; background: var(--warning-color); color: white;">
                            <h3 style="font-size: 1.5rem; margin: 0;">${dataQuality.REGULAR || 0}</h3>
                            <p style="margin: 0.5rem 0 0 0; font-size: 0.875rem;">Regular</p>
                        </div>
                        <div class="card" style="text-align: center; padding: 1rem; background: var(--danger-color); color: white;">
                            <h3 style="font-size: 1.5rem; margin: 0;">${dataQuality.MALA || 0}</h3>
                            <p style="margin: 0.5rem 0 0 0; font-size: 0.875rem;">Mala</p>
                        </div>
                        <div class="card" style="text-align: center; padding: 1rem; background: var(--text-secondary); color: white;">
                            <h3 style="font-size: 1.5rem; margin: 0;">${dataQuality.SIN_DATOS || 0}</h3>
                            <p style="margin: 0.5rem 0 0 0; font-size: 0.875rem;">Sin Datos</p>
                        </div>
                    </div>
                    <div style="margin-bottom: 2rem;">
                        <canvas id="dataQualityChart"></canvas>
                    </div>
                    <div style="margin-top: 1.5rem;">
                        <p><strong>Total de registros:</strong> ${dataQuality.total}</p>
                        <p><strong>Porcentaje Excelente:</strong> ${(dataQuality.porcentaje_excelente || 0).toFixed(2)}%</p>
                        <p><strong>Porcentaje Buena:</strong> ${(dataQuality.porcentaje_buena || 0).toFixed(2)}%</p>
                    </div>
                ` : '<p style="color: var(--text-secondary);">No hay datos de calidad disponibles</p>'}
            </div>
        `;

        // Renderizar gráficos después de que el HTML esté en el DOM
        setTimeout(() => {
            if (auditSummary.resumen_acciones && auditSummary.resumen_acciones.length > 0) {
                renderAuditActionsChart(auditSummary.resumen_acciones);
            }
            if (auditSummary.tablas_mas_modificadas && auditSummary.tablas_mas_modificadas.length > 0) {
                renderModifiedTablesChart(auditSummary.tablas_mas_modificadas);
            }
            if (accessSummary.resumen_tipos_acceso && accessSummary.resumen_tipos_acceso.length > 0) {
                renderAccessTypesChart(accessSummary.resumen_tipos_acceso);
            }
            if (dataQuality.total && dataQuality.total > 0) {
                renderDataQualityChart(dataQuality);
            }
            if (interactionSummary.resumen_interacciones && interactionSummary.resumen_interacciones.length > 0) {
                renderInteractionTypesChart(interactionSummary.resumen_interacciones);
            }
            if (interactionSummary.resumen_dispositivos && interactionSummary.resumen_dispositivos.length > 0) {
                renderDeviceTypesChart(interactionSummary.resumen_dispositivos);
            }
        }, 200);

    } catch (error) {
        console.error('Error loading governance metrics:', error);
        container.innerHTML = `<div class="alert alert-error">Error al cargar métricas de gobierno: ${error.message}</div>`;
    }
}

// Funciones de renderizado de gráficos para gobierno de datos
function renderAuditActionsChart(data) {
    const ctx = document.getElementById('auditActionsChart');
    if (!ctx) return;
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(item => translateAuditAction(item.accion)),
            datasets: [{
                label: 'Cantidad de Acciones',
                data: data.map(item => item.cantidad),
                backgroundColor: ['#3b82f6', '#10b981', '#ef4444'],
                borderColor: ['#3b82f6', '#10b981', '#ef4444'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'Acciones de Auditoría'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Cantidad'
                    }
                }
            }
        }
    });
}

function renderModifiedTablesChart(data) {
    const ctx = document.getElementById('modifiedTablesChart');
    if (!ctx) return;
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.map(item => item.tabla),
            datasets: [{
                label: 'Cambios por Tabla',
                data: data.map(item => item.cantidad),
                backgroundColor: [
                    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#64748b',
                    '#a78bfa', '#f472b6', '#22d3ee', '#fcd34d', '#fb7185'
                ],
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Tablas Más Modificadas'
                }
            }
        }
    });
}

function renderAccessTypesChart(data) {
    const ctx = document.getElementById('accessTypesChart');
    if (!ctx) return;
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: data.map(item => translateAccessType(item.tipo_acceso)),
            datasets: [{
                label: 'Tipos de Acceso',
                data: data.map(item => item.cantidad),
                backgroundColor: [
                    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#64748b'
                ],
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Distribución de Tipos de Acceso'
                }
            }
        }
    });
}

function renderDataQualityChart(data) {
    const ctx = document.getElementById('dataQualityChart');
    if (!ctx) return;
    const qualityLabels = ['Excelente', 'Buena', 'Regular', 'Mala', 'Sin Datos'];
    const qualityCounts = [
        data.EXCELENTE || 0,
        data.BUENA || 0,
        data.REGULAR || 0,
        data.MALA || 0,
        data.SIN_DATOS || 0
    ];
    const backgroundColors = [
        '#10b981', // Excelente (success)
        '#3b82f6', // Buena (primary)
        '#f59e0b', // Regular (warning)
        '#ef4444', // Mala (danger)
        '#64748b'  // Sin Datos (secondary)
    ];

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: qualityLabels,
            datasets: [{
                label: 'Cantidad de Registros',
                data: qualityCounts,
                backgroundColor: backgroundColors,
                borderColor: backgroundColors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'Calidad de Datos por Categoría'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Cantidad de Registros'
                    }
                }
            }
        }
    });
}

// Gráfico de tipos de interacción
function renderInteractionTypesChart(data) {
    const ctx = document.getElementById('interactionTypesChart');
    if (!ctx) return;
    
    const translations = {
        'VIEW': 'Vista',
        'CLICK': 'Click',
        'SEARCH': 'Búsqueda',
        'COMPARE': 'Comparación'
    };
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.map(item => translations[item.tipo] || item.tipo),
            datasets: [{
                label: 'Cantidad',
                data: data.map(item => item.cantidad),
                backgroundColor: [
                    'rgba(59, 130, 246, 0.8)',
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(245, 158, 11, 0.8)',
                    'rgba(239, 68, 68, 0.8)',
                    'rgba(139, 92, 246, 0.8)'
                ],
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Distribución de Tipos de Interacción'
                }
            }
        }
    });
}

// Gráfico de tipos de dispositivo
function renderDeviceTypesChart(data) {
    const ctx = document.getElementById('deviceTypesChart');
    if (!ctx) return;
    
    const translations = {
        'MOBILE': 'Móvil',
        'TABLET': 'Tablet',
        'DESKTOP': 'Escritorio',
        'UNKNOWN': 'Desconocido'
    };
    
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: data.map(item => translations[item.dispositivo] || item.dispositivo),
            datasets: [{
                label: 'Cantidad',
                data: data.map(item => item.cantidad),
                backgroundColor: [
                    'rgba(59, 130, 246, 0.8)',
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(245, 158, 11, 0.8)',
                    'rgba(239, 68, 68, 0.8)'
                ],
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Distribución por Tipo de Dispositivo'
                }
            }
        }
    });
}
