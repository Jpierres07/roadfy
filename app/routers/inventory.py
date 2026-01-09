from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, verify_jwt_in_request
from app.db import get_db_connection
from app.auth import get_current_user
from app.utils.validators import validate_number
from app.utils.serializers import inventory_to_dict
from datetime import datetime, timezone

inventory_bp = Blueprint('inventory', __name__)

@inventory_bp.route('', methods=['GET'])
def get_inventory():
    """Get inventory items. Public when filtering by tire_id or no filters, requires auth for business_id filter."""
    try:
        business_id = request.args.get('business_id')
        tire_id = request.args.get('tire_id')
        skip = request.args.get('skip', 0, type=int)
        limit = request.args.get('limit', 100, type=int)
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection error'}), 500
        
        try:
            cursor = conn.cursor()
            
            # If filtering by tire_id, it's a public endpoint
            if tire_id:
                cursor.execute("""
                    SELECT id, negocio_id, llanta_id, cantidad, precio, creado_en
                    FROM items_inventario
                    WHERE llanta_id = %s AND cantidad > 0
                    ORDER BY precio ASC
                    LIMIT %s OFFSET %s
                """, (tire_id, limit, skip))
                items_data = cursor.fetchall()
                cursor.close()
                conn.close()
                return jsonify([inventory_to_dict(item) for item in items_data]), 200
            
            # If no filters, return all public inventory
            if not business_id:
                cursor.execute("""
                    SELECT id, negocio_id, llanta_id, cantidad, precio, creado_en
                    FROM items_inventario
                    WHERE cantidad > 0
                    ORDER BY creado_en DESC
                    LIMIT %s OFFSET %s
                """, (limit, skip))
                items_data = cursor.fetchall()
                cursor.close()
                conn.close()
                return jsonify([inventory_to_dict(item) for item in items_data]), 200
            
            # For business_id filter, require authentication
            try:
                verify_jwt_in_request()
                user = get_current_user()
                if not user:
                    cursor.close()
                    conn.close()
                    return jsonify({'error': 'Authentication required'}), 401
                
                user_role = user.get('role')
                # Business admins can only see their own business inventory
                if user_role == 'business-admin':
                    user_business_id = user.get('business_id')
                    if user_business_id:
                        cursor.execute("""
                            SELECT id, negocio_id, llanta_id, cantidad, precio, creado_en
                            FROM items_inventario
                            WHERE negocio_id = %s
                            ORDER BY creado_en DESC
                            LIMIT %s OFFSET %s
                        """, (user_business_id, limit, skip))
                    else:
                        cursor.close()
                        conn.close()
                        return jsonify([]), 200
                else:
                    cursor.execute("""
                        SELECT id, negocio_id, llanta_id, cantidad, precio, creado_en
                        FROM items_inventario
                        WHERE negocio_id = %s
                        ORDER BY creado_en DESC
                        LIMIT %s OFFSET %s
                    """, (business_id, limit, skip))
                
                items_data = cursor.fetchall()
                cursor.close()
                conn.close()
                return jsonify([inventory_to_dict(item) for item in items_data]), 200
            except:
                cursor.close()
                conn.close()
                return jsonify({'error': 'Authentication required for this query'}), 401
        
        except Exception as e:
            cursor.close()
            conn.close()
            raise e
    
    except Exception as e:
        import traceback
        error_msg = traceback.format_exc()
        print(f"Error in get_inventory: {error_msg}")
        return jsonify({'error': str(e), 'details': error_msg}), 500

@inventory_bp.route('/business/<business_id>', methods=['GET'])
def get_business_inventory(business_id):
    """Get inventory for a specific business. Public endpoint for viewing."""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection error'}), 500
    
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, negocio_id, llanta_id, cantidad, precio, creado_en
            FROM items_inventario
            WHERE negocio_id = %s AND cantidad > 0
            ORDER BY creado_en DESC
        """, (business_id,))
        items_data = cursor.fetchall()
        cursor.close()
        conn.close()
        
        return jsonify([inventory_to_dict(item) for item in items_data]), 200
    except Exception as e:
        cursor.close()
        conn.close()
        import traceback
        error_msg = traceback.format_exc()
        print(f"Error in get_business_inventory: {error_msg}")
        return jsonify({'error': str(e), 'details': error_msg}), 500

@inventory_bp.route('/<inventory_id>', methods=['GET'])
def get_inventory_item(inventory_id):
    """Get a specific inventory item. Public endpoint."""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection error'}), 500
    
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, negocio_id, llanta_id, cantidad, precio, creado_en
            FROM items_inventario
            WHERE id = %s
        """, (inventory_id,))
        item_data = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if not item_data:
            return jsonify({'error': 'Inventory item not found'}), 404
        
        # Only show if quantity > 0 for public access
        if item_data['cantidad'] <= 0:
            return jsonify({'error': 'Inventory item not available'}), 404
        
        return jsonify(inventory_to_dict(item_data)), 200
    
    except Exception as e:
        cursor.close()
        conn.close()
        print(f"[GET_INVENTORY_ITEM] Error: {str(e)}")
        return jsonify({'error': 'Error retrieving inventory item'}), 500

