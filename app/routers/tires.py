from flask import Blueprint, request, jsonify
from app.db import get_db_connection
from app.auth import require_super_admin
from app.utils.validators import validate_text, validate_url, validate_number
from app.utils.serializers import tire_to_dict
from datetime import datetime, timezone

tires_bp = Blueprint('tires', __name__)

@tires_bp.route('', methods=['GET'])
def get_tires():
    """Get all tires with optional filters. Public endpoint."""
    try:
        brand = request.args.get('brand')
        tire_type = request.args.get('type')
        width = request.args.get('width', type=int)
        aspect_ratio = request.args.get('ratio', type=int)
        diameter = request.args.get('diameter', type=int)
        search = request.args.get('search')
        min_price = request.args.get('min_price', type=float)
        max_price = request.args.get('max_price', type=float)
        has_stock = request.args.get('has_stock', type=str)
        skip = request.args.get('skip', 0, type=int)
        limit = request.args.get('limit', 100, type=int)
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection error'}), 500
        
        try:
            cursor = conn.cursor()
            
            # Build query
            where_clauses = []
            params = []
            joins = []
            
            # Search filter
            if search:
                search_term = f'%{search.lower()}%'
                where_clauses.append("(LOWER(marca) LIKE %s OR LOWER(modelo) LIKE %s OR LOWER(CONCAT(marca, ' ', modelo)) LIKE %s)")
                params.extend([search_term, search_term, search_term])
            
            # Brand filter
            elif brand:
                brand_term = f'%{brand.lower()}%'
                where_clauses.append("LOWER(marca) LIKE %s")
                params.append(brand_term)
            
            # Type filter
            if tire_type:
                where_clauses.append("(tipo = %s OR tipo LIKE %s)")
                params.extend([tire_type, f'%{tire_type}%'])
            
            # Size filters
            if width:
                where_clauses.append("ancho = %s")
                params.append(width)
            if aspect_ratio:
                where_clauses.append("relacion_aspecto = %s")
                params.append(aspect_ratio)
            if diameter:
                where_clauses.append("diametro = %s")
                params.append(diameter)
            
            # Price/stock filters (requires join)
            if min_price is not None or max_price is not None or has_stock == 'true':
                joins.append("INNER JOIN items_inventario ON llantas.id = items_inventario.llanta_id")
                if has_stock == 'true':
                    where_clauses.append("items_inventario.cantidad > 0")
                if min_price is not None:
                    where_clauses.append("items_inventario.precio >= %s")
                    params.append(min_price)
                if max_price is not None:
                    where_clauses.append("items_inventario.precio <= %s")
                    params.append(max_price)
            
            # Build final query
            join_str = ' '.join(joins) if joins else ''
            where_str = ' AND '.join(where_clauses) if where_clauses else '1=1'
            
            query = f"""
                SELECT DISTINCT llantas.id, llantas.marca, llantas.modelo, llantas.ancho, 
                       llantas.relacion_aspecto, llantas.diametro, llantas.tipo, llantas.url_imagen, 
                       llantas.creado_en
                FROM llantas
                {join_str}
                WHERE {where_str}
                ORDER BY llantas.creado_en DESC
                LIMIT %s OFFSET %s
            """
            params.extend([limit, skip])
            
            cursor.execute(query, params)
            tires_data = cursor.fetchall()
            
            # Enrich with price info
            tires_result = []
            for tire in tires_data:
                tire_dict = tire_to_dict(tire)
                
                # Get price info from inventory
                cursor.execute("""
                    SELECT precio FROM items_inventario 
                    WHERE llanta_id = %s AND cantidad > 0
                """, (tire['id'],))
                prices_data = cursor.fetchall()
                
                if prices_data:
                    prices = [p['precio'] for p in prices_data]
                    tire_dict['minPrice'] = min(prices)
                    tire_dict['maxPrice'] = max(prices)
                    tire_dict['hasStock'] = True
                else:
                    tire_dict['minPrice'] = None
                    tire_dict['maxPrice'] = None
                    tire_dict['hasStock'] = False
                
                tires_result.append(tire_dict)
            
            cursor.close()
            conn.close()
            
            return jsonify(tires_result), 200
        
        except Exception as e:
            cursor.close()
            conn.close()
            raise e
    
    except Exception as e:
        import traceback
        error_msg = traceback.format_exc()
        print(f"Error in get_tires: {error_msg}")
        return jsonify({'error': str(e), 'details': error_msg}), 500

