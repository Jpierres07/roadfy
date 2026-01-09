// Página de Registro
function renderRegister() {
    const main = document.getElementById('main-content');
    main.innerHTML = `
        <div class="container" style="max-width: 500px;">
            <div class="card">
                <h1 style="text-align: center; margin-bottom: 2rem;">Crear Cuenta</h1>
                
                <div id="register-alert"></div>
                
                <form id="register-form" onsubmit="handleRegister(event)">
                    <div class="form-group">
                        <label class="form-label">Email</label>
                        <input type="email" id="email" class="form-input" required 
                               placeholder="tu@email.com">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Contraseña</label>
                        <input type="password" id="password" class="form-input" required 
                               placeholder="••••••••" minlength="6">
                        <small style="color: var(--text-secondary); font-size: 0.875rem;">
                            Mínimo 6 caracteres
                        </small>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Confirmar Contraseña</label>
                        <input type="password" id="confirm-password" class="form-input" required 
                               placeholder="••••••••">
                    </div>
                    
                    <div class="form-group">
                        <button type="submit" class="btn btn-primary" style="width: 100%;">
                            <i class="fas fa-user-plus"></i> Registrarse
                        </button>
                    </div>
                </form>
                
                <div style="text-align: center; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color);">
                    <p style="color: var(--text-secondary);">
                        ¿Ya tienes cuenta? 
                        <a href="/iniciar-sesion" data-link style="color: var(--primary-color); text-decoration: none; font-weight: 600;">
                            Inicia sesión aquí
                        </a>
                    </p>
                </div>
            </div>
        </div>
    `;
}

// Función global para registro
window.handleRegister = async function(event) {
    event.preventDefault();
    const alertDiv = document.getElementById('register-alert');
    const email = document.getElementById('email').value;
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
    
    alertDiv.innerHTML = '<div class="alert alert-info"><i class="fas fa-spinner fa-spin"></i> Registrando...</div>';
    
    const result = await auth.register(email, password);
    
    if (result.success) {
        alertDiv.innerHTML = '<div class="alert alert-success"><i class="fas fa-check"></i> Cuenta creada correctamente. Redirigiendo...</div>';
        setTimeout(() => {
            router.navigate('/iniciar-sesion');
        }, 2000);
    } else {
        alertDiv.innerHTML = `<div class="alert alert-error"><i class="fas fa-exclamation-circle"></i> ${result.error}</div>`;
    }
}

