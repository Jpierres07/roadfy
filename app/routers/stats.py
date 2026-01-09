from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from datetime import datetime
from app.db import get_db_connection
from app.auth import get_current_user

stats_bp = Blueprint('stats', __name__)

@stats_bp.route('/dashboard', methods=['GET'])
@jwt_required()
def get_dashboard_stats():
    """Get dashboard statistics. Requires authentication."""
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Authentication required'}), 401
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection error'}), 500
    
    try:
        cursor = conn.cursor()
        user_role = user.get('role')
        
        if user_role == 'super-admin':
            # Super admin stats
            cursor.execute("SELECT COUNT(*) as count FROM llantas")
            total_tires = cursor.fetchone()['count']
            
            cursor.execute("SELECT COUNT(*) as count FROM negocios_llantas")
            total_businesses = cursor.fetchone()['count']
            
            cursor.execute("SELECT COUNT(*) as count FROM items_inventario")
            total_inventory_items = cursor.fetchone()['count']
            
            cursor.execute("SELECT SUM(precio * cantidad) as total FROM items_inventario")
            total_inventory_value = cursor.fetchone()['total'] or 0
            
            cursor.execute("SELECT COUNT(*) as count FROM usuarios")
            total_users = cursor.fetchone()['count']
            
            cursor.close()
            conn.close()
            
            return jsonify({
                'total_tires': total_tires,
                'total_businesses': total_businesses,
                'total_inventory_items': total_inventory_items,
                'total_inventory_value': float(total_inventory_value),
                'total_users': total_users,
            }), 200
        
        elif user_role == 'business-admin' and user.get('business_id'):
            # Business admin stats
            business_id = user.get('business_id')
            cursor.execute("""
                SELECT llanta_id, cantidad, precio
                FROM items_inventario
                WHERE negocio_id = %s
            """, (business_id,))
            inventory_data = cursor.fetchall()
            
            total_items = len(inventory_data)
            total_quantity = sum(item['cantidad'] for item in inventory_data)
            total_value = sum(item['precio'] * item['cantidad'] for item in inventory_data)
            unique_tires = len(set(item['llanta_id'] for item in inventory_data))
            low_stock_items = [item for item in inventory_data if item['cantidad'] < 10]
            
            cursor.close()
            conn.close()
            
            return jsonify({
                'total_items': total_items,
                'total_quantity': total_quantity,
                'total_value': float(total_value),
                'unique_tires': unique_tires,
                'low_stock_count': len(low_stock_items),
                'low_stock_items': [
                    {
                        'id': f"inv-{business_id}-{item['llanta_id']}",
                        'tire_id': item['llanta_id'],
                        'quantity': item['cantidad'],
                        'price': float(item['precio'])
                    }
                    for item in low_stock_items[:10]
                ]
            }), 200
        
        cursor.close()
        conn.close()
        return jsonify({'error': 'No stats available for this user'}), 403
    
    except Exception as e:
        cursor.close()
        conn.close()
        print(f"[GET_DASHBOARD_STATS] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Error retrieving stats'}), 500

@stats_bp.route('/popular-tires', methods=['GET'])
def get_popular_tires():
    """Get most popular tires (by total quantity in inventory). Public endpoint."""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection error'}), 500
    
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT llanta_id, SUM(cantidad) as total_quantity
            FROM items_inventario
            GROUP BY llanta_id
            ORDER BY total_quantity DESC
            LIMIT 10
        """)
        tire_counts = cursor.fetchall()
        
        if not tire_counts:
            cursor.close()
            conn.close()
            return jsonify([]), 200
        
        tire_ids = [t['llanta_id'] for t in tire_counts]
        placeholders = ','.join(['%s'] * len(tire_ids))
        
        cursor.execute(f"""
            SELECT id, marca, modelo, tipo
            FROM llantas
            WHERE id IN ({placeholders})
        """, tire_ids)
        tires_data = cursor.fetchall()
        
        tire_dict = {t['id']: t for t in tires_data}
        quantity_dict = {t['llanta_id']: int(t['total_quantity']) for t in tire_counts}
        
        # Sort by quantity
        sorted_tires = sorted(
            [tire_dict[tid] for tid in tire_ids if tid in tire_dict],
            key=lambda t: quantity_dict.get(t['id'], 0),
            reverse=True
        )
        
        cursor.close()
        conn.close()
        
        return jsonify([{
            'id': tire['id'],
            'brand': tire.get('marca', ''),
            'model': tire.get('modelo', ''),
            'type': tire.get('tipo', ''),
            'total_quantity': quantity_dict.get(tire['id'], 0)
        } for tire in sorted_tires]), 200
    
    except Exception as e:
        cursor.close()
        conn.close()
        print(f"[GET_POPULAR_TIRES] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Error retrieving popular tires'}), 500

@stats_bp.route('/reports/most-searched-tires', methods=['GET'])
@jwt_required()
def get_most_searched_tires():
    """Get most searched tires by inventory count. Admin only."""
    user = get_current_user()
    if not user or user.get('role') != 'super-admin':
        return jsonify({'error': 'Super admin access required'}), 403
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection error'}), 500
    
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT llanta_id, COUNT(id) as inventory_count, SUM(cantidad) as total_quantity
            FROM items_inventario
            GROUP BY llanta_id
            ORDER BY inventory_count DESC
            LIMIT 10
        """)
        tire_counts = cursor.fetchall()
        
        if not tire_counts:
            cursor.close()
            conn.close()
            return jsonify([]), 200
        
        tire_ids = [t['llanta_id'] for t in tire_counts]
        placeholders = ','.join(['%s'] * len(tire_ids))
        
        cursor.execute(f"""
            SELECT id, marca, modelo
            FROM llantas
            WHERE id IN ({placeholders})
        """, tire_ids)
        tires_data = cursor.fetchall()
        
        tire_dict = {t['id']: t for t in tires_data}
        
        cursor.close()
        conn.close()
        
        return jsonify([{
            'id': tire_id,
            'brand': tire_dict.get(tire_id, {}).get('marca', ''),
            'model': tire_dict.get(tire_id, {}).get('modelo', ''),
            'inventory_count': int(count),
            'total_quantity': int(total_qty) if total_qty else 0
        } for tire_id, count, total_qty in [(t['llanta_id'], t['inventory_count'], t['total_quantity']) for t in tire_counts] if tire_id in tire_dict]), 200
    
    except Exception as e:
        cursor.close()
        conn.close()
        print(f"[GET_MOST_SEARCHED_TIRES] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Error retrieving stats'}), 500

@stats_bp.route('/reports/most-active-businesses', methods=['GET'])
@jwt_required()
def get_most_active_businesses():
    """Get most active businesses by inventory count. Admin only."""
    user = get_current_user()
    if not user or user.get('role') != 'super-admin':
        return jsonify({'error': 'Super admin access required'}), 403
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection error'}), 500
    
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT negocio_id, COUNT(id) as inventory_count, 
                   SUM(cantidad) as total_quantity,
                   SUM(precio * cantidad) as total_value
            FROM items_inventario
            GROUP BY negocio_id
            ORDER BY inventory_count DESC
            LIMIT 10
        """)
        business_counts = cursor.fetchall()
        
        if not business_counts:
            cursor.close()
            conn.close()
            return jsonify([]), 200
        
        business_ids = [b['negocio_id'] for b in business_counts]
        placeholders = ','.join(['%s'] * len(business_ids))
        
        cursor.execute(f"""
            SELECT id, nombre, calificacion
            FROM negocios_llantas
            WHERE id IN ({placeholders})
        """, business_ids)
        businesses_data = cursor.fetchall()
        
        business_dict = {b['id']: b for b in businesses_data}
        
        # Get review counts
        cursor.execute(f"""
            SELECT negocio_id, COUNT(id) as review_count
            FROM resenas
            WHERE negocio_id IN ({placeholders})
            GROUP BY negocio_id
        """, business_ids)
        review_counts = cursor.fetchall()
        review_dict = {r['negocio_id']: r['review_count'] for r in review_counts}
        
        cursor.close()
        conn.close()
        
        return jsonify([{
            'id': biz_id,
            'name': business_dict.get(biz_id, {}).get('nombre', ''),
            'inventory_count': int(count),
            'total_quantity': int(total_qty) if total_qty else 0,
            'total_value': float(total_val) if total_val else 0,
            'rating': float(business_dict.get(biz_id, {}).get('calificacion', 0)),
            'reviewCount': int(review_dict.get(biz_id, 0))
        } for biz_id, count, total_qty, total_val in [(b['negocio_id'], b['inventory_count'], b['total_quantity'], b['total_value']) for b in business_counts] if biz_id in business_dict]), 200
    
    except Exception as e:
        cursor.close()
        conn.close()
        print(f"[GET_MOST_ACTIVE_BUSINESSES] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Error retrieving stats'}), 500

@stats_bp.route('/reports/price-trends', methods=['GET'])
@jwt_required()
def get_price_trends():
    """Get price trends by tire type. Admin only."""
    user = get_current_user()
    if not user or user.get('role') != 'super-admin':
        return jsonify({'error': 'Super admin access required'}), 403
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection error'}), 500
    
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT t.tipo, 
                   AVG(i.precio) as avg_price,
                   MIN(i.precio) as min_price,
                   MAX(i.precio) as max_price,
                   COUNT(i.id) as count
            FROM items_inventario i
            INNER JOIN llantas t ON i.llanta_id = t.id
            GROUP BY t.tipo
        """)
        results = cursor.fetchall()
        cursor.close()
        conn.close()
        
        return jsonify([{
            'type': r['tipo'] or 'Unknown',
            'avg_price': float(r['avg_price']) if r['avg_price'] else 0,
            'min_price': float(r['min_price']) if r['min_price'] else 0,
            'max_price': float(r['max_price']) if r['max_price'] else 0,
            'count': int(r['count']) if r['count'] else 0
        } for r in results]), 200
    
    except Exception as e:
        cursor.close()
        conn.close()
        print(f"[GET_PRICE_TRENDS] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Error retrieving stats'}), 500

@stats_bp.route('/reports/inventory-by-type', methods=['GET'])
@jwt_required()
def get_inventory_by_type():
    """Get inventory distribution by tire type. Admin only."""
    user = get_current_user()
    if not user or user.get('role') != 'super-admin':
        return jsonify({'error': 'Super admin access required'}), 403
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection error'}), 500
    
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT t.tipo,
                   SUM(i.cantidad) as total_quantity,
                   COUNT(i.id) as item_count
            FROM items_inventario i
            INNER JOIN llantas t ON i.llanta_id = t.id
            GROUP BY t.tipo
        """)
        results = cursor.fetchall()
        cursor.close()
        conn.close()
        
        return jsonify([{
            'type': r['tipo'] or 'Unknown',
            'total_quantity': int(r['total_quantity']) if r['total_quantity'] else 0,
            'item_count': int(r['item_count']) if r['item_count'] else 0
        } for r in results]), 200
    
    except Exception as e:
        cursor.close()
        conn.close()
        print(f"[GET_INVENTORY_BY_TYPE] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Error retrieving stats'}), 500

@stats_bp.route('/reports/business-stats', methods=['GET'])
@jwt_required()
def get_business_stats():
    """Get business statistics. Business admin or super admin."""
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Authentication required'}), 401
    
    business_id = request.args.get('business_id')
    user_role = user.get('role')
    
    # Business admin can only see their own stats
    if user_role == 'business-admin':
        if not user.get('business_id'):
            return jsonify({'error': 'No business associated'}), 403
        business_id = user.get('business_id')
    elif user_role != 'super-admin':
        return jsonify({'error': 'Access denied'}), 403
    
    if not business_id:
        return jsonify({'error': 'business_id required'}), 400
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection error'}), 500
    
    try:
        cursor = conn.cursor()
        
        # Get business
        cursor.execute("""
            SELECT id, nombre, calificacion
            FROM negocios_llantas WHERE id = %s
        """, (business_id,))
        business_data = cursor.fetchone()
        
        if not business_data:
            cursor.close()
            conn.close()
            return jsonify({'error': 'Business not found'}), 404
        
        # Get inventory
        cursor.execute("""
            SELECT cantidad, precio
            FROM items_inventario
            WHERE negocio_id = %s
        """, (business_id,))
        inventory_data = cursor.fetchall()
        
        total_items = len(inventory_data)
        total_quantity = sum(item['cantidad'] for item in inventory_data)
        total_value = sum(item['precio'] * item['cantidad'] for item in inventory_data)
        unique_tires = len(set(item.get('llanta_id') for item in inventory_data if 'llanta_id' in item))
        avg_price = total_value / total_quantity if total_quantity > 0 else 0
        
        # Get reviews
        cursor.execute("""
            SELECT calificacion
            FROM resenas
            WHERE negocio_id = %s
        """, (business_id,))
        reviews_data = cursor.fetchall()
        
        review_count = len(reviews_data)
        avg_rating = sum(r['calificacion'] for r in reviews_data) / review_count if review_count > 0 else 0
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'business_id': business_id,
            'business_name': business_data['nombre'],
            'total_items': total_items,
            'total_quantity': total_quantity,
            'total_value': float(total_value),
            'unique_tires': unique_tires,
            'avg_price': float(avg_price),
            'review_count': review_count,
            'avg_rating': float(avg_rating),
            'rating': float(business_data['calificacion'] or 0)
        }), 200
    
    except Exception as e:
        cursor.close()
        conn.close()
        print(f"[GET_BUSINESS_STATS] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Error retrieving stats'}), 500

@stats_bp.route('/reports/inventory-over-time', methods=['GET'])
@jwt_required()
def get_inventory_over_time():
    """Get inventory changes over time. Admin only."""
    user = get_current_user()
    if not user or user.get('role') != 'super-admin':
        return jsonify({'error': 'Super admin access required'}), 403
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection error'}), 500
    
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT YEAR(creado_en) as year, MONTH(creado_en) as month,
                   COUNT(id) as item_count,
                   SUM(cantidad) as total_quantity
            FROM items_inventario
            GROUP BY YEAR(creado_en), MONTH(creado_en)
            ORDER BY year, month
        """)
        results = cursor.fetchall()
        cursor.close()
        conn.close()
        
        return jsonify([{
            'year': int(r['year']),
            'month': int(r['month']),
            'item_count': int(r['item_count']) if r['item_count'] else 0,
            'total_quantity': int(r['total_quantity']) if r['total_quantity'] else 0,
            'label': f"{int(r['month']):02d}/{int(r['year'])}"
        } for r in results]), 200
    
    except Exception as e:
        cursor.close()
        conn.close()
        print(f"[GET_INVENTORY_OVER_TIME] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Error retrieving stats'}), 500
