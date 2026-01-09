// Página de Recuperación de Contraseña
function renderForgotPassword() {
    const main = document.getElementById('main-content');
    main.innerHTML = `
        <div class="container" style="max-width: 500px;">
            <div class="card">
                <h1 style="text-align: center; margin-bottom: 2rem;">Recuperar Contraseña</h1>
                
                <div id="forgot-alert"></div>
                
                <p style="color: var(--text-secondary); margin-bottom: 1.5rem; text-align: center;">
                    Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.
                </p>
                
                <form id="forgot-form" onsubmit="handleForgotPassword(event)">
                    <div class="form-group">
                        <label class="form-label">Email</label>
                        <input type="email" id="email" class="form-input" required 
                               placeholder="tu@email.com">
                    </div>
                    
                    <div class="form-group">
                        <button type="submit" class="btn btn-primary" style="width: 100%;">
                            <i class="fas fa-paper-plane"></i> Enviar Enlace
                        </button>
                    </div>
                </form>
                
                <div style="text-align: center; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color);">
                    <a href="/iniciar-sesion" data-link style="color: var(--primary-color); text-decoration: none;">
                        <i class="fas fa-arrow-left"></i> Volver al inicio de sesión
                    </a>
                </div>
            </div>
        </div>
    `;
}

// Función global para forgot password
window.handleForgotPassword = async function(event) {
    event.preventDefault();
    const alertDiv = document.getElementById('forgot-alert');
    const email = document.getElementById('email').value;
    
    alertDiv.innerHTML = '<div class="alert alert-info"><i class="fas fa-spinner fa-spin"></i> Enviando...</div>';
    
    try {
        await api.post('/auth/forgot-password', { email });
        alertDiv.innerHTML = `
            <div class="alert alert-success">
                <i class="fas fa-check"></i> 
                Si el email existe, recibirás un enlace para restablecer tu contraseña.
            </div>
        `;
    } catch (error) {
        alertDiv.innerHTML = `<div class="alert alert-error"><i class="fas fa-exclamation-circle"></i> ${error.message}</div>`;
    }
}

