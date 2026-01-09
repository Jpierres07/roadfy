// Aplicación principal
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded - Initializing RoadFY');
    
    // Renderizar header y footer
    renderHeader();
    renderFooter();
    
    // Configurar rutas (en español)
    console.log('Registering routes...');
    router.route('/', renderHome);
    router.route('/llantas', renderTires);
    router.route('/llantas/:id', renderTireDetail);
    router.route('/llantas/comparar', renderTireComparison);
    router.route('/llantas/comparar-multi', renderTireMultiComparison);
    router.route('/negocios', renderBusinesses);
    router.route('/negocios/:id', renderBusinessDetail);
    router.route('/iniciar-sesion', renderLogin);
    router.route('/registrarse', renderRegister);
    router.route('/recuperar-contrasena', renderForgotPassword);
    router.route('/restablecer-contrasena', renderResetPassword);
    router.route('/registrar-negocio', renderRequestBusiness);
    router.route('/administracion', renderAdminDashboard);
    router.route('/administracion/llantas', renderAdminTires);
    router.route('/administracion/inventario', renderAdminInventory);
    router.route('/administracion/mi-negocio', renderAdminMyBusiness);
    router.route('/administracion/solicitudes-negocios', renderBusinessApplications);
    router.route('/administracion/reportes', renderAdminReports);
    // renderBusinessDashboard se define en business-dashboard.js que se carga antes de app.js
    if (typeof renderBusinessDashboard !== 'undefined') {
        router.route('/admin/dashboard', renderBusinessDashboard);
    } else {
        console.warn('renderBusinessDashboard no está definido. Asegúrate de que business-dashboard.js se carga antes de app.js');
    }
    router.route('/admin/mi-negocio', renderAdminMyBusiness);
    router.route('/admin/inventario', renderAdminInventory);
    router.route('/configuracion', renderSettings);
    
    // Ruta por defecto
    router.route('*', () => {
        router.navigate('/');
    });
    
    // Inicializar router después de registrar todas las rutas
    if (router && typeof router.init === 'function') {
        console.log('Initializing router...');
        router.init();
        console.log('Router initialized');
    } else {
        console.error('Router no está disponible');
    }
    
    // Verificar que todo esté funcionando
    console.log('RoadFY inicializado correctamente');
    console.log('Rutas registradas:', Object.keys(router.routes));
    console.log('Current path:', window.location.pathname);
    
    // Verificar que el main-content existe
    const mainContent = document.getElementById('main-content');
    if (!mainContent) {
        console.error('ERROR: main-content element not found!');
    } else {
        console.log('main-content element found');
    }
});

