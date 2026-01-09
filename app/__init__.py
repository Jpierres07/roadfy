"""
App factory para Flask.
"""
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from app.config import Config
from app.db import test_connection

jwt = JWTManager()

def create_app():
    """Crea y configura la aplicación Flask."""
    import os
    from pathlib import Path
    
    # Configurar Flask para servir archivos estáticos desde app/static
    static_folder = Path(__file__).parent / 'static'
    # Usar static_url_path='' para servir desde la raíz, pero también agregar rutas explícitas
    app = Flask(__name__, static_folder=str(static_folder), static_url_path='')
    
    # Configuración
    app.config['JWT_SECRET_KEY'] = Config.JWT_SECRET_KEY
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = Config.JWT_ACCESS_TOKEN_EXPIRES
    
    # Initialize extensions
    jwt.init_app(app)
    
    # CORS configuration
    CORS(app, 
         resources={r"/api/*": {
             "origins": Config.CORS_ORIGINS,
             "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
             "allow_headers": ["Content-Type", "Authorization", "X-Requested-With"],
             "expose_headers": ["Content-Type", "Authorization"],
             "supports_credentials": True
         }},
         supports_credentials=True)
    
    # Register blueprints
    from app.routers.auth import auth_bp
    from app.routers.tires import tires_bp
    from app.routers.businesses import businesses_bp
    from app.routers.inventory import inventory_bp
    from app.routers.users import users_bp
    from app.routers.reviews import reviews_bp
    from app.routers.stats import stats_bp
    from app.routers.governance import governance_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(tires_bp, url_prefix='/api/tires')
    app.register_blueprint(businesses_bp, url_prefix='/api/businesses')
    app.register_blueprint(inventory_bp, url_prefix='/api/inventory')
    app.register_blueprint(users_bp, url_prefix='/api/users')
    app.register_blueprint(reviews_bp, url_prefix='/api/reviews')
    app.register_blueprint(stats_bp, url_prefix='/api/stats')
    app.register_blueprint(governance_bp, url_prefix='/api/governance')
    
    # Handler para OPTIONS requests (preflight)
    @app.before_request
    def handle_preflight():
        if request.method == "OPTIONS":
            response = app.make_default_options_response()
            origin = request.headers.get('Origin')
            if origin and origin in Config.CORS_ORIGINS:
                response.headers['Access-Control-Allow-Origin'] = origin
                response.headers['Access-Control-Allow-Credentials'] = 'true'
            response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS, PATCH'
            response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With'
            response.headers['Access-Control-Max-Age'] = '3600'
            return response
    
    @app.route('/health')
    def health_check():
        return {'status': 'healthy'}
    
    @app.route('/api')
    def api_info():
        """API information endpoint"""
        return jsonify({
            'message': 'RoadFY API',
            'version': '1.0.0',
            'endpoints': {
                'auth': '/api/auth',
                'tires': '/api/tires',
                'businesses': '/api/businesses',
                'inventory': '/api/inventory',
                'users': '/api/users',
                'reviews': '/api/reviews',
                'stats': '/api/stats',
                'governance': '/api/governance'
            }
        })
    
    # Ruta para servir archivos estáticos explícitamente (js, css, imágenes, etc.)
    # Estas rutas deben estar ANTES de la ruta catch-all para que Flask las capture primero
    @app.route('/js/<path:filename>')
    def serve_js(filename):
        """Serve JavaScript files"""
        try:
            # Normalizar el path (manejar tanto / como \)
            normalized_filename = filename.replace('\\', '/')
            static_path = f'js/{normalized_filename}'
            
            # Usar send_static_file que es más confiable
            response = app.send_static_file(static_path)
            # Agregar headers para evitar caché en desarrollo
            response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            response.headers['Pragma'] = 'no-cache'
            response.headers['Expires'] = '0'
            response.headers['Content-Type'] = 'text/javascript; charset=utf-8'
            return response
        except Exception as e:
            print(f"Error serving JS file {filename}: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({'error': f'Error serving file: {str(e)}'}), 500
    
    @app.route('/css/<path:filename>')
    def serve_css(filename):
        """Serve CSS files"""
        try:
            static_path = f'css/{filename}'
            return app.send_static_file(static_path)
        except Exception as e:
            print(f"Error serving CSS file {filename}: {e}")
            return jsonify({'error': 'File not found'}), 404
    
    @app.route('/assets/<path:filename>')
    def serve_assets(filename):
        """Serve asset files (images, etc.)"""
        try:
            static_path = f'assets/{filename}'
            return app.send_static_file(static_path)
        except Exception as e:
            print(f"Error serving asset file {filename}: {e}")
            return jsonify({'error': 'File not found'}), 404
    
    @app.route('/')
    def index():
        """Serve the frontend index.html"""
        return send_from_directory(app.static_folder, 'index.html')
    
    # Catch-all route for SPA - must be last
    # IMPORTANTE: Esta ruta NO debe capturar rutas de archivos estáticos
    # Flask debería haber capturado las rutas específicas antes, pero por seguridad:
    @app.route('/<path:path>')
    def serve_spa(path):
        """Serve index.html for all non-API routes (SPA routing)"""
        # Excluir explícitamente rutas de archivos estáticos y API
        if path.startswith('api/') or path.startswith('js/') or path.startswith('css/') or path.startswith('assets/'):
            # Si llegamos aquí, significa que la ruta específica no funcionó
            # Intentar servir el archivo como fallback
            try:
                if path.startswith('js/'):
                    static_path = path  # Ya incluye 'js/'
                    response = app.send_static_file(static_path)
                    response.headers['Content-Type'] = 'text/javascript; charset=utf-8'
                    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
                    response.headers['Pragma'] = 'no-cache'
                    response.headers['Expires'] = '0'
                    return response
                elif path.startswith('css/'):
                    return app.send_static_file(path)
                elif path.startswith('assets/'):
                    return app.send_static_file(path)
            except:
                pass
            return jsonify({'error': 'Not found'}), 404
        
        # Para todas las demás rutas (rutas SPA), servir index.html
        return send_from_directory(app.static_folder, 'index.html')
    
    # Probar conexión a la base de datos al iniciar
    test_connection()
    
    # After request handler para asegurar CORS en todas las respuestas
    @app.after_request
    def after_request(response):
        origin = request.headers.get('Origin')
        if origin and origin in Config.CORS_ORIGINS:
            response.headers['Access-Control-Allow-Origin'] = origin
            response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS, PATCH'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With'
        response.headers['Access-Control-Expose-Headers'] = 'Content-Type, Authorization'
        return response
    
    # Error handlers
    @app.errorhandler(400)
    @app.errorhandler(401)
    @app.errorhandler(403)
    @app.errorhandler(500)
    def handle_error(e):
        code = getattr(e, 'code', 500)
        message = getattr(e, 'description', str(e))
        response = jsonify({'error': message})
        response.status_code = code
        origin = request.headers.get('Origin')
        if origin and origin in Config.CORS_ORIGINS:
            response.headers['Access-Control-Allow-Origin'] = origin
            response.headers['Access-Control-Allow-Credentials'] = 'true'
        return response
    
    # Error handler 404 - solo para rutas de API
    @app.errorhandler(404)
    def handle_404(e):
        # Si es una ruta de API, devolver error JSON
        if request.path.startswith('/api/'):
            response = jsonify({'error': 'Endpoint not found'})
            response.status_code = 404
            origin = request.headers.get('Origin')
            if origin and origin in Config.CORS_ORIGINS:
                response.headers['Access-Control-Allow-Origin'] = origin
                response.headers['Access-Control-Allow-Credentials'] = 'true'
            return response
        # Para rutas no-API, servir index.html (SPA routing)
        # Esto no debería ejecutarse normalmente porque serve_spa debería capturar todo
        from flask import send_from_directory
        return send_from_directory(app.static_folder, 'index.html')
    
    # Handler para excepciones no capturadas
    @app.errorhandler(Exception)
    def handle_unhandled_exception(e):
        import traceback
        error_msg = str(e)
        error_type = type(e).__name__
        traceback_str = traceback.format_exc()
        
        print("=" * 70)
        print(f"ERROR NO CAPTURADO: {error_type}")
        print("=" * 70)
        print(f"Mensaje: {error_msg}")
        print(f"Traceback completo:")
        print(traceback_str)
        print("=" * 70)
        
        response = jsonify({
            'error': 'Internal server error',
            'message': error_msg,
            'type': error_type
        })
        response.status_code = 500
        origin = request.headers.get('Origin')
        if origin and origin in Config.CORS_ORIGINS:
            response.headers['Access-Control-Allow-Origin'] = origin
            response.headers['Access-Control-Allow-Credentials'] = 'true'
        return response
    
    return app
