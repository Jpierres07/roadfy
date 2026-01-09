from functools import wraps
from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from app.db import get_db_connection
import bcrypt

def get_password_hash(password: str) -> str:
    """Hash a password using bcrypt."""
    # Bcrypt has a 72 byte limit, so truncate if necessary
    if isinstance(password, str):
        password_bytes = password.encode('utf-8')
        if len(password_bytes) > 72:
            password_bytes = password_bytes[:72]
        salt = bcrypt.gensalt()
        return bcrypt.hashpw(password_bytes, salt).decode('utf-8')
    else:
        # If it's already bytes
        password_bytes = password if isinstance(password, bytes) else str(password).encode('utf-8')
        if len(password_bytes) > 72:
            password_bytes = password_bytes[:72]
        salt = bcrypt.gensalt()
        return bcrypt.hashpw(password_bytes, salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash."""
    # Validar que los parámetros no sean None
    if not plain_password or not hashed_password:
        print(f"verify_password: plain_password or hashed_password is None/empty")
        return False
    
    # Bcrypt has a 72 byte limit, so truncate if necessary
    if isinstance(plain_password, str):
        password_bytes = plain_password.encode('utf-8')
        if len(password_bytes) > 72:
            password_bytes = password_bytes[:72]
    else:
        password_bytes = plain_password if isinstance(plain_password, bytes) else str(plain_password).encode('utf-8')
        if len(password_bytes) > 72:
            password_bytes = password_bytes[:72]
    
    if isinstance(hashed_password, str):
        hashed_password_bytes = hashed_password.encode('utf-8')
    else:
        hashed_password_bytes = hashed_password
    
    try:
        result = bcrypt.checkpw(password_bytes, hashed_password_bytes)
        return result
    except Exception as e:
        print(f"Error in bcrypt.checkpw: {str(e)}")
        print(f"hashed_password type: {type(hashed_password)}, length: {len(hashed_password) if hashed_password else 'None'}")
        return False

def get_current_user():
    """Get the current authenticated user from database using PyMySQL."""
    try:
        verify_jwt_in_request()
        user_id = get_jwt_identity()
        if not user_id:
            return None
        
        conn = get_db_connection()
        if not conn:
            return None
        
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT id, correo, hash_contraseña, rol, negocio_id, estado_solicitud_negocio, creado_en FROM usuarios WHERE id = %s", (user_id,))
            user_data = cursor.fetchone()
            cursor.close()
            
            if user_data:
                # Convertir a diccionario (usando nombres de columnas de la BD)
                user = {
                    'id': user_data['id'],
                    'correo': user_data['correo'],
                    'password_hash': user_data['hash_contraseña'],  # Mantener nombre en código
                    'role': user_data['rol'],  # Mantener nombre en código (mapeo BD→código)
                    'business_id': user_data['negocio_id'],  # Mantener nombre en código (mapeo BD→código)
                    'estado_solicitud_negocio': user_data['estado_solicitud_negocio'],  # Para uso interno
                    'business_application_status': user_data['estado_solicitud_negocio'],  # Alias para compatibilidad
                    'creado_en': user_data['creado_en']
                }
                return user
            return None
        finally:
            conn.close()
    except Exception as e:
        print(f"[get_current_user] Error: {str(e)}")
        return None

def require_auth(f):
    """Decorator to require authentication."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        verify_jwt_in_request()
        return f(*args, **kwargs)
    return decorated_function

def require_role(allowed_roles):
    """Decorator to require specific roles."""
    def decorator(f):
        @wraps(f)
        @require_auth
        def decorated_function(*args, **kwargs):
            user = get_current_user()
            if not user or user.get('role') not in allowed_roles:
                return jsonify({'error': 'Not enough permissions'}), 403
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def require_super_admin(f):
    """Decorator to require super admin role."""
    return require_role(['super-admin'])(f)

def require_business_admin_or_super_admin(business_id_param='business_id'):
    """Decorator factory to require business admin or super admin."""
    def decorator(f):
        @wraps(f)
        @require_auth
        def decorated_function(*args, **kwargs):
            user = get_current_user()
            if not user:
                return jsonify({'error': 'Authentication required'}), 401
            
            if user.get('role') == 'super-admin':
                return f(*args, **kwargs)
            
            business_id = kwargs.get(business_id_param) or kwargs.get('id')
            if user.get('role') != 'business-admin' or user.get('business_id') != business_id:
                return jsonify({'error': 'Business admin access required for this business'}), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator
