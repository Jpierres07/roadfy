from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.db import get_db_connection
from app.auth import get_current_user, require_super_admin, get_password_hash
from app.utils.validators import validate_text, validate_phone, validate_email, validate_length
from app.utils.serializers import user_to_dict
from datetime import datetime, timezone
import secrets
import uuid

users_bp = Blueprint('users', __name__)

@users_bp.route('/me', methods=['GET'])
@jwt_required()
def get_my_profile():
    """Get current user's profile."""
    user = get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify(user_to_dict(user)), 200

@users_bp.route('/me', methods=['PUT'])
@jwt_required()
def update_my_profile():
    """Update current user's profile."""
    user = get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body is required'}), 400
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection error'}), 500
    
    try:
        cursor = conn.cursor()
        user_id = user.get('id')
        
        if 'email' in data:
            new_email = data['email'].lower().strip()
            if not validate_email(new_email):
                cursor.close()
                conn.close()
                return jsonify({'error': 'Email format is invalid'}), 400
            if not validate_length(new_email, max_length=255):
                cursor.close()
                conn.close()
                return jsonify({'error': 'Email is too long (max 255 characters)'}), 400
            
            # Check if email already in use
            cursor.execute("SELECT id FROM usuarios WHERE correo = %s AND id != %s", (new_email, user_id))
            existing = cursor.fetchone()
            if existing:
                cursor.close()
                conn.close()
                return jsonify({'error': 'Email already in use'}), 400
            
            # Get old email before update
            cursor.execute("SELECT correo FROM usuarios WHERE id = %s", (user_id,))
            old_user_data = cursor.fetchone()
            
            cursor.execute("UPDATE usuarios SET correo = %s WHERE id = %s", (new_email, user_id))
            
            # Log change for audit
            from app.governance.audit import log_change
            user_email = user.get('correo') if user else None
            
            log_change(table='usuarios', record_id=user_id, action='UPDATE',
                      user_id=user_id, user_email=user_email,
                      old_data=old_user_data, new_data={'correo': new_email},
                      field_changed='correo', old_value=old_user_data.get('correo') if old_user_data else None,
                      new_value=new_email)
        
        conn.commit()
        cursor.close()
        conn.close()
        
        # Get updated user
        user = get_current_user()
        return jsonify(user_to_dict(user)), 200
    
    except Exception as e:
        conn.rollback()
        cursor.close()
        conn.close()
        print(f"[UPDATE_MY_PROFILE] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Error updating profile'}), 500

@users_bp.route('', methods=['GET'])
def get_all_users():
    """Get all users. Public endpoint (for public profiles)."""
    skip = request.args.get('skip', 0, type=int)
    limit = request.args.get('limit', 100, type=int)
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection error'}), 500
    
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, correo, rol, creado_en 
            FROM usuarios 
            ORDER BY creado_en DESC 
            LIMIT %s OFFSET %s
        """, (limit, skip))
        users_data = cursor.fetchall()
        cursor.close()
        conn.close()
        
        public_users = [{
            'id': u['id'],
            'email': u['correo'],
            'role': u['rol'],
            'created_at': u['creado_en'].isoformat() if u['creado_en'] else None
        } for u in users_data]
        return jsonify(public_users), 200
    
    except Exception as e:
        cursor.close()
        conn.close()
        print(f"[GET_ALL_USERS] Error: {str(e)}")
        return jsonify({'error': 'Error retrieving users'}), 500

@users_bp.route('/<user_id>', methods=['GET'])
def get_user(user_id):
    """Get a specific user. Public endpoint (for public profiles)."""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection error'}), 500
    
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id, correo, rol, creado_en FROM usuarios WHERE id = %s", (user_id,))
        user_data = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if not user_data:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify({
            'id': user_data['id'],
            'email': user_data['correo'],
            'role': user_data['rol'],
            'created_at': user_data['creado_en'].isoformat() if user_data['creado_en'] else None
        }), 200
    
    except Exception as e:
        cursor.close()
        conn.close()
        print(f"[GET_USER] Error: {str(e)}")
        return jsonify({'error': 'Error retrieving user'}), 500

@users_bp.route('/pending-business-applications', methods=['GET'])
@require_super_admin
def get_pending_business_applications():
    """Get all users with pending business applications. Super admin only."""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection error'}), 500
    
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, correo, hash_contraseña, rol, negocio_id, estado_solicitud_negocio, creado_en
            FROM usuarios 
            WHERE estado_solicitud_negocio = %s
        """, ('pending',))
        users_data = cursor.fetchall()
        cursor.close()
        conn.close()
        
        return jsonify([user_to_dict(u) for u in users_data]), 200
    
    except Exception as e:
        cursor.close()
        conn.close()
        print(f"[GET_PENDING_BUSINESS_APPLICATIONS] Error: {str(e)}")
        return jsonify({'error': 'Error retrieving pending applications'}), 500

