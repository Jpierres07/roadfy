// Página de Restablecer Contraseña
function renderResetPassword() {
    const params = router.getParams();
    const token = params.token;
    const email = params.email;
    const main = document.getElementById('main-content');
    
    if (!token || !email) {
        main.innerHTML = `
            <div class="container" style="max-width: 500px;">
                <div class="alert alert-error">
                    <i class="fas fa-exclamation-circle"></i> 
                    Enlace inválido. Por favor, solicita un nuevo enlace de recuperación.
                </div>
                <div style="text-align: center; margin-top: 1rem;">
                    <a href="/recuperar-contrasena" data-link class="btn btn-primary">
                        Solicitar Nuevo Enlace
                    </a>
                </div>
            </div>
        `;
        return;
    }
    
    // Verificar token primero
    verifyTokenAndRender(email, token);
}

async function verifyTokenAndRender(email, token) {
    const main = document.getElementById('main-content');
    const alertDiv = document.createElement('div');
    alertDiv.id = 'reset-alert';
    alertDiv.innerHTML = '<div class="alert alert-info"><i class="fas fa-spinner fa-spin"></i> Verificando token...</div>';
    
    main.innerHTML = `
        <div class="container" style="max-width: 500px;">
            <div class="card">
                <h1 style="text-align: center; margin-bottom: 2rem;">Restablecer Contraseña</h1>
                <div id="reset-alert"></div>
                <div id="reset-form-container"></div>
            </div>
        </div>
    `;
    
    try {
        const result = await api.post('/auth/verify-reset-token', { email, token });
        
        if (result.valid) {
            document.getElementById('reset-form-container').innerHTML = `
                <form id="reset-form" onsubmit="handleResetPassword(event, '${token}', '${email}')">
                    <div class="form-group">
                        <label class="form-label">Nueva Contraseña</label>
                        <input type="password" id="password" class="form-input" required 
                               placeholder="••••••••" minlength="6">
                        <small style="color: var(--text-secondary); font-size: 0.875rem;">
                            Mínimo 6 caracteres
                        </small>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Confirmar Nueva Contraseña</label>
                        <input type="password" id="confirm-password" class="form-input" required 
                               placeholder="••••••••">
                    </div>
                    
                    <div class="form-group">
                        <button type="submit" class="btn btn-primary" style="width: 100%;">
                            <i class="fas fa-key"></i> Restablecer Contraseña
                        </button>
                    </div>
                </form>
            `;
            document.getElementById('reset-alert').innerHTML = '';
        } else {
            document.getElementById('reset-alert').innerHTML = `
                <div class="alert alert-error">
                    <i class="fas fa-exclamation-circle"></i> 
                    ${result.error || 'Token inválido o expirado'}
                </div>
                <div style="text-align: center; margin-top: 1rem;">
                    <a href="/recuperar-contrasena" data-link class="btn btn-primary">
                        Solicitar Nuevo Enlace
                    </a>
                </div>
            `;
        }
    } catch (error) {
        document.getElementById('reset-alert').innerHTML = `
            <div class="alert alert-error">
                <i class="fas fa-exclamation-circle"></i> 
                Error al verificar token: ${error.message}
            </div>
            <div style="text-align: center; margin-top: 1rem;">
                <a href="/recuperar-contrasena" data-link class="btn btn-primary">
                    Solicitar Nuevo Enlace
                </a>
            </div>
        `;
    }
}

// Función global para reset password
window.handleResetPassword = async function(event, token, email) {
    event.preventDefault();
    const alertDiv = document.getElementById('reset-alert');
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    if (password !== confirmPassword) {
        alertDiv.innerHTML = '<div class="alert alert-error"><i class="fas fa-exclamation-circle"></i> Las contraseñas no coinciden</div>';
        return;
    }
    
    if (password.length < 6) {
        alertDiv.innerHTML = '<div class="alert alert-error"><i class="fas fa-exclamation-circle"></i> La contraseña debe tener al menos 6 caracteres</div>';
        return;
    }
    
    alertDiv.innerHTML = '<div class="alert alert-info"><i class="fas fa-spinner fa-spin"></i> Restableciendo...</div>';
    
    try {
        await api.post('/auth/reset-password', {
            token: token,
            email: email,
            new_password: password
        });
        
        alertDiv.innerHTML = `
            <div class="alert alert-success">
                <i class="fas fa-check"></i> 
                Contraseña restablecida correctamente. Redirigiendo al login...
            </div>
        `;
        
        setTimeout(() => {
            router.navigate('/iniciar-sesion');
        }, 2000);
    } catch (error) {
        alertDiv.innerHTML = `<div class="alert alert-error"><i class="fas fa-exclamation-circle"></i> ${error.message}</div>`;
    }
}

