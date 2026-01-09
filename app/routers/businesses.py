from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.db import get_db_connection
from app.auth import get_current_user, require_super_admin
from app.utils.validators import validate_text, validate_url, validate_phone
from app.utils.serializers import business_to_dict
from datetime import datetime, timezone
import json

businesses_bp = Blueprint('businesses', __name__)

@businesses_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint to verify database connection."""
    conn = get_db_connection()
    if not conn:
        return jsonify({
            'status': 'unhealthy',
            'database_connected': False,
            'error': 'Cannot connect to database'
        }), 500
    
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as count FROM negocios_llantas")
        result = cursor.fetchone()
        count = result['count'] if result else 0
        cursor.close()
        conn.close()
        
        return jsonify({
            'status': 'healthy',
            'database_connected': True,
            'businesses_count': count
        }), 200
    except Exception as e:
        cursor.close()
        conn.close()
        return jsonify({
            'status': 'unhealthy',
            'database_connected': False,
            'error': str(e)
        }), 500

@businesses_bp.route('', methods=['GET'])
def get_businesses():
    """Get all businesses. Public endpoint."""
    skip = request.args.get('skip', 0, type=int)
    limit = request.args.get('limit', 100, type=int)
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection error'}), 500
    
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, nombre, direccion, telefono, correo, horarios, descripcion, 
                   calificacion, cantidad_resenas, url_mapa_google, url_imagen, 
                   redes_sociales, creado_en
            FROM negocios_llantas
            ORDER BY creado_en DESC
            LIMIT %s OFFSET %s
        """, (limit, skip))
        businesses_data = cursor.fetchall()
        cursor.close()
        conn.close()
        
        result = []
        for b in businesses_data:
            try:
                business_dict = business_to_dict(b)
                if business_dict:
                    result.append(business_dict)
            except Exception as e:
                print(f"Error serializando negocio {b.get('id', 'unknown')}: {e}")
                continue
        
        return jsonify(result), 200
    except Exception as e:
        cursor.close()
        conn.close()
        print(f"[GET_BUSINESSES] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Error al obtener negocios: {str(e)}'}), 500

@businesses_bp.route('/<business_id>', methods=['GET'])
def get_business(business_id):
    """Get a specific business by ID. Public endpoint."""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection error'}), 500
    
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, nombre, direccion, telefono, correo, horarios, descripcion, 
                   calificacion, cantidad_resenas, url_mapa_google, url_imagen, 
                   redes_sociales, creado_en
            FROM negocios_llantas
            WHERE id = %s
        """, (business_id,))
        business_data = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if not business_data:
            return jsonify({'error': 'Business not found'}), 404
        
        result = business_to_dict(business_data)
        if not result:
            return jsonify({'error': 'Error serializing business data'}), 500
        
        return jsonify(result), 200
    except Exception as e:
        cursor.close()
        conn.close()
        print(f"[GET_BUSINESS] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Error al obtener negocio: {str(e)}'}), 500

@businesses_bp.route('', methods=['POST'])
@jwt_required()
def create_business():
    """Create a new business. Authenticated users only."""
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Authentication required'}), 401
    
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body is required'}), 400
    
    business_id = data.get('id')
    if business_id:
        # Validate business_id format
        from app.utils.validators import validate_id_format
        if not validate_id_format(business_id):
            return jsonify({'error': 'Invalid business ID format'}), 400
        conn = get_db_connection()
        if conn:
            try:
                cursor = conn.cursor()
                cursor.execute("SELECT id FROM negocios_llantas WHERE id = %s", (business_id,))
                if cursor.fetchone():
                    cursor.close()
                    conn.close()
                    return jsonify({'error': 'Business ID already exists'}), 400
                cursor.close()
                conn.close()
            except:
                pass
    
    # Validate
    from app.utils.validators import validate_length
    name = data.get('name', '')
    if name:
        if not validate_text(name):
            return jsonify({'error': 'El nombre contiene caracteres no permitidos'}), 400
        if not validate_length(name, max_length=255):
            return jsonify({'error': 'El nombre no puede exceder 255 caracteres'}), 400
    
    address = data.get('address', '')
    if address:
        if not validate_text(address):
            return jsonify({'error': 'La dirección contiene caracteres no permitidos'}), 400
        if not validate_length(address, max_length=1000):
            return jsonify({'error': 'La dirección no puede exceder 1000 caracteres'}), 400
    
    # Validate email if provided
    contact = data.get('contact', {})
    contact_email = contact.get('email')
    if contact_email:
        from app.utils.validators import validate_email
        contact_email = contact_email.lower().strip()
        if not validate_email(contact_email):
            return jsonify({'error': 'Email format is invalid'}), 400
    
    contact = data.get('contact', {})
    socials = data.get('socials')
    
    phone = contact.get('phone')
    if phone and not validate_phone(phone):
        return jsonify({'error': 'El teléfono solo puede contener números y los símbolos: +, -, espacios, paréntesis'}), 400
    
    image_url = data.get('imageUrl', '')
    if image_url and not validate_url(image_url):
        return jsonify({'error': 'La URL de imagen debe comenzar con http:// o https://'}), 400
    
    google_maps_url = data.get('googleMapsEmbedUrl', '')
    if google_maps_url and not validate_url(google_maps_url):
        return jsonify({'error': 'La URL de Google Maps debe comenzar con http:// o https://'}), 400
    
    if socials:
        for platform, url in socials.items():
            if url and not validate_url(url):
                return jsonify({'error': f'La URL de {platform} debe comenzar con http:// o https://'}), 400
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection error'}), 500
    
    try:
        cursor = conn.cursor()
        new_business_id = business_id or f"biz-{name.lower().replace(' ', '-')}"
        
        # Convert socials to JSON string if dict
        socials_json = json.dumps(socials) if socials else None
        
        cursor.execute("""
            INSERT INTO negocios_llantas (id, nombre, direccion, telefono, correo, horarios, 
                                        descripcion, url_mapa_google, url_imagen, redes_sociales, 
                                        calificacion, cantidad_resenas, creado_en)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (new_business_id, name, address, phone, contact.get('email'), data.get('hours'),
              data.get('description'), google_maps_url, image_url, socials_json, 0.0, 0,
              datetime.now(timezone.utc)))
        
        conn.commit()
        
        # Log change for audit
        from app.governance.audit import log_change
        from app.governance.versioning import create_version
        user_id = user.get('id') if user else None
        user_email = user.get('correo') if user else None
        
        new_business_data = {
            'id': new_business_id,
            'nombre': name,
            'direccion': address,
            'telefono': phone,
            'correo': contact.get('email'),
            'horarios': data.get('hours'),
            'descripcion': data.get('description')
        }
        log_change(table='negocios_llantas', record_id=new_business_id, action='INSERT',
                  user_id=user_id, user_email=user_email, new_data=new_business_data)
        
        # Create version
        create_version(table='negocios_llantas', record_id=new_business_id, full_data=new_business_data,
                      user_id=user_id, user_email=user_email, change_reason='Creación de negocio')
        
        # Get created business
        cursor.execute("""
            SELECT id, nombre, direccion, telefono, correo, horarios, descripcion, 
                   calificacion, cantidad_resenas, url_mapa_google, url_imagen, 
                   redes_sociales, creado_en
            FROM negocios_llantas WHERE id = %s
        """, (new_business_id,))
        business_data = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        return jsonify(business_to_dict(business_data)), 201
    
    except Exception as e:
        conn.rollback()
        cursor.close()
        conn.close()
        print(f"[CREATE_BUSINESS] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Error creating business'}), 500

@businesses_bp.route('/<business_id>', methods=['PUT'])
@jwt_required()
def update_business(business_id):
    """Update a business. Business admin or super admin only."""
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Authentication required'}), 401
    
    # Check permissions
    user_role = user.get('role')
    if user_role != 'super-admin':
        if user_role != 'business-admin' or user.get('business_id') != business_id:
            return jsonify({'error': 'You can only update your own business'}), 403
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection error'}), 500
    
    try:
        cursor = conn.cursor()
        
        # Check if business exists
        cursor.execute("SELECT id FROM negocios_llantas WHERE id = %s", (business_id,))
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'error': 'Business not found'}), 404
        
        data = request.get_json()
        updates = []
        params = []
        
        if 'name' in data:
            name = data['name']
            if name and not validate_text(name):
                cursor.close()
                conn.close()
                return jsonify({'error': 'El nombre contiene caracteres no permitidos'}), 400
            updates.append("nombre = %s")
            params.append(name)
        
        if 'address' in data:
            address = data['address']
            if address and not validate_text(address):
                cursor.close()
                conn.close()
                return jsonify({'error': 'La dirección contiene caracteres no permitidos'}), 400
            updates.append("direccion = %s")
            params.append(address)
        
        if 'contact' in data:
            contact = data['contact']
            phone = contact.get('phone')
            if phone and not validate_phone(phone):
                cursor.close()
                conn.close()
                return jsonify({'error': 'El teléfono solo puede contener números y los símbolos: +, -, espacios, paréntesis'}), 400
            updates.append("telefono = %s")
            params.append(phone)
            
            contact_email = contact.get('email')
            if contact_email:
                from app.utils.validators import validate_email
                contact_email = contact_email.lower().strip()
                if not validate_email(contact_email):
                    cursor.close()
                    conn.close()
                    return jsonify({'error': 'Email format is invalid'}), 400
            updates.append("correo = %s")
            params.append(contact_email)
        
        if 'imageUrl' in data:
            image_url = data['imageUrl']
            if image_url and not validate_url(image_url):
                cursor.close()
                conn.close()
                return jsonify({'error': 'La URL de imagen debe comenzar con http:// o https://'}), 400
            updates.append("url_imagen = %s")
            params.append(image_url)
        
        if 'googleMapsEmbedUrl' in data:
            google_maps_url = data['googleMapsEmbedUrl']
            if google_maps_url and not validate_url(google_maps_url):
                cursor.close()
                conn.close()
                return jsonify({'error': 'La URL de Google Maps debe comenzar con http:// o https://'}), 400
            updates.append("url_mapa_google = %s")
            params.append(google_maps_url)
        
        if 'socials' in data:
            socials = data['socials']
            for platform, url in (socials or {}).items():
                if url and not validate_url(url):
                    cursor.close()
                    conn.close()
                    return jsonify({'error': f'La URL de {platform} debe comenzar con http:// o https://'}), 400
            updates.append("redes_sociales = %s")
            params.append(json.dumps(socials) if socials else None)
        
        if 'hours' in data:
            updates.append("horarios = %s")
            params.append(data['hours'])
        
        if 'description' in data:
            updates.append("descripcion = %s")
            params.append(data['description'])
        
        if updates:
            # Get old data before update
            cursor.execute("""
                SELECT id, nombre, direccion, telefono, correo, horarios, descripcion, 
                       calificacion, cantidad_resenas, url_mapa_google, url_imagen, 
                       redes_sociales, creado_en
                FROM negocios_llantas WHERE id = %s
            """, (business_id,))
            old_business_data = cursor.fetchone()
            
            params.append(business_id)
            cursor.execute(f"UPDATE negocios_llantas SET {', '.join(updates)} WHERE id = %s", params)
            conn.commit()
            
            # Get new data after update
            cursor.execute("""
                SELECT id, nombre, direccion, telefono, correo, horarios, descripcion, 
                       calificacion, cantidad_resenas, url_mapa_google, url_imagen, 
                       redes_sociales, creado_en
                FROM negocios_llantas WHERE id = %s
            """, (business_id,))
            new_business_data = cursor.fetchone()
            
            # Log change for audit
            from app.governance.audit import log_change
            from app.governance.versioning import create_version
            user_id = user.get('id') if user else None
            user_email = user.get('correo') if user else None
            
            log_change(table='negocios_llantas', record_id=business_id, action='UPDATE',
                      user_id=user_id, user_email=user_email,
                      old_data=old_business_data, new_data=new_business_data)
            
            # Create version
            create_version(table='negocios_llantas', record_id=business_id, full_data=new_business_data,
                          user_id=user_id, user_email=user_email, change_reason='Actualización de negocio')
        
        # Get updated business
        cursor.execute("""
            SELECT id, nombre, direccion, telefono, correo, horarios, descripcion, 
                   calificacion, cantidad_resenas, url_mapa_google, url_imagen, 
                   redes_sociales, creado_en
            FROM negocios_llantas WHERE id = %s
        """, (business_id,))
        business_data = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        return jsonify(business_to_dict(business_data)), 200
    
    except Exception as e:
        conn.rollback()
        cursor.close()
        conn.close()
        print(f"[UPDATE_BUSINESS] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Error updating business'}), 500

@businesses_bp.route('/<business_id>', methods=['DELETE'])
@require_super_admin
def delete_business(business_id):
    """Delete a business. Super admin only."""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection error'}), 500
    
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM negocios_llantas WHERE id = %s", (business_id,))
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'error': 'Business not found'}), 404
        
        cursor.execute("DELETE FROM negocios_llantas WHERE id = %s", (business_id,))
        conn.commit()
        cursor.close()
        conn.close()
        
        return '', 204
    
    except Exception as e:
        conn.rollback()
        cursor.close()
        conn.close()
        print(f"[DELETE_BUSINESS] Error: {str(e)}")
        return jsonify({'error': 'Error deleting business'}), 500