@users_bp.route('/pending-business-requests', methods=['GET'])
@require_super_admin
def get_pending_business_requests():
    """Get all public business requests (no-login) pending approval. Super admin only."""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection error'}), 500
    
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, nombre_negocio, direccion, telefono, correo, horarios, descripcion, estado, creado_en
            FROM solicitudes_negocios
            WHERE estado = %s
            ORDER BY creado_en DESC
        """, ('pending',))
        requests_data = cursor.fetchall()
        cursor.close()
        conn.close()
        
        return jsonify([{
            'id': r['id'],
            'businessName': r['nombre_negocio'],
            'address': r['direccion'],
            'phone': r['telefono'],
            'email': r['correo'],
            'hours': r['horarios'],
            'description': r['descripcion'],
            'status': r['estado'],
            'created_at': r['creado_en'].isoformat() if r['creado_en'] else None,
            'type': 'public_request'
        } for r in requests_data]), 200
    
    except Exception as e:
        cursor.close()
        conn.close()
        print(f"[GET_PENDING_BUSINESS_REQUESTS] Error: {str(e)}")
        return jsonify({'error': 'Error retrieving pending requests'}), 500

@users_bp.route('/business-requests/<request_id>/approve', methods=['POST'])
@require_super_admin
def approve_business_request(request_id):
    """Approve a public business request. Creates business and (if needed) a business-admin user."""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection error'}), 500
    
    try:
        cursor = conn.cursor()
        
        # Get request
        cursor.execute("""
            SELECT id, nombre_negocio, direccion, telefono, correo, horarios, descripcion
            FROM solicitudes_negocios
            WHERE id = %s AND estado = %s
        """, (request_id, 'pending'))
        req_data = cursor.fetchone()
        
        if not req_data:
            cursor.close()
            conn.close()
            return jsonify({'error': 'Request not found or not pending'}), 404
        
        data = request.get_json() or {}
        business_name = data.get('businessName') or req_data['nombre_negocio']
        address = data.get('address') or req_data['direccion']
        phone = data.get('phone') or req_data['telefono']
        hours = data.get('hours') or req_data['horarios']
        description = data.get('description') or req_data['descripcion'] or ''
        email = (data.get('email') or req_data['correo'] or '').lower()
        
        # Create business
        business_id = f"business-{uuid.uuid4().hex[:8]}"
        cursor.execute("""
            INSERT INTO negocios_llantas (id, nombre, direccion, telefono, correo, horarios, descripcion, calificacion, cantidad_resenas, creado_en)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (business_id, business_name, address, phone, email, hours, description or None, 0.0, 0, datetime.now(timezone.utc)))
        
        # Check if user exists
        cursor.execute("SELECT id FROM usuarios WHERE correo = %s", (email,))
        user_data = cursor.fetchone()
        
        created_password = None
        if not user_data:
            # Create new user
            created_password = secrets.token_urlsafe(9)
            user_id = f"user-{email.split('@')[0]}-{uuid.uuid4().hex[:4]}"
            cursor.execute("""
                INSERT INTO usuarios (id, correo, hash_contraseña, rol, negocio_id, estado_solicitud_negocio, creado_en)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (user_id, email, get_password_hash(created_password), 'business-admin', business_id, 'approved', datetime.now(timezone.utc)))
            
            # Log change for audit
            from app.governance.audit import log_change
            current_user = get_current_user()
            admin_user_id = current_user.get('id') if current_user else None
            admin_user_email = current_user.get('correo') if current_user else None
            
            new_user_data = {
                'id': user_id,
                'correo': email,
                'rol': 'business-admin',
                'negocio_id': business_id,
                'estado_solicitud_negocio': 'approved'
            }
            log_change(table='usuarios', record_id=user_id, action='INSERT',
                      user_id=admin_user_id, user_email=admin_user_email, new_data=new_user_data)
        else:
            # Update existing user
            user_id = user_data['id']
            # Get old data before update
            cursor.execute("""
                SELECT id, correo, hash_contraseña, rol, negocio_id, estado_solicitud_negocio, creado_en
                FROM usuarios WHERE id = %s
            """, (user_id,))
            old_user_data = cursor.fetchone()
            
            cursor.execute("""
                UPDATE usuarios 
                SET rol = %s, negocio_id = %s, estado_solicitud_negocio = %s
                WHERE id = %s
            """, ('business-admin', business_id, 'approved', user_id))
            
            # Log change for audit
            from app.governance.audit import log_change
            from app.governance.versioning import create_version
            current_user = get_current_user()
            admin_user_id = current_user.get('id') if current_user else None
            admin_user_email = current_user.get('correo') if current_user else None
            
            # Get new data after update
            cursor.execute("""
                SELECT id, correo, hash_contraseña, rol, negocio_id, estado_solicitud_negocio, creado_en
                FROM usuarios WHERE id = %s
            """, (user_id,))
            new_user_data = cursor.fetchone()
            
            log_change(table='usuarios', record_id=user_id, action='UPDATE',
                      user_id=admin_user_id, user_email=admin_user_email,
                      old_data=old_user_data, new_data=new_user_data,
                      field_changed='rol,negocio_id,estado_solicitud_negocio',
                      old_value=f"{old_user_data.get('rol')},{old_user_data.get('negocio_id')},{old_user_data.get('estado_solicitud_negocio')}" if old_user_data else None,
                      new_value=f"business-admin,{business_id},approved")
            
            # Create version
            create_version(table='usuarios', record_id=user_id, full_data=new_user_data,
                          user_id=admin_user_id, user_email=admin_user_email,
                          change_reason='Aprobación de solicitud de negocio')
        
        conn.commit()
        
        # Get updated user
        cursor.execute("""
            SELECT id, correo, hash_contraseña, rol, negocio_id, estado_solicitud_negocio, creado_en
            FROM usuarios WHERE id = %s
        """, (user_id,))
        user_data = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        payload = {
            'message': 'Business request approved',
            'business': {'id': business_id, 'name': business_name},
            'user': user_to_dict(user_data),
        }
        if created_password:
            payload['temp_password'] = created_password
        
        return jsonify(payload), 200
    
    except Exception as e:
        conn.rollback()
        cursor.close()
        conn.close()
        print(f"[APPROVE_BUSINESS_REQUEST] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Error approving request'}), 500

@users_bp.route('/business-requests/<request_id>/reject', methods=['POST'])
@require_super_admin
def reject_business_request(request_id):
    """Reject a public business request. Super admin only."""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection error'}), 500
    
    try:
        cursor = conn.cursor()
        data = request.get_json() or {}
        reason = data.get('reason', '') or ''
        
        cursor.execute("""
            UPDATE solicitudes_negocios 
            SET estado = %s, motivo_rechazo = %s
            WHERE id = %s AND estado = %s
        """, ('rejected', reason, request_id, 'pending'))
        
        if cursor.rowcount == 0:
            cursor.close()
            conn.close()
            return jsonify({'error': 'Request not found or not pending'}), 404
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({'message': 'Business request rejected'}), 200
    
    except Exception as e:
        conn.rollback()
        cursor.close()
        conn.close()
        print(f"[REJECT_BUSINESS_REQUEST] Error: {str(e)}")
        return jsonify({'error': 'Error rejecting request'}), 500

@users_bp.route('/<user_id>/approve-business', methods=['POST'])
@require_super_admin
def approve_business_application(user_id):
    """Approve a business application and create the business. Super admin only."""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection error'}), 500
    
    try:
        cursor = conn.cursor()
        
        # Get user
        cursor.execute("""
            SELECT id, correo, estado_solicitud_negocio
            FROM usuarios WHERE id = %s
        """, (user_id,))
        user_data = cursor.fetchone()
        
        if not user_data:
            cursor.close()
            conn.close()
            return jsonify({'error': 'User not found'}), 404
        
        if user_data['estado_solicitud_negocio'] != 'pending':
            cursor.close()
            conn.close()
            return jsonify({'error': 'User does not have a pending application'}), 400
        
        data = request.get_json()
        business_name = data.get('businessName', f'Negocio de {user_data["correo"]}')
        address = data.get('address', '')
        phone = data.get('phone', '')
        business_email = data.get('email', user_data['correo'])
        hours = data.get('hours', 'Lun-Vie: 9:00-18:00')
        description = data.get('description', '')
        
        # Validate
        if not validate_text(business_name) or not validate_length(business_name, min_length=1, max_length=255):
            cursor.close()
            conn.close()
            return jsonify({'error': 'Invalid business name'}), 400
        
        if address and (not validate_text(address) or not validate_length(address, min_length=1, max_length=1000)):
            cursor.close()
            conn.close()
            return jsonify({'error': 'Invalid address'}), 400
        
        if phone and (not validate_phone(phone) or not validate_length(phone, min_length=1, max_length=50)):
            cursor.close()
            conn.close()
            return jsonify({'error': 'Invalid phone'}), 400
        
        if business_email and not validate_email(business_email):
            cursor.close()
            conn.close()
            return jsonify({'error': 'Invalid email'}), 400
        
        # Create business
        business_id = f"business-{uuid.uuid4().hex[:8]}"
        cursor.execute("""
            INSERT INTO negocios_llantas (id, nombre, direccion, telefono, correo, horarios, descripcion, calificacion, cantidad_resenas, creado_en)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (business_id, business_name, address, phone, business_email, hours, description or None, 0.0, 0, datetime.now(timezone.utc)))
        
        # Update user
        cursor.execute("""
            UPDATE usuarios 
            SET estado_solicitud_negocio = %s, negocio_id = %s, rol = %s
            WHERE id = %s
        """, ('approved', business_id, 'business-admin', user_id))
        
        conn.commit()
        
        # Get updated user
        cursor.execute("""
            SELECT id, correo, hash_contraseña, rol, negocio_id, estado_solicitud_negocio, creado_en
            FROM usuarios WHERE id = %s
        """, (user_id,))
        updated_user = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'message': 'Business application approved',
            'user': user_to_dict(updated_user),
            'business': {
                'id': business_id,
                'name': business_name
            }
        }), 200
    
    except Exception as e:
        conn.rollback()
        cursor.close()
        conn.close()
        print(f"[APPROVE_BUSINESS_APPLICATION] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Error approving application'}), 500

@users_bp.route('/<user_id>/reject-business', methods=['POST'])
@require_super_admin
def reject_business_application(user_id):
    """Reject a business application. Super admin only."""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection error'}), 500
    
    try:
        cursor = conn.cursor()
        
        cursor.execute("""
            UPDATE usuarios 
            SET estado_solicitud_negocio = %s
            WHERE id = %s AND estado_solicitud_negocio = %s
        """, ('rejected', user_id, 'pending'))
        
        if cursor.rowcount == 0:
            cursor.close()
            conn.close()
            return jsonify({'error': 'User not found or does not have pending application'}), 404
        
        conn.commit()
        
        # Get updated user
        cursor.execute("""
            SELECT id, correo, hash_contraseña, rol, negocio_id, estado_solicitud_negocio, creado_en
            FROM usuarios WHERE id = %s
        """, (user_id,))
        user_data = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'message': 'Business application rejected',
            'user': user_to_dict(user_data)
        }), 200
    
    except Exception as e:
        conn.rollback()
        cursor.close()
        conn.close()
        print(f"[REJECT_BUSINESS_APPLICATION] Error: {str(e)}")
        return jsonify({'error': 'Error rejecting application'}), 500

