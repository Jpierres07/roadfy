from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.db import get_db_connection
from app.auth import get_current_user
from app.utils.serializers import review_to_dict
from datetime import datetime, timezone

reviews_bp = Blueprint('reviews', __name__)

@reviews_bp.route('', methods=['GET'])
def get_reviews():
    """Get reviews, optionally filtered by business_id. Public endpoint."""
    business_id = request.args.get('business_id')
    
    if not business_id:
        return jsonify({'error': 'business_id parameter is required'}), 400
    
    return get_business_reviews(business_id)

@reviews_bp.route('/business/<business_id>', methods=['GET'])
def get_business_reviews(business_id):
    """Get all reviews for a business. Public endpoint."""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection error'}), 500
    
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, negocio_id, usuario_id, nombre_usuario, avatar_usuario, 
                   calificacion, comentario, creado_en
            FROM resenas
            WHERE negocio_id = %s
            ORDER BY creado_en DESC
        """, (business_id,))
        reviews_data = cursor.fetchall()
        cursor.close()
        conn.close()
        
        return jsonify([review_to_dict(r) for r in reviews_data]), 200
    
    except Exception as e:
        cursor.close()
        conn.close()
        print(f"[GET_BUSINESS_REVIEWS] Error: {str(e)}")
        return jsonify({'error': 'Error retrieving reviews'}), 500

@reviews_bp.route('', methods=['POST'])
@jwt_required()
def create_review():
    """Create a new review. Requires authentication."""
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Authentication required'}), 401
    
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body is required'}), 400
    
    business_id = data.get('business_id')
    rating = data.get('rating')
    comment = data.get('comment', '')
    user_name = data.get('user_name', user.get('correo', '').split('@')[0])
    user_avatar = data.get('user_avatar')
    
    if not all([business_id, rating]):
        return jsonify({'error': 'business_id and rating are required'}), 400
    
    # Validate business_id format
    from app.utils.validators import validate_id_format, validate_rating, validate_length, validate_url
    if not validate_id_format(business_id):
        return jsonify({'error': 'Invalid business_id format'}), 400
    
    # Validate rating
    if not validate_rating(rating):
        return jsonify({'error': 'Rating must be between 1 and 5'}), 400
    
    # Validate comment length
    if comment and not validate_length(comment, max_length=2000):
        return jsonify({'error': 'Comment must not exceed 2000 characters'}), 400
    
    # Validate user_name length
    if user_name and not validate_length(user_name, max_length=255):
        return jsonify({'error': 'User name must not exceed 255 characters'}), 400
    
    # Validate user_avatar URL if provided
    if user_avatar and not validate_url(user_avatar):
        return jsonify({'error': 'User avatar must be a valid URL'}), 400
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection error'}), 500
    
    try:
        cursor = conn.cursor()
        user_id = user.get('id')
        
        # Check if user already reviewed this business
        cursor.execute("""
            SELECT id FROM reseñas
            WHERE negocio_id = %s AND usuario_id = %s
        """, (business_id, user_id))
        if cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'error': 'You have already reviewed this business'}), 400
        
        # Create review
        review_id = f"review-{business_id}-{user_id}"
        cursor.execute("""
            INSERT INTO resenas (id, negocio_id, usuario_id, nombre_usuario, avatar_usuario, 
                                calificacion, comentario, creado_en)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (review_id, business_id, user_id, user_name, user_avatar, rating, comment,
              datetime.now(timezone.utc)))
        
        # Log change for audit
        from app.governance.audit import log_change
        user_email = user.get('correo') if user else None
        
        new_review_data = {
            'id': review_id,
            'negocio_id': business_id,
            'usuario_id': user_id,
            'calificacion': rating,
            'comentario': comment
        }
        log_change(table='resenas', record_id=review_id, action='INSERT',
                  user_id=user_id, user_email=user_email, new_data=new_review_data)
        
        # Update business rating
        cursor.execute("""
            SELECT calificacion, cantidad_resenas
            FROM negocios_llantas WHERE id = %s
        """, (business_id,))
        business_data = cursor.fetchone()
        
        if business_data:
            current_rating = float(business_data['calificacion'] or 0)
            current_count = int(business_data['cantidad_resenas'] or 0)
            new_count = current_count + 1
            new_rating = round((current_rating * current_count + rating) / new_count, 1)
            
            cursor.execute("""
                UPDATE negocios_llantas
                SET calificacion = %s, cantidad_resenas = %s
                WHERE id = %s
            """, (new_rating, new_count, business_id))
        
        conn.commit()
        
        # Get created review
        cursor.execute("""
            SELECT id, negocio_id, usuario_id, nombre_usuario, avatar_usuario, 
                   calificacion, comentario, creado_en
            FROM resenas WHERE id = %s
        """, (review_id,))
        review_data = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        return jsonify(review_to_dict(review_data)), 201
    
    except Exception as e:
        conn.rollback()
        cursor.close()
        conn.close()
        print(f"[CREATE_REVIEW] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Error creating review'}), 500

@reviews_bp.route('/<review_id>', methods=['DELETE'])
@jwt_required()
def delete_review(review_id):
    """Delete a review. Only the author can delete their review."""
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Authentication required'}), 401
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection error'}), 500
    
    try:
        cursor = conn.cursor()
        user_id = user.get('id')
        
        # Get review
        cursor.execute("""
            SELECT id, negocio_id, usuario_id, calificacion
            FROM resenas WHERE id = %s
        """, (review_id,))
        review_data = cursor.fetchone()
        
        if not review_data:
            cursor.close()
            conn.close()
            return jsonify({'error': 'Review not found'}), 404
        
        if review_data['usuario_id'] != user_id:
            cursor.close()
            conn.close()
            return jsonify({'error': 'You can only delete your own reviews'}), 403
        
        business_id = review_data['negocio_id']
        rating = review_data['calificacion']
        
        # Get full data before delete
        cursor.execute("""
            SELECT id, negocio_id, usuario_id, nombre_usuario, avatar_usuario, 
                   calificacion, comentario, creado_en
            FROM resenas WHERE id = %s
        """, (review_id,))
        old_review_data = cursor.fetchone()
        
        # Delete review
        cursor.execute("DELETE FROM resenas WHERE id = %s", (review_id,))
        
        # Log change for audit
        from app.governance.audit import log_change
        user_email = user.get('correo') if user else None
        
        log_change(table='resenas', record_id=review_id, action='DELETE',
                  user_id=user_id, user_email=user_email, old_data=old_review_data)
        
        # Update business rating
        cursor.execute("""
            SELECT calificacion, cantidad_resenas
            FROM negocios_llantas WHERE id = %s
        """, (business_id,))
        business_data = cursor.fetchone()
        
        if business_data:
            current_rating = float(business_data['calificacion'] or 0)
            current_count = int(business_data['cantidad_resenas'] or 0)
            
            if current_count > 1:
                new_count = current_count - 1
                new_rating = round((current_rating * current_count - rating) / new_count, 1)
            else:
                new_rating = 0.0
                new_count = 0
            
            cursor.execute("""
                UPDATE negocios_llantas
                SET calificacion = %s, cantidad_resenas = %s
                WHERE id = %s
            """, (new_rating, new_count, business_id))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return '', 204
    
    except Exception as e:
        conn.rollback()
        cursor.close()
        conn.close()
        print(f"[DELETE_REVIEW] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Error deleting review'}), 500
