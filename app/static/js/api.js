// Módulo para manejar las llamadas a la API
class API {
    constructor(baseURL) {
        this.baseURL = baseURL;
    }

    // Obtener token del localStorage
    getToken() {
        return localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
    }

    // Realizar petición HTTP
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const token = this.getToken();

        const config = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` }),
                ...options.headers
            }
        };

        if (options.body && typeof options.body === 'object') {
            config.body = JSON.stringify(options.body);
        }

        try {
            const response = await fetch(url, config);
            
            // Verificar si la respuesta tiene contenido JSON
            let data;
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                // Si no es JSON, intentar parsear como texto o devolver vacío
                const text = await response.text();
                data = text ? (text.trim() ? JSON.parse(text) : {}) : {};
            }

            if (!response.ok) {
                // Si es 401, redirigir a login
                if (response.status === 401) {
                    this.handleUnauthorized();
                }
                const errorMsg = data.error || data.message || `Error ${response.status}: ${response.statusText}`;
                throw new Error(errorMsg);
            }

            return data;
        } catch (error) {
            console.error('API Error:', {
                url,
                method: config.method || 'GET',
                error: error.message,
                stack: error.stack
            });
            
            // Si es un error de red (Failed to fetch), dar un mensaje más descriptivo
            if (error.message === 'Failed to fetch' || error.name === 'TypeError' || error.message.includes('Failed to fetch')) {
                // Verificar si el servidor está disponible
                const serverUrl = this.baseURL.replace('/api', '');
                throw new Error(`No se pudo conectar con el servidor. Verifica que el backend esté corriendo en ${serverUrl}`);
            }
            
            throw error;
        }
    }

    // Manejar no autorizado
    handleUnauthorized() {
        localStorage.removeItem(CONFIG.STORAGE_KEYS.TOKEN);
        localStorage.removeItem(CONFIG.STORAGE_KEYS.USER);
        if (window.router) {
            window.router.navigate('/iniciar-sesion');
        }
    }

    // Métodos HTTP
    get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    }

    post(endpoint, body) {
        return this.request(endpoint, { method: 'POST', body });
    }

    put(endpoint, body) {
        return this.request(endpoint, { method: 'PUT', body });
    }

    delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
}

// Instancia global de la API
const api = new API(CONFIG.API_BASE_URL);