@users_bp.route('/<user_id>', methods=['PUT'])
@require_super_admin
def update_user(user_id):
    """Update a user. Super admin only."""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection error'}), 500
    
    try:
        cursor = conn.cursor()
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body is required'}), 400
        
        # Check if user exists
        cursor.execute("SELECT id FROM usuarios WHERE id = %s", (user_id,))
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'error': 'User not found'}), 404
        
        updates = []
        params = []
        
        if 'email' in data:
            new_email = data['email'].lower().strip()
            if not validate_email(new_email):
                cursor.close()
                conn.close()
                return jsonify({'error': 'Invalid email format'}), 400
            
            # Check if email already in use
            cursor.execute("SELECT id FROM usuarios WHERE correo = %s AND id != %s", (new_email, user_id))
            if cursor.fetchone():
                cursor.close()
                conn.close()
                return jsonify({'error': 'Email already in use'}), 400
            
            updates.append("correo = %s")
            params.append(new_email)
        
        if 'role' in data:
            from app.utils.validators import validate_role
            role = data['role']
            if role and not validate_role(role):
                cursor.close()
                conn.close()
                return jsonify({'error': 'Invalid role. Must be: customer, business-admin, or super-admin'}), 400
            updates.append("rol = %s")
            params.append(role)
        
        if 'business_id' in data:
            updates.append("negocio_id = %s")
            params.append(data['business_id'])
        
        if 'business_application_status' in data:
            updates.append("estado_solicitud_negocio = %s")
            params.append(data['business_application_status'])
        
        if updates:
            params.append(user_id)
            cursor.execute(f"UPDATE usuarios SET {', '.join(updates)} WHERE id = %s", params)
            conn.commit()
        
        # Get updated user
        cursor.execute("""
            SELECT id, correo, hash_contraseña, rol, negocio_id, estado_solicitud_negocio, creado_en
            FROM usuarios WHERE id = %s
        """, (user_id,))
        user_data = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        return jsonify(user_to_dict(user_data)), 200
    
    except Exception as e:
        conn.rollback()
        cursor.close()
        conn.close()
        print(f"[UPDATE_USER] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Error updating user'}), 500
