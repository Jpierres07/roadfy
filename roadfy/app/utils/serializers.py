"""
Utilidades de serialización para convertir datos de BD a diccionarios.
"""


def tire_to_dict(tire):
    """Convert tire dict/row to dictionary."""
    if isinstance(tire, dict):
        # Ya es un diccionario
        return {
            'id': tire.get('id'),
            'brand': tire.get('marca') or tire.get('brand', ''),
            'model': tire.get('modelo') or tire.get('model', ''),
            'size': {
                'width': tire.get('ancho') or tire.get('width'),
                'aspectRatio': tire.get('relacion_aspecto') or tire.get('aspect_ratio'),
                'diameter': tire.get('diametro') or tire.get('diameter')
            },
            'type': tire.get('tipo') or tire.get('type', ''),
            'imageUrl': tire.get('url_imagen') or tire.get('image_url'),
            'created_at': tire.get('creado_en').isoformat() if tire.get('creado_en') else None
        }
    else:
        # Objeto con atributos
        return {
            'id': getattr(tire, 'id', ''),
            'brand': getattr(tire, 'marca', '') or getattr(tire, 'brand', ''),
            'model': getattr(tire, 'modelo', '') or getattr(tire, 'model', ''),
            'size': {
                'width': getattr(tire, 'ancho', None) or getattr(tire, 'width', None),
                'aspectRatio': getattr(tire, 'relacion_aspecto', None) or getattr(tire, 'aspect_ratio', None),
                'diameter': getattr(tire, 'diametro', None) or getattr(tire, 'diameter', None)
            },
            'type': getattr(tire, 'tipo', '') or getattr(tire, 'type', ''),
            'imageUrl': getattr(tire, 'url_imagen', None) or getattr(tire, 'image_url', None),
            'created_at': getattr(tire, 'creado_en', None).isoformat() if getattr(tire, 'creado_en', None) else None
        }


def business_to_dict(business):
    """Convert business dict/row to dictionary."""
    if not business:
        return None
    
    if isinstance(business, dict):
        email = business.get('correo') or business.get('email', '')
        return {
            'id': business.get('id', ''),
            'name': business.get('nombre') or business.get('name', ''),
            'address': business.get('direccion') or business.get('address', ''),
            'contact': {
                'phone': business.get('telefono') or business.get('phone', ''),
                'email': email
            },
            'hours': business.get('horarios') or business.get('hours', ''),
            'rating': float(business.get('calificacion') or business.get('rating') or 0.0),
            'reviewCount': int(business.get('cantidad_resenas') or business.get('review_count') or 0),
            'description': business.get('descripcion') or business.get('description'),
            'googleMapsEmbedUrl': business.get('url_mapa_google') or business.get('google_maps_embed_url'),
            'imageUrl': business.get('url_imagen') or business.get('image_url'),
            'socials': business.get('redes_sociales') or business.get('socials'),
            'created_at': business.get('creado_en').isoformat() if business.get('creado_en') else None
        }
    else:
        email = getattr(business, 'correo', None) or getattr(business, 'email', '')
        return {
            'id': getattr(business, 'id', ''),
            'name': getattr(business, 'nombre', '') or getattr(business, 'name', ''),
            'address': getattr(business, 'direccion', '') or getattr(business, 'address', ''),
            'contact': {
                'phone': getattr(business, 'telefono', '') or getattr(business, 'phone', ''),
                'email': email
            },
            'hours': getattr(business, 'horarios', '') or getattr(business, 'hours', ''),
            'rating': float(getattr(business, 'calificacion', 0) or getattr(business, 'rating', 0)),
            'reviewCount': int(getattr(business, 'cantidad_resenas', 0) or getattr(business, 'review_count', 0)),
            'description': getattr(business, 'descripcion', None) or getattr(business, 'description', None),
            'googleMapsEmbedUrl': getattr(business, 'url_mapa_google', None) or getattr(business, 'google_maps_embed_url', None),
            'imageUrl': getattr(business, 'url_imagen', None) or getattr(business, 'image_url', None),
            'socials': getattr(business, 'redes_sociales', None) or getattr(business, 'socials', None),
            'created_at': getattr(business, 'creado_en', None).isoformat() if getattr(business, 'creado_en', None) else None
        }


