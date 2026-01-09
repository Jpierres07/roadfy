from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required
from app.db import get_db_connection
from app.auth import get_password_hash, verify_password, get_current_user
from app.email_service import send_password_reset_email
from datetime import datetime, timedelta, timezone
import secrets
import uuid

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body is required'}), 400
        
        email = data.get('email')
        password = data.get('password')
        role = data.get('role', 'customer')
        
        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400
        
        # Normalizar email
        email = email.lower().strip()
        
        # Validate email format
        from app.utils.validators import validate_email, validate_length, validate_role
        if not validate_email(email):
            return jsonify({'error': 'Email format is invalid'}), 400
        
        # Validate email length
        if not validate_length(email, max_length=255):
            return jsonify({'error': 'Email is too long (max 255 characters)'}), 400
        
        # Validate password length
        if not validate_length(password, min_length=6, max_length=128):
            return jsonify({'error': 'Password must be between 6 and 128 characters'}), 400
        
        # Validate role
        if role and not validate_role(role):
            return jsonify({'error': 'Invalid role. Must be: customer, business-admin, or super-admin'}), 400
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection error'}), 500
        
        try:
            cursor = conn.cursor()
            
            # Check if user already exists
            cursor.execute("SELECT id FROM usuarios WHERE correo = %s", (email,))
            existing_user = cursor.fetchone()
            
            if existing_user:
                cursor.close()
                conn.close()
                return jsonify({'error': 'Email already registered'}), 400
            
            # Create new user
            user_id = f"user-{email.split('@')[0]}"
            hash_contraseña = get_password_hash(password)
            
            cursor.execute("""
                INSERT INTO usuarios (id, correo, hash_contraseña, rol, creado_en)
                VALUES (%s, %s, %s, %s, %s)
            """, (user_id, email, hash_contraseña, role, datetime.now(timezone.utc)))
            
            conn.commit()
            
            # Log change for audit
            from app.governance.audit import log_change
            new_user_data = {
                'id': user_id,
                'correo': email,
                'rol': role
            }
            log_change(table='usuarios', record_id=user_id, action='INSERT',
                      user_id=None, user_email=email, new_data=new_user_data)
            
            cursor.close()
            conn.close()
            
            return jsonify({
                'id': user_id,
                'email': email,
                'role': role,
                'business_id': None,
                'business_application_status': None
            }), 201
        
        except Exception as create_error:
            conn.rollback()
            cursor.close()
            conn.close()
            print(f"[REGISTER] Error: {str(create_error)}")
            import traceback
            traceback.print_exc()
            return jsonify({'error': 'Failed to create user. Please try again.'}), 500
    
    except Exception as e:
        import traceback
        print(f"[REGISTER] Error inesperado: {str(e)}")
        traceback.print_exc()
        return jsonify({'error': 'Registration failed. Please try again.'}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    """Login and get access token."""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Request body is required'}), 400
        
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400
        
        # Normalizar email
        email = email.lower().strip()
        
        # Validate email format and length
        from app.utils.validators import validate_email, validate_length
        if not validate_email(email):
            return jsonify({'error': 'Email format is invalid'}), 400
        
        if not validate_length(email, max_length=255):
            return jsonify({'error': 'Email is too long'}), 400
        
        if not validate_length(password, min_length=1, max_length=128):
            return jsonify({'error': 'Invalid password format'}), 400
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Cannot connect to database server. Check WAMP/MySQL is running.'}), 500
        
        try:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, correo, hash_contraseña, rol, negocio_id, estado_solicitud_negocio
                FROM usuarios WHERE correo = %s
            """, (email,))
            user_data = cursor.fetchone()
            cursor.close()
            conn.close()
            
            if not user_data:
                # Log failed login attempt
                from app.governance.audit import log_access
                log_access(user_id=None, user_email=email, 
                          access_type='LOGIN_FAILED', successful=False,
                          error_message='User not found')
                return jsonify({'error': 'Incorrect email or password'}), 401
            
            # user_data es un diccionario (DictCursor), no una tupla
            user_id = user_data['id']
            user_email = user_data['correo']
            hash_contraseña = user_data['hash_contraseña']
            user_role = user_data['rol']
            negocio_id = user_data['negocio_id']
            estado_solicitud_negocio = user_data['estado_solicitud_negocio']
            
            # Verify password
            if not hash_contraseña:
                # Log failed login attempt
                from app.governance.audit import log_access
                log_access(user_id=user_id, user_email=user_email, 
                          access_type='LOGIN_FAILED', successful=False,
                          error_message='No password hash')
                return jsonify({'error': 'Incorrect email or password'}), 401
            
            password_valid = verify_password(password, hash_contraseña)
            
            if not password_valid:
                # Log failed login attempt
                from app.governance.audit import log_access
                log_access(user_id=user_id, user_email=user_email, 
                          access_type='LOGIN_FAILED', successful=False,
                          error_message='Invalid password')
                return jsonify({'error': 'Incorrect email or password'}), 401
            
            # Create access token
            access_token = create_access_token(identity=user_id)
            
            # Log successful access
            from app.governance.audit import log_access
            log_access(user_id=user_id, user_email=user_email, 
                      access_type='LOGIN', successful=True)
            
            return jsonify({
                'access_token': access_token,
                'token_type': 'bearer'
            }), 200
        
        except Exception as query_error:
            conn.close()
            error_msg = str(query_error)
            print(f"[LOGIN] Error: {error_msg}")
            import traceback
            traceback.print_exc()
            
            if 'Access denied' in error_msg or '1045' in error_msg:
                return jsonify({'error': 'Database authentication error. Check .env configuration.'}), 500
            elif 'Unknown database' in error_msg or '1049' in error_msg:
                return jsonify({'error': 'Database not found. Check database name in .env'}), 500
            elif 'Can\'t connect' in error_msg or '2003' in error_msg:
                return jsonify({'error': 'Cannot connect to database server. Check WAMP/MySQL is running.'}), 500
            else:
                return jsonify({'error': f'Database query error: {error_msg}'}), 500
    
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print("=" * 70)
        print("ERROR EN LOGIN")
        print("=" * 70)
        print(error_trace)
        print("=" * 70)
        return jsonify({'error': 'Login failed'}), 500

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_me():
    """Get current user information."""
    try:
        user = get_current_user()
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify({
            'id': user.get('id'),
            'email': user.get('correo') or user.get('email', ''),
            'role': user.get('role'),
            'business_id': user.get('business_id'),
            'business_application_status': user.get('business_application_status'),
            'created_at': user.get('creado_en').isoformat() if user.get('creado_en') else None
        }), 200
    except Exception as e:
        import traceback
        print(f"[GET_ME] Error: {str(e)}")
        traceback.print_exc()
        return jsonify({'error': 'Error retrieving user information'}), 500

@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    """Request password reset. Generates a reset token and sends email."""
    data = request.get_json()
    email = data.get('email')
    
    if not email:
        return jsonify({'error': 'Email is required'}), 400
    
    email = email.lower().strip()
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection error'}), 500
    
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM usuarios WHERE correo = %s", (email,))
        user_data = cursor.fetchone()
        
        # Always return success to prevent email enumeration
        if user_data:
            user_id = user_data[0]
            
            # Invalidar tokens anteriores
            cursor.execute("""
                UPDATE tokens_recuperacion 
                SET usado = %s 
                WHERE usuario_id = %s AND usado = %s
            """, (True, user_id, False))
            
            # Generar nuevo token
            reset_token = secrets.token_urlsafe(32)
            expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
            token_id = f"token-{secrets.token_urlsafe(16)}"
            
            cursor.execute("""
                INSERT INTO tokens_recuperacion (id, usuario_id, token, expira_en, usado)
                VALUES (%s, %s, %s, %s, %s)
            """, (token_id, user_id, reset_token, expires_at, False))
            
            conn.commit()
            
            # Enviar email
            try:
                send_password_reset_email(email, reset_token)
            except Exception as e:
                print(f"Error al enviar email: {str(e)}")
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'message': 'Si el email existe, se enviará un enlace de recuperación.'
        }), 200
    
    except Exception as e:
        conn.rollback()
        cursor.close()
        conn.close()
        print(f"[FORGOT_PASSWORD] Error: {str(e)}")
        return jsonify({'error': 'Error processing request'}), 500

@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    """Reset password with token."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body is required'}), 400
    
    email = data.get('email')
    token = data.get('token')
    new_password = data.get('new_password')
    
    if not all([email, token, new_password]):
        return jsonify({'error': 'Email, token y nueva contraseña son requeridos'}), 400
    
    email = email.lower().strip()
    
    # Validate email format
    from app.utils.validators import validate_email, validate_length
    if not validate_email(email):
        return jsonify({'error': 'Email format is invalid'}), 400
    
    # Validate password length
    if not validate_length(new_password, min_length=6, max_length=128):
        return jsonify({'error': 'La contraseña debe tener entre 6 y 128 caracteres'}), 400
    
    # Validate token format
    if not validate_length(token, min_length=10, max_length=255):
        return jsonify({'error': 'Token format is invalid'}), 400
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection error'}), 500
    
    try:
        cursor = conn.cursor()
        
        # Buscar usuario
        cursor.execute("SELECT id, hash_contraseña FROM usuarios WHERE correo = %s", (email,))
        user_data = cursor.fetchone()
        
        if not user_data:
            cursor.close()
            conn.close()
            return jsonify({'error': 'Token o email inválido'}), 400
        
        user_id, current_hash_contraseña = user_data
        
        # Buscar token válido
        cursor.execute("""
            SELECT id, expira_en FROM tokens_recuperacion
            WHERE usuario_id = %s AND token = %s AND usado = %s
        """, (user_id, token, False))
        token_data = cursor.fetchone()
        
        if not token_data:
            cursor.close()
            conn.close()
            return jsonify({'error': 'Token inválido o ya utilizado'}), 400
        
        token_id, expires_at = token_data
        
        # Verificar expiración
        now_utc = datetime.now(timezone.utc)
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        elif expires_at.tzinfo != timezone.utc:
            expires_at = expires_at.astimezone(timezone.utc)
        
        if now_utc > expires_at:
            cursor.execute("UPDATE tokens_recuperacion SET usado = %s WHERE id = %s", (True, token_id))
            conn.commit()
            cursor.close()
            conn.close()
            return jsonify({'error': 'El token ha expirado. Solicita uno nuevo.'}), 400
        
        # Verificar que la nueva contraseña sea diferente
        if verify_password(new_password, current_hash_contraseña):
            cursor.close()
            conn.close()
            return jsonify({'error': 'La nueva contraseña debe ser diferente a la actual'}), 400
        
        # Actualizar contraseña
        new_hash_contraseña = get_password_hash(new_password)
        cursor.execute("UPDATE usuarios SET hash_contraseña = %s WHERE id = %s", (new_hash_contraseña, user_id))
        
        # Marcar token como usado
        cursor.execute("UPDATE tokens_recuperacion SET usado = %s WHERE id = %s", (True, token_id))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({'message': 'Contraseña restablecida exitosamente'}), 200
    
    except Exception as e:
        conn.rollback()
        cursor.close()
        conn.close()
        print(f"[RESET_PASSWORD] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Error processing request'}), 500

@auth_bp.route('/verify-reset-token', methods=['POST'])
def verify_reset_token():
    """Verificar si un token de recuperación es válido."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body is required'}), 400
    
    email = data.get('email')
    token = data.get('token')
    
    if not email or not token:
        return jsonify({'error': 'Email y token son requeridos'}), 400
    
    # Validate email format
    from app.utils.validators import validate_email, validate_length
    email = email.lower().strip()
    if not validate_email(email):
        return jsonify({'error': 'Email format is invalid'}), 400
    
    if not validate_length(token, min_length=10, max_length=255):
        return jsonify({'error': 'Token format is invalid'}), 400
    
    email = email.lower().strip()
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'valid': False, 'error': 'Database connection error'}), 200
    
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM usuarios WHERE correo = %s", (email,))
        user_data = cursor.fetchone()
        
        if not user_data:
            cursor.close()
            conn.close()
            return jsonify({'valid': False, 'error': 'Email no encontrado'}), 200
        
        user_id = user_data[0]
        
        cursor.execute("""
            SELECT expira_en FROM tokens_recuperacion
            WHERE usuario_id = %s AND token = %s AND usado = %s
        """, (user_id, token, False))
        token_data = cursor.fetchone()
        
        if not token_data:
            cursor.close()
            conn.close()
            return jsonify({'valid': False, 'error': 'Token inválido o ya utilizado'}), 200
        
        expires_at = token_data[0]
        
        # Verificar expiración
        now_utc = datetime.now(timezone.utc)
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        elif expires_at.tzinfo != timezone.utc:
            expires_at = expires_at.astimezone(timezone.utc)
        
        if now_utc > expires_at:
            cursor.close()
            conn.close()
            return jsonify({'valid': False, 'error': 'El token ha expirado'}), 200
        
        cursor.close()
        conn.close()
        return jsonify({'valid': True}), 200
    
    except Exception as e:
        cursor.close()
        conn.close()
        print(f"[VERIFY_RESET_TOKEN] Error: {str(e)}")
        return jsonify({'valid': False, 'error': 'Error processing request'}), 200

@auth_bp.route('/request-business', methods=['POST'])
def request_business():
    """Solicitud pública para registrar un negocio."""
    data = request.get_json() or {}

    business_name = (data.get('businessName') or '').strip()
    address = (data.get('address') or '').strip()
    phone = (data.get('phone') or '').strip()
    email = (data.get('email') or '').strip().lower()
    hours = (data.get('hours') or '').strip()
    description = (data.get('description') or '').strip()

    if not all([business_name, address, phone, email, hours]):
        return jsonify({'error': 'Faltan campos obligatorios'}), 400
    
    # Validate
    from app.utils.validators import validate_email, validate_length
    if not validate_email(email):
        return jsonify({'error': 'El formato del email es inválido'}), 400
    
    if not validate_length(business_name, min_length=1, max_length=255):
        return jsonify({'error': 'El nombre del negocio debe tener entre 1 y 255 caracteres'}), 400
    if not validate_length(address, min_length=1, max_length=1000):
        return jsonify({'error': 'La dirección debe tener entre 1 y 1000 caracteres'}), 400
    if not validate_length(phone, min_length=1, max_length=50):
        return jsonify({'error': 'El teléfono debe tener entre 1 y 50 caracteres'}), 400
    if not validate_length(hours, min_length=1, max_length=255):
        return jsonify({'error': 'Los horarios deben tener entre 1 y 255 caracteres'}), 400
    if description and not validate_length(description, max_length=2000):
        return jsonify({'error': 'La descripción no puede exceder 2000 caracteres'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection error'}), 500
    
    try:
        cursor = conn.cursor()
        
        # Evitar duplicados pendientes
        cursor.execute("""
            SELECT id FROM solicitudes_negocios
            WHERE correo = %s AND nombre_negocio = %s AND estado = %s
        """, (email, business_name, 'pending'))
        existing = cursor.fetchone()
        
        if existing:
            cursor.close()
            conn.close()
            return jsonify({'error': 'Ya existe una solicitud pendiente con ese correo y nombre de negocio'}), 400
        
        # Crear solicitud
        req_id = f"req-{uuid.uuid4().hex[:10]}"
        cursor.execute("""
            INSERT INTO solicitudes_negocios (id, nombre_negocio, direccion, telefono, correo, horarios, descripcion, estado, creado_en)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (req_id, business_name, address, phone, email, hours, description or None, 'pending', datetime.now(timezone.utc)))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({
            'message': 'Solicitud enviada. Será revisada por un administrador.',
            'status': 'pending',
            'request_id': req_id
        }), 200
    
    except Exception as e:
        conn.rollback()
        cursor.close()
        conn.close()
        print(f"[REQUEST_BUSINESS] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Error processing request'}), 500