@inventory_bp.route('', methods=['POST'])
@jwt_required()
def create_inventory_item():
    """Create an inventory item. Business admin or super admin only."""
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Authentication required'}), 401
    
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body is required'}), 400
    
    business_id = data.get('business_id')
    tire_id = data.get('tire_id')
    quantity = data.get('quantity', 0)
    price = data.get('price')
    
    if not all([business_id, tire_id, price]):
        return jsonify({'error': 'Missing required fields: business_id, tire_id, price'}), 400
    
    # Validate ID formats
    from app.utils.validators import validate_id_format
    if not validate_id_format(business_id):
        return jsonify({'error': 'Invalid business_id format'}), 400
    if not validate_id_format(tire_id):
        return jsonify({'error': 'Invalid tire_id format'}), 400
    
    # Validate numbers
    if quantity is not None:
        if not validate_number(quantity):
            return jsonify({'error': 'La cantidad debe ser un número positivo o cero'}), 400
        # Validate quantity range
        try:
            qty = int(quantity)
            if qty < 0 or qty > 999999:
                return jsonify({'error': 'La cantidad debe estar entre 0 y 999,999'}), 400
        except (ValueError, TypeError):
            return jsonify({'error': 'La cantidad debe ser un número entero'}), 400
    
    if price is not None:
        if not validate_number(price, allow_decimal=True):
            return jsonify({'error': 'El precio debe ser un número positivo o cero'}), 400
        # Validate price range
        try:
            price_float = float(price)
            if price_float < 0 or price_float > 999999.99:
                return jsonify({'error': 'El precio debe estar entre 0 y 999,999.99'}), 400
        except (ValueError, TypeError):
            return jsonify({'error': 'El precio debe ser un número válido'}), 400
    
    # Check permissions
    user_role = user.get('role')
    if user_role == 'business-admin':
        if user.get('business_id') != business_id:
            return jsonify({'error': 'You can only add inventory to your own business'}), 403
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection error'}), 500
    
    try:
        cursor = conn.cursor()
        
        # Check if item already exists
        cursor.execute("""
            SELECT id FROM items_inventario
            WHERE negocio_id = %s AND llanta_id = %s
        """, (business_id, tire_id))
        if cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'error': 'Inventory item already exists for this business and tire'}), 400
        
        # Create new item
        item_id = f"inv-{business_id}-{tire_id}"
        cursor.execute("""
            INSERT INTO items_inventario (id, negocio_id, llanta_id, cantidad, precio, creado_en)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (item_id, business_id, tire_id, quantity, price, datetime.now(timezone.utc)))
        
        conn.commit()
        
        # Log change for audit
        from app.governance.audit import log_change
        user_id = user.get('id') if user else None
        user_email = user.get('correo') if user else None
        
        new_item_data = {
            'id': item_id,
            'negocio_id': business_id,
            'llanta_id': tire_id,
            'cantidad': quantity,
            'precio': price
        }
        log_change(table='items_inventario', record_id=item_id, action='INSERT',
                  user_id=user_id, user_email=user_email, new_data=new_item_data)
        
        # Get created item
        cursor.execute("""
            SELECT id, negocio_id, llanta_id, cantidad, precio, creado_en
            FROM items_inventario WHERE id = %s
        """, (item_id,))
        item_data = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        return jsonify(inventory_to_dict(item_data)), 201
    
    except Exception as e:
        conn.rollback()
        cursor.close()
        conn.close()
        print(f"[CREATE_INVENTORY_ITEM] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Error creating inventory item'}), 500

@inventory_bp.route('/<inventory_id>', methods=['PUT'])
@jwt_required()
def update_inventory_item(inventory_id):
    """Update an inventory item. Business admin or super admin only."""
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Authentication required'}), 401
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection error'}), 500
    
    try:
        cursor = conn.cursor()
        
        # Get item
        cursor.execute("""
            SELECT id, negocio_id, llanta_id, cantidad, precio, creado_en
            FROM items_inventario WHERE id = %s
        """, (inventory_id,))
        item_data = cursor.fetchone()
        
        if not item_data:
            cursor.close()
            conn.close()
            return jsonify({'error': 'Inventory item not found'}), 404
        
        # Check permissions
        user_role = user.get('role')
        if user_role == 'business-admin':
            if user.get('business_id') != item_data['negocio_id']:
                cursor.close()
                conn.close()
                return jsonify({'error': 'You can only update inventory for your own business'}), 403
        
        data = request.get_json()
        updates = []
        params = []
        
        if 'quantity' in data:
            quantity = data['quantity']
            if quantity is not None and not validate_number(quantity):
                cursor.close()
                conn.close()
                return jsonify({'error': 'La cantidad debe ser un número positivo o cero'}), 400
            updates.append("cantidad = %s")
            params.append(quantity)
        
        if 'price' in data:
            price = data['price']
            if price is not None and not validate_number(price, allow_decimal=True):
                cursor.close()
                conn.close()
                return jsonify({'error': 'El precio debe ser un número positivo o cero'}), 400
            updates.append("precio = %s")
            params.append(price)
        
        if updates:
            # Get old data before update
            old_item_data = item_data.copy()
            
            params.append(inventory_id)
            cursor.execute(f"UPDATE items_inventario SET {', '.join(updates)} WHERE id = %s", params)
            conn.commit()
            
            # Get new data after update
            cursor.execute("""
                SELECT id, negocio_id, llanta_id, cantidad, precio, creado_en
                FROM items_inventario WHERE id = %s
            """, (inventory_id,))
            new_item_data = cursor.fetchone()
            
            # Log change for audit
            from app.governance.audit import log_change
            user_id = user.get('id') if user else None
            user_email = user.get('correo') if user else None
            
            # Determine which field was changed
            field_changed = None
            old_value = None
            new_value = None
            if 'quantity' in data:
                field_changed = 'cantidad'
                old_value = old_item_data.get('cantidad')
                new_value = new_item_data.get('cantidad')
            elif 'price' in data:
                field_changed = 'precio'
                old_value = old_item_data.get('precio')
                new_value = new_item_data.get('precio')
            
            log_change(table='items_inventario', record_id=inventory_id, action='UPDATE',
                      user_id=user_id, user_email=user_email,
                      old_data=old_item_data, new_data=new_item_data,
                      field_changed=field_changed, old_value=str(old_value) if old_value is not None else None,
                      new_value=str(new_value) if new_value is not None else None)
        
        # Get updated item
        cursor.execute("""
            SELECT id, negocio_id, llanta_id, cantidad, precio, creado_en
            FROM items_inventario WHERE id = %s
        """, (inventory_id,))
        updated_item = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        return jsonify(inventory_to_dict(updated_item)), 200
    
    except Exception as e:
        conn.rollback()
        cursor.close()
        conn.close()
        print(f"[UPDATE_INVENTORY_ITEM] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Error updating inventory item'}), 500

@inventory_bp.route('/<inventory_id>', methods=['DELETE'])
@jwt_required()
def delete_inventory_item(inventory_id):
    """Delete an inventory item. Business admin or super admin only."""
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Authentication required'}), 401
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection error'}), 500
    
    try:
        cursor = conn.cursor()
        
        # Get item
        cursor.execute("""
            SELECT id, negocio_id FROM items_inventario WHERE id = %s
        """, (inventory_id,))
        item_data = cursor.fetchone()
        
        if not item_data:
            cursor.close()
            conn.close()
            return jsonify({'error': 'Inventory item not found'}), 404
        
        # Check permissions
        user_role = user.get('role')
        if user_role == 'business-admin':
            if user.get('business_id') != item_data['negocio_id']:
                cursor.close()
                conn.close()
                return jsonify({'error': 'You can only delete inventory for your own business'}), 403
        
        cursor.execute("DELETE FROM items_inventario WHERE id = %s", (inventory_id,))
        conn.commit()
        cursor.close()
        conn.close()
        
        return '', 204
    
    except Exception as e:
        conn.rollback()
        cursor.close()
        conn.close()
        print(f"[DELETE_INVENTORY_ITEM] Error: {str(e)}")
        return jsonify({'error': 'Error deleting inventory item'}), 500
