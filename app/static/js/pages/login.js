// Página de Login
function renderLogin() {
    const main = document.getElementById('main-content');
    main.innerHTML = `
        <div class="container" style="max-width: 500px;">
            <div class="card">
                <h1 style="text-align: center; margin-bottom: 2rem;">Iniciar Sesión</h1>
                
                <div id="login-alert"></div>
                
                <form id="login-form" onsubmit="handleLogin(event)">
                    <div class="form-group">
                        <label class="form-label">Email</label>
                        <input type="email" id="email" class="form-input" required 
                               placeholder="tu@email.com">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Contraseña</label>
                        <input type="password" id="password" class="form-input" required 
                               placeholder="••••••••">
                    </div>
                    
                    <div class="form-group">
                        <button type="submit" class="btn btn-primary" style="width: 100%;">
                            <i class="fas fa-sign-in-alt"></i> Iniciar Sesión
                        </button>
                    </div>
                </form>
                
                <div style="text-align: center; margin-top: 1.5rem;">
                    <a href="/recuperar-contrasena" data-link style="color: var(--primary-color); text-decoration: none;">
                        ¿Olvidaste tu contraseña?
                    </a>
                </div>
                
                <div style="text-align: center; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color);">
                    <p style="color: var(--text-secondary);">
                        ¿No tienes cuenta? 
                        <a href="/registrarse" data-link style="color: var(--primary-color); text-decoration: none; font-weight: 600;">
                            Regístrate aquí
                        </a>
                    </p>
                </div>
            </div>
        </div>
    `;
}

// Función global para login
window.handleLogin = async function(event) {
    event.preventDefault();
    const alertDiv = document.getElementById('login-alert');
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    alertDiv.innerHTML = '<div class="alert alert-info"><i class="fas fa-spinner fa-spin"></i> Iniciando sesión...</div>';
    
    const result = await auth.login(email, password);
    
    if (result.success) {
        alertDiv.innerHTML = '<div class="alert alert-success"><i class="fas fa-check"></i> Sesión iniciada correctamente</div>';
        renderHeader();
        setTimeout(() => {
            router.navigate('/');
        }, 1000);
    } else {
        alertDiv.innerHTML = `<div class="alert alert-error"><i class="fas fa-exclamation-circle"></i> ${result.error}</div>`;
    }
}

