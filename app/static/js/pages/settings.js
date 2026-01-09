// Página de Configuración
async function renderSettings() {
    if (!auth.isAuthenticated()) {
        router.navigate('/iniciar-sesion');
        return;
    }

    const user = auth.getCurrentUser();
    const main = document.getElementById('main-content');
    main.innerHTML = `
        <div class="container" style="max-width: 600px;">
            <div class="card">
                <h1 style="margin-bottom: 2rem;">Configuración</h1>
                
                <div id="settings-alert"></div>
                
                <div class="card" style="background: var(--bg-secondary); margin-bottom: 2rem;">
                    <h3 style="margin-bottom: 1rem;">Información de la Cuenta</h3>
                    <p><strong>Email:</strong> ${user.email}</p>
                    <p><strong>Rol:</strong> ${user.role}</p>
                    ${user.role === 'business-admin' && user.business_id ? `
                        <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color);">
                            <p style="margin-bottom: 0.5rem;"><strong>Gestión de Negocio:</strong></p>
                            <a href="/admin/mi-negocio" data-link class="btn btn-primary" style="margin-top: 0.5rem;">
                                <i class="fas fa-store"></i> Ir a Panel de Negocio
                            </a>
                        </div>
                    ` : ''}
                </div>
                
                <div class="card" style="background: var(--bg-secondary);">
                    <h3 style="margin-bottom: 1rem;">Cambiar Email</h3>
                    <form onsubmit="updateEmail(event)">
                        <div class="form-group">
                            <label class="form-label">Nuevo Email</label>
                            <input type="email" id="new-email" class="form-input" value="${user.email}" required>
                        </div>
                        <div class="form-group">
                            <button type="submit" class="btn btn-primary">Actualizar Email</button>
                        </div>
                    </form>
                </div>
                
                <div style="margin-top: 2rem; padding-top: 2rem; border-top: 1px solid var(--border-color);">
                    <button onclick="handleLogout()" class="btn btn-danger" style="width: 100%;">
                        <i class="fas fa-sign-out-alt"></i> Cerrar Sesión
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Funciones globales para configuración
window.updateEmail = async function(event) {
    event.preventDefault();
    const alertDiv = document.getElementById('settings-alert');
    const newEmail = document.getElementById('new-email').value;
    
    try {
        await api.put('/users/me', { email: newEmail });
        alertDiv.innerHTML = '<div class="alert alert-success">Email actualizado correctamente</div>';
        
        // Actualizar usuario
        const userData = await api.get('/auth/me');
        auth.setUser(userData);
        renderHeader();
    } catch (error) {
        alertDiv.innerHTML = `<div class="alert alert-error">Error: ${error.message}</div>`;
    }
}