def user_to_dict(user):
    """Convert user dict/row to dictionary."""
    if isinstance(user, dict):
        return {
            'id': user.get('id'),
            'email': user.get('correo') or user.get('email', ''),
            'role': user.get('rol') or user.get('role', ''),  # BD: rol, código: role
            'business_id': user.get('negocio_id') or user.get('business_id'),  # BD: negocio_id, código: business_id
            'business_application_status': user.get('estado_solicitud_negocio') or user.get('business_application_status'),  # BD: estado_solicitud_negocio
            'created_at': user.get('creado_en').isoformat() if user.get('creado_en') else None
        }
    else:
        return {
            'id': getattr(user, 'id', ''),
            'email': getattr(user, 'correo', '') or getattr(user, 'email', ''),
            'role': getattr(user, 'rol', '') or getattr(user, 'role', ''),
            'business_id': getattr(user, 'negocio_id', None) or getattr(user, 'business_id', None),
            'business_application_status': getattr(user, 'estado_solicitud_negocio', None) or getattr(user, 'business_application_status', None),
            'created_at': getattr(user, 'creado_en', None).isoformat() if getattr(user, 'creado_en', None) else None
        }


def inventory_to_dict(item):
    """Convert inventory dict/row to dictionary."""
    if isinstance(item, dict):
        return {
            'id': item.get('id'),
            'business_id': item.get('negocio_id') or item.get('business_id'),
            'tire_id': item.get('llanta_id') or item.get('tire_id'),
            'quantity': item.get('cantidad') or item.get('quantity', 0),
            'price': float(item.get('precio') or item.get('price', 0)),
            'created_at': item.get('creado_en').isoformat() if item.get('creado_en') else None
        }
    else:
        return {
            'id': getattr(item, 'id', ''),
            'business_id': getattr(item, 'negocio_id', None) or getattr(item, 'business_id', None),
            'tire_id': getattr(item, 'llanta_id', None) or getattr(item, 'tire_id', None),
            'quantity': getattr(item, 'cantidad', 0) or getattr(item, 'quantity', 0),
            'price': float(getattr(item, 'precio', 0) or getattr(item, 'price', 0)),
            'created_at': getattr(item, 'creado_en', None).isoformat() if getattr(item, 'creado_en', None) else None
        }


def review_to_dict(review):
    """Convert review dict/row to dictionary."""
    if isinstance(review, dict):
        return {
            'id': review.get('id'),
            'business_id': review.get('negocio_id') or review.get('business_id'),
            'user_id': review.get('usuario_id') or review.get('user_id'),
            'user_name': review.get('nombre_usuario') or review.get('user_name', ''),
            'user_avatar': review.get('avatar_usuario') or review.get('user_avatar'),
            'rating': int(review.get('calificacion') or review.get('rating', 0)),
            'comment': review.get('comentario') or review.get('comment', ''),
            'created_at': review.get('creado_en').isoformat() if review.get('creado_en') else None
        }
    else:
        return {
            'id': getattr(review, 'id', ''),
            'business_id': getattr(review, 'negocio_id', None) or getattr(review, 'business_id', None),
            'user_id': getattr(review, 'usuario_id', None) or getattr(review, 'user_id', None),
            'user_name': getattr(review, 'nombre_usuario', '') or getattr(review, 'user_name', ''),
            'user_avatar': getattr(review, 'avatar_usuario', None) or getattr(review, 'user_avatar', None),
            'rating': int(getattr(review, 'calificacion', 0) or getattr(review, 'rating', 0)),
            'comment': getattr(review, 'comentario', '') or getattr(review, 'comment', ''),
            'created_at': getattr(review, 'creado_en', None).isoformat() if getattr(review, 'creado_en', None) else None
        }
