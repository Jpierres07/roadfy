// Módulo de autenticación
class Auth {
    constructor() {
        this.user = this.getUser();
    }

    // Obtener usuario del localStorage
    getUser() {
        const userStr = localStorage.getItem(CONFIG.STORAGE_KEYS.USER);
        return userStr ? JSON.parse(userStr) : null;
    }

    // Guardar usuario
    setUser(user) {
        this.user = user;
        localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(user));
    }

    // Guardar token
    setToken(token) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.TOKEN, token);
    }

    // Verificar si está autenticado
    isAuthenticated() {
        return !!this.getToken();
    }

    // Obtener token
    getToken() {
        return localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
    }

    // Verificar si es super admin
    isSuperAdmin() {
        return this.user?.role === 'super-admin';
    }

    // Verificar si es business admin
    isBusinessAdmin() {
        return this.user?.role === 'business-admin';
    }

    // Cerrar sesión
    logout() {
        this.user = null;
        localStorage.removeItem(CONFIG.STORAGE_KEYS.TOKEN);
        localStorage.removeItem(CONFIG.STORAGE_KEYS.USER);
    }

    // Login
    async login(email, password) {
        try {
            const data = await api.post('/auth/login', { email, password });
            this.setToken(data.access_token);
            
            // Obtener información del usuario
            const userData = await api.get('/auth/me');
            this.setUser(userData);
            
            return { success: true, user: userData };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Registro
    async register(email, password, role = 'customer') {
        try {
            const data = await api.post('/auth/register', { email, password, role });
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Obtener usuario actual
    getCurrentUser() {
        return this.user;
    }
}

// Instancia global de Auth
const auth = new Auth();