@tires_bp.route('/<tire_id>', methods=['GET'])
def get_tire(tire_id):
    """Get a specific tire by ID. Public endpoint."""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection error'}), 500
    
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, marca, modelo, ancho, relacion_aspecto, diametro, tipo, url_imagen, creado_en
            FROM llantas WHERE id = %s
        """, (tire_id,))
        tire_data = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if not tire_data:
            return jsonify({'error': 'Tire not found'}), 404
        
        return jsonify(tire_to_dict(tire_data)), 200
    
    except Exception as e:
        cursor.close()
        conn.close()
        print(f"[GET_TIRE] Error: {str(e)}")
        return jsonify({'error': 'Error retrieving tire'}), 500

@tires_bp.route('', methods=['POST'])
@require_super_admin
def create_tire():
    """Create a new tire. Super admin only."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body is required'}), 400
    
    tire_id = data.get('id')
    if tire_id:
        # Validate tire_id format
        from app.utils.validators import validate_id_format
        if not validate_id_format(tire_id):
            return jsonify({'error': 'Invalid tire ID format'}), 400
        conn = get_db_connection()
        if conn:
            try:
                cursor = conn.cursor()
                cursor.execute("SELECT id FROM llantas WHERE id = %s", (tire_id,))
                if cursor.fetchone():
                    cursor.close()
                    conn.close()
                    return jsonify({'error': 'Tire ID already exists'}), 400
                cursor.close()
                conn.close()
            except:
                pass
    
    brand = data.get('brand')
    model = data.get('model')
    size = data.get('size', {})
    tire_type = data.get('type')
    image_url = data.get('imageUrl')
    
    if not all([brand, model, size, tire_type]):
        return jsonify({'error': 'Missing required fields: brand, model, size, type'}), 400
    
    # Validate text fields
    from app.utils.validators import validate_length
    if brand:
        if not validate_text(brand):
            return jsonify({'error': 'La marca contiene caracteres no permitidos'}), 400
        if not validate_length(brand, max_length=255):
            return jsonify({'error': 'La marca no puede exceder 255 caracteres'}), 400
    
    if model:
        if not validate_text(model):
            return jsonify({'error': 'El modelo contiene caracteres no permitidos'}), 400
        if not validate_length(model, max_length=255):
            return jsonify({'error': 'El modelo no puede exceder 255 caracteres'}), 400
    
    if tire_type:
        if not validate_text(tire_type):
            return jsonify({'error': 'El tipo contiene caracteres no permitidos'}), 400
        if not validate_length(tire_type, max_length=100):
            return jsonify({'error': 'El tipo no puede exceder 100 caracteres'}), 400
    
    width = size.get('width')
    aspect_ratio = size.get('aspectRatio')
    diameter = size.get('diameter')
    
    if width and not validate_number(width):
        return jsonify({'error': 'El ancho debe ser un número positivo'}), 400
    if aspect_ratio and not validate_number(aspect_ratio):
        return jsonify({'error': 'El perfil debe ser un número positivo'}), 400
    if diameter and not validate_number(diameter):
        return jsonify({'error': 'El diámetro debe ser un número positivo'}), 400
    
    if image_url and not validate_url(image_url):
        return jsonify({'error': 'La URL de imagen debe comenzar con http:// o https://'}), 400
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection error'}), 500
    
    try:
        cursor = conn.cursor()
        new_tire_id = tire_id or f"tire-{brand.lower()}-{model.lower().replace(' ', '-')}"
        
        cursor.execute("""
            INSERT INTO llantas (id, marca, modelo, ancho, relacion_aspecto, diametro, tipo, url_imagen, creado_en)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (new_tire_id, brand, model, width, aspect_ratio, diameter, tire_type, image_url,
              datetime.now(timezone.utc)))
        
        conn.commit()
        
        # Log change for audit
        from app.governance.audit import log_change
        from app.auth import get_current_user
        user = get_current_user()
        user_id = user.get('id') if user else None
        user_email = user.get('correo') if user else None
        
        new_tire_data = {
            'id': new_tire_id,
            'marca': brand,
            'modelo': model,
            'ancho': width,
            'relacion_aspecto': aspect_ratio,
            'diametro': diameter,
            'tipo': tire_type,
            'url_imagen': image_url
        }
        log_change(table='llantas', record_id=new_tire_id, action='INSERT',
                  user_id=user_id, user_email=user_email, new_data=new_tire_data)
        
        # Create version
        from app.governance.versioning import create_version
        create_version(table='llantas', record_id=new_tire_id, full_data=new_tire_data,
                      user_id=user_id, user_email=user_email, change_reason='Creación de llanta')
        
        # Get created tire
        cursor.execute("""
            SELECT id, marca, modelo, ancho, relacion_aspecto, diametro, tipo, url_imagen, creado_en
            FROM llantas WHERE id = %s
        """, (new_tire_id,))
        tire_data = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        return jsonify(tire_to_dict(tire_data)), 201
    
    except Exception as e:
        conn.rollback()
        cursor.close()
        conn.close()
        print(f"[CREATE_TIRE] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Error creating tire'}), 500

@tires_bp.route('/<tire_id>', methods=['PUT'])
@require_super_admin
def update_tire(tire_id):
    """Update a tire. Super admin only."""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection error'}), 500
    
    try:
        cursor = conn.cursor()
        
        # Check if tire exists
        cursor.execute("SELECT id FROM llantas WHERE id = %s", (tire_id,))
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'error': 'Tire not found'}), 404
        
        data = request.get_json()
        updates = []
        params = []
        
        if 'brand' in data:
            brand = data['brand']
            if brand and not validate_text(brand):
                cursor.close()
                conn.close()
                return jsonify({'error': 'La marca contiene caracteres no permitidos'}), 400
            updates.append("marca = %s")
            params.append(brand)
        
        if 'model' in data:
            model = data['model']
            if model and not validate_text(model):
                cursor.close()
                conn.close()
                return jsonify({'error': 'El modelo contiene caracteres no permitidos'}), 400
            updates.append("modelo = %s")
            params.append(model)
        
        if 'size' in data:
            size = data['size']
            if 'width' in size:
                width = size['width']
                if width and not validate_number(width):
                    cursor.close()
                    conn.close()
                    return jsonify({'error': 'El ancho debe ser un número positivo'}), 400
                updates.append("ancho = %s")
                params.append(width)
            if 'aspectRatio' in size:
                aspect_ratio = size['aspectRatio']
                if aspect_ratio and not validate_number(aspect_ratio):
                    cursor.close()
                    conn.close()
                    return jsonify({'error': 'El perfil debe ser un número positivo'}), 400
                updates.append("relacion_aspecto = %s")
                params.append(aspect_ratio)
            if 'diameter' in size:
                diameter = size['diameter']
                if diameter and not validate_number(diameter):
                    cursor.close()
                    conn.close()
                    return jsonify({'error': 'El diámetro debe ser un número positivo'}), 400
                updates.append("diametro = %s")
                params.append(diameter)
        
        if 'type' in data:
            updates.append("tipo = %s")
            params.append(data['type'])
        
        if 'imageUrl' in data:
            image_url = data['imageUrl']
            if image_url and not validate_url(image_url):
                cursor.close()
                conn.close()
                return jsonify({'error': 'La URL de imagen debe comenzar con http:// o https://'}), 400
            updates.append("url_imagen = %s")
            params.append(image_url)
        
        if updates:
            # Get old data before update
            cursor.execute("""
                SELECT id, marca, modelo, ancho, relacion_aspecto, diametro, tipo, url_imagen, creado_en
                FROM llantas WHERE id = %s
            """, (tire_id,))
            old_tire_data = cursor.fetchone()
            
            params.append(tire_id)
            cursor.execute(f"UPDATE llantas SET {', '.join(updates)} WHERE id = %s", params)
            conn.commit()
            
            # Get new data after update
            cursor.execute("""
                SELECT id, marca, modelo, ancho, relacion_aspecto, diametro, tipo, url_imagen, creado_en
                FROM llantas WHERE id = %s
            """, (tire_id,))
            new_tire_data = cursor.fetchone()
            
            # Log change for audit
            from app.governance.audit import log_change
            from app.governance.versioning import create_version
            from app.auth import get_current_user
            current_user = get_current_user()
            user_id = current_user.get('id') if current_user else None
            user_email = current_user.get('correo') if current_user else None
            
            log_change(table='llantas', record_id=tire_id, action='UPDATE',
                      user_id=user_id, user_email=user_email,
                      old_data=old_tire_data, new_data=new_tire_data)
            
            # Create version
            create_version(table='llantas', record_id=tire_id, full_data=new_tire_data,
                          user_id=user_id, user_email=user_email, change_reason='Actualización de llanta')
        
        # Get updated tire
        cursor.execute("""
            SELECT id, marca, modelo, ancho, relacion_aspecto, diametro, tipo, url_imagen, creado_en
            FROM llantas WHERE id = %s
        """, (tire_id,))
        tire_data = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        return jsonify(tire_to_dict(tire_data)), 200
    
    except Exception as e:
        conn.rollback()
        cursor.close()
        conn.close()
        print(f"[UPDATE_TIRE] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Error updating tire'}), 500

@tires_bp.route('/<tire_id>', methods=['DELETE'])
@require_super_admin
def delete_tire(tire_id):
    """Delete a tire. Super admin only."""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection error'}), 500
    
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM llantas WHERE id = %s", (tire_id,))
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'error': 'Tire not found'}), 404
        
        cursor.execute("DELETE FROM llantas WHERE id = %s", (tire_id,))
        conn.commit()
        cursor.close()
        conn.close()
        
        return '', 204
    
    except Exception as e:
        conn.rollback()
        cursor.close()
        conn.close()
        print(f"[DELETE_TIRE] Error: {str(e)}")
        return jsonify({'error': 'Error deleting tire'}), 500
