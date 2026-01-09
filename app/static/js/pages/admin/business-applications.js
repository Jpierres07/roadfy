// Panel Admin - Solicitudes de Negocios (Solo Super Admin)
async function renderBusinessApplications() {
    if (!auth.isAuthenticated() || !auth.isSuperAdmin()) {
        router.navigate('/');
        return;
    }

    const main = document.getElementById('main-content');
    main.innerHTML = `
        <div class="container">
            <div class="card">
                <h1 style="margin-bottom: 2rem;">Solicitudes de Negocios</h1>
                
                <div id="applications-container" class="loading">
                    <i class="fas fa-spinner"></i> Cargando solicitudes...
                </div>
            </div>
        </div>
    `;

    loadApplications();
}

async function loadApplications() {
    try {
        const [users, requests] = await Promise.all([
            api.get('/users/pending-business-applications').catch(() => []),
            api.get('/users/pending-business-requests').catch(() => [])
        ]);
        const container = document.getElementById('applications-container');
        const items = [
            ...(users || []).map(u => ({ kind: 'user', id: u.id, email: u.email })),
            ...(requests || []).map(r => ({ kind: 'request', ...r }))
        ];
        
        if (items.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 3rem;">No hay solicitudes pendientes</p>';
            return;
        }

        container.innerHTML = `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Tipo</th>
                            <th>ID</th>
                            <th>Email</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items.map(item => `
                            <tr>
                                <td>${item.kind === 'request' ? 'Solicitud pública' : 'Usuario'}</td>
                                <td>${item.id}</td>
                                <td>${item.email || ''}</td>
                                <td>
                                    <span style="color: var(--warning-color); font-weight: 600;">
                                        Pendiente
                                    </span>
                                </td>
                                <td>
                                    <button onclick="approveApplication('${item.kind}', '${item.id}')" 
                                            class="btn btn-primary" style="padding: 0.5rem 1rem; margin-right: 0.5rem;">
                                        <i class="fas fa-check"></i> Aprobar
                                    </button>
                                    <button onclick="rejectApplication('${item.kind}', '${item.id}')" 
                                            class="btn btn-danger" style="padding: 0.5rem 1rem;">
                                        <i class="fas fa-times"></i> Rechazar
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        document.getElementById('applications-container').innerHTML = 
            `<div class="alert alert-error">Error al cargar solicitudes: ${error.message}</div>`;
    }
}

// Funciones globales para solicitudes
window.approveApplication = async function(kind, id) {
    const businessName = prompt('Nombre del negocio:');
    if (!businessName) return;
    
    const address = prompt('Dirección:');
    if (!address) return;
    
    const phone = prompt('Teléfono:');
    if (!phone) return;
    
    const hours = prompt('Horarios (ej: Lun-Vie: 9:00-18:00):', 'Lun-Vie: 9:00-18:00');
    
    try {
        if (kind === 'request') {
            const email = prompt('Email de contacto (será el usuario admin del negocio):');
            if (!email) return;
            const res = await api.post(`/users/business-requests/${id}/approve`, {
                businessName,
                address,
                phone,
                hours: hours || 'Lun-Vie: 9:00-18:00',
                email
            });
            if (res && res.temp_password) {
                alert(`Solicitud aprobada. Usuario creado: ${email}\nContraseña temporal: ${res.temp_password}`);
            } else {
                alert('Solicitud aprobada correctamente');
            }
        } else {
            await api.post(`/users/${id}/approve-business`, {
                businessName: businessName,
                address: address,
                phone: phone,
                hours: hours || 'Lun-Vie: 9:00-18:00'
            });
            alert('Solicitud aprobada correctamente');
        }
        loadApplications();
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

window.rejectApplication = async function(kind, id) {
    if (!confirm('¿Estás seguro de rechazar esta solicitud?')) return;
    
    try {
        if (kind === 'request') {
            await api.post(`/users/business-requests/${id}/reject`, { reason: 'Rechazada por administrador' });
        } else {
            await api.post(`/users/${id}/reject-business`, { reason: 'Rechazada por administrador' });
        }
        alert('Solicitud rechazada');
        loadApplications();
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

