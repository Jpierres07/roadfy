// Componente Header
function renderHeader() {
    const header = document.getElementById('header');
    if (!header) {
        console.error('Header element not found');
        return;
    }
    
    if (typeof auth === 'undefined') {
        console.error('Auth module not loaded');
        return;
    }
    
    const user = auth.getCurrentUser();
    
    let navLinks = '';
    let userMenu = '';

    if (user) {
        // Usuario autenticado
        if (user.role === 'super-admin') {
            navLinks += '<a href="/administracion" data-link>Panel Admin</a>';
        } else if (user.role === 'business-admin') {
            navLinks += '<a href="/admin/dashboard" data-link>Mi Negocio</a>';
        } else {
            // Cliente: mostrar opción para solicitar negocio
            navLinks += '<a href="/registrar-negocio" data-link>Registrar Negocio</a>';
        }
        
        userMenu = `
            <div class="user-menu">
                <span>${user.email}</span>
                <a href="/configuracion" data-link class="btn btn-secondary">Configuración</a>
                <button onclick="handleLogout()" class="btn btn-secondary">Cerrar Sesión</button>
            </div>
        `;
    } else {
        // Usuario no autenticado: mostrar opción para registrar negocio
        navLinks += '<a href="/registrar-negocio" data-link>Registrar Negocio</a>';
        
        userMenu = `
            <div class="user-menu">
                <a href="/iniciar-sesion" data-link class="btn btn-secondary">Iniciar Sesión</a>
                <a href="/registrarse" data-link class="btn btn-primary">Registrarse</a>
            </div>
        `;
    }

    header.innerHTML = `
        <div class="header-container">
            <a href="/" data-link class="logo">
                <img src="assets/logo.jpg" alt="ROADFY" class="logo-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-block';">
                <i class="fas fa-car-side logo-fallback" style="display: none;"></i>
                <span class="logo-text">ROADFY</span>
            </a>
            <nav>
                <a href="/" data-link>Inicio</a>
                <a href="/llantas" data-link>Llantas</a>
                <a href="/negocios" data-link>Negocios</a>
                ${navLinks}
            </nav>
            ${userMenu}
        </div>
    `;

    // Marcar ruta activa
    const currentPath = window.location.pathname;
    header.querySelectorAll('nav a').forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        }
    });
}

// Función global para logout
window.handleLogout = function() {
    auth.logout();
    renderHeader();
    router.navigate('/');
}

