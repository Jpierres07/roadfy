// Router simple para navegación SPA
class Router {
    constructor() {
        this.routes = {};
        this.currentRoute = null;
        this.matchedRoute = null;
        this.initialized = false;
    }

    // Inicializar router
    init() {
        if (this.initialized) return;
        this.initialized = true;
        
        // Escuchar cambios en la URL
        window.addEventListener('popstate', () => this.handleRoute());
        
        // Manejar clics en enlaces (delegación de eventos)
        document.addEventListener('click', (e) => {
            // Buscar el elemento con data-link más cercano
            let linkElement = e.target.closest('[data-link]');
            
            // Si no tiene data-link, buscar enlaces internos
            if (!linkElement) {
                linkElement = e.target.closest('a[href^="/"]');
            }
            
            if (linkElement) {
                e.preventDefault();
                e.stopPropagation();
                const path = linkElement.getAttribute('href') || linkElement.dataset.link;
                if (path && path.startsWith('/')) {
                    this.navigate(path);
                }
            }
        });

        // Manejar ruta inicial después de un pequeño delay para asegurar que las rutas estén registradas
        setTimeout(() => {
            this.handleRoute();
        }, 100);
    }

    // Registrar ruta
    route(path, handler) {
        this.routes[path] = handler;
    }

    // Navegar a una ruta
    navigate(path) {
        window.history.pushState({}, '', path);
        this.handleRoute();
    }

    // Manejar ruta actual
    handleRoute() {
        const path = window.location.pathname;
        console.log('Router: Handling route:', path);
        console.log('Router: Available routes:', Object.keys(this.routes));
        
        // Buscar ruta exacta primero
        let handler = this.routes[path];
        let matchedRoute = path;
        
        // Si no hay ruta exacta, buscar rutas con parámetros
        if (!handler) {
            for (const routePath in this.routes) {
                if (routePath.includes(':')) {
                    // Convertir ruta con parámetros a regex
                    // Ej: /tires/:id -> /tires/([^/]+)
                    const routeRegex = new RegExp('^' + routePath.replace(/:[^/]+/g, '([^/]+)') + '$');
                    if (routeRegex.test(path)) {
                        handler = this.routes[routePath];
                        matchedRoute = routePath;
                        console.log('Router: Matched parameterized route:', routePath);
                        break;
                    }
                }
            }
        }
        
        // Si aún no hay handler, usar ruta por defecto
        if (!handler) {
            handler = this.routes['*'];
            console.log('Router: Using default route (*)');
        }
        
        if (handler) {
            console.log('Router: Executing handler for route:', matchedRoute);
            this.currentRoute = path;
            this.matchedRoute = matchedRoute;
            try {
                handler();
            } catch (error) {
                console.error('Router: Error executing handler:', error);
                console.error('Router: Error stack:', error.stack);
            }
        } else {
            console.warn('Router: No handler found, navigating to /');
            this.navigate('/');
        }
    }

    // Obtener parámetros de la URL
    getParams() {
        const params = {};
        const queryString = window.location.search.substring(1);
        const pairs = queryString.split('&');
        
        pairs.forEach(pair => {
            const [key, value] = pair.split('=');
            if (key) {
                params[decodeURIComponent(key)] = decodeURIComponent(value || '');
            }
        });
        
        return params;
    }

    // Obtener ID de la ruta (ej: /tires/123 -> 123)
    getRouteId() {
        const path = window.location.pathname;
        const parts = path.split('/').filter(p => p);
        
        // Si la ruta coincide con un patrón con parámetros, extraer el ID
        if (this.matchedRoute && this.matchedRoute.includes(':')) {
            const routeParts = this.matchedRoute.split('/').filter(p => p);
            const paramIndex = routeParts.findIndex(p => p.startsWith(':'));
            if (paramIndex >= 0 && parts[paramIndex]) {
                return parts[paramIndex];
            }
        }
        
        // Fallback: último segmento de la ruta
        return parts[parts.length - 1] || '';
    }
}

// Instancia global del router (NO se inicializa automáticamente)
window.router = new Router();

