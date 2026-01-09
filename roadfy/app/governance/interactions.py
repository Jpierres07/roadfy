"""
Sistema de Tracking de Interacciones de Usuario
Registra clicks, vistas, búsquedas y otras interacciones
"""
from app.db import get_db_connection
from datetime import datetime, timezone, timedelta
from flask import request
import uuid
import json


def log_interaction(interaction_type, entity_type, entity_id, user_id=None, 
                   user_email=None, metadata=None):
    """
    Registra una interacción del usuario.
    
    Args:
        interaction_type: Tipo de interacción ('CLICK', 'VIEW', 'SEARCH', 'COMPARE', etc.)
        entity_type: Tipo de entidad ('TIRE', 'BUSINESS', 'PAGE', etc.)
        entity_id: ID de la entidad
        user_id: ID del usuario (opcional)
        user_email: Email del usuario (opcional)
        metadata: Información adicional (dict)
    """
    conn = get_db_connection()
    if not conn:
        return False
    
    try:
        cursor = conn.cursor()
        interaction_id = f"interaction-{uuid.uuid4().hex[:12]}"
        
        # Obtener información de la solicitud
        ip_address = request.remote_addr if request else None
        user_agent = request.headers.get('User-Agent') if request else None
        
        # Detectar dispositivo
        device_type = 'UNKNOWN'
        if user_agent:
            user_agent_lower = user_agent.lower()
            if 'mobile' in user_agent_lower or 'android' in user_agent_lower or 'iphone' in user_agent_lower:
                device_type = 'MOBILE'
            elif 'tablet' in user_agent_lower or 'ipad' in user_agent_lower:
                device_type = 'TABLET'
            else:
                device_type = 'DESKTOP'
        
        # Convertir metadata a JSON
        metadata_json = json.dumps(metadata) if metadata else None
        
        cursor.execute("""
            INSERT INTO interacciones_usuario 
            (id, tipo_interaccion, tipo_entidad, entidad_id, usuario_id, usuario_email, 
             metadata, ip_address, user_agent, dispositivo, creado_en)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (interaction_id, interaction_type, entity_type, entity_id, user_id, 
              user_email, metadata_json, ip_address, user_agent, device_type,
              datetime.now(timezone.utc)))
        
        conn.commit()
        cursor.close()
        conn.close()
        return True
    
    except Exception as e:
        if conn:
            try:
                conn.rollback()
                cursor.close()
                conn.close()
            except:
                pass
        error_msg = str(e)
        print(f"[LOG_INTERACTION] Error: {error_msg}")
        import traceback
        traceback.print_exc()
        
        # Si el error es que la tabla no existe, informar claramente
        if 'interacciones_usuario' in error_msg.lower() or 'table' in error_msg.lower() or 'doesn\'t exist' in error_msg.lower():
            print("[LOG_INTERACTION] ⚠️ La tabla 'interacciones_usuario' no existe.")
            print("[LOG_INTERACTION] Ejecuta el script SQL: crear_tabla_interacciones.sql")
        
        return False


def get_interaction_summary(days=30):
    """
    Obtiene un resumen de interacciones en los últimos N días.
    """
    conn = get_db_connection()
    if not conn:
        return {}
    
    try:
        cursor = conn.cursor()
        
        # Fechas
        fecha_fin = datetime.now(timezone.utc)
        fecha_inicio = fecha_fin - timedelta(days=days)
        
        # Resumen por tipo de interacción
        cursor.execute("""
            SELECT tipo_interaccion, COUNT(*) as cantidad
            FROM interacciones_usuario
            WHERE creado_en >= %s AND creado_en <= %s
            GROUP BY tipo_interaccion
            ORDER BY cantidad DESC
        """, (fecha_inicio, fecha_fin))
        resumen_interacciones = cursor.fetchall()
        
        # Resumen por tipo de entidad
        cursor.execute("""
            SELECT tipo_entidad, COUNT(*) as cantidad
            FROM interacciones_usuario
            WHERE creado_en >= %s AND creado_en <= %s
            GROUP BY tipo_entidad
            ORDER BY cantidad DESC
        """, (fecha_inicio, fecha_fin))
        resumen_entidades = cursor.fetchall()
        
        # Top llantas más vistas
        cursor.execute("""
            SELECT entidad_id, COUNT(*) as cantidad
            FROM interacciones_usuario
            WHERE tipo_entidad = 'TIRE' 
            AND tipo_interaccion IN ('CLICK', 'VIEW')
            AND creado_en >= %s AND creado_en <= %s
            GROUP BY entidad_id
            ORDER BY cantidad DESC
            LIMIT 10
        """, (fecha_inicio, fecha_fin))
        top_llantas = cursor.fetchall()
        
        # Top negocios más vistos
        cursor.execute("""
            SELECT entidad_id, COUNT(*) as cantidad
            FROM interacciones_usuario
            WHERE tipo_entidad = 'BUSINESS' 
            AND tipo_interaccion IN ('CLICK', 'VIEW')
            AND creado_en >= %s AND creado_en <= %s
            GROUP BY entidad_id
            ORDER BY cantidad DESC
            LIMIT 10
        """, (fecha_inicio, fecha_fin))
        top_negocios = cursor.fetchall()
        
        # Resumen por dispositivo
        cursor.execute("""
            SELECT dispositivo, COUNT(*) as cantidad
            FROM interacciones_usuario
            WHERE creado_en >= %s AND creado_en <= %s
            GROUP BY dispositivo
            ORDER BY cantidad DESC
        """, (fecha_inicio, fecha_fin))
        resumen_dispositivos = cursor.fetchall()
        
        # Total de búsquedas
        cursor.execute("""
            SELECT COUNT(*) as cantidad
            FROM interacciones_usuario
            WHERE tipo_interaccion = 'SEARCH'
            AND creado_en >= %s AND creado_en <= %s
        """, (fecha_inicio, fecha_fin))
        result = cursor.fetchone()
        total_busquedas = result['cantidad'] if result else 0
        
        # Total de comparaciones
        cursor.execute("""
            SELECT COUNT(*) as cantidad
            FROM interacciones_usuario
            WHERE tipo_interaccion = 'COMPARE'
            AND creado_en >= %s AND creado_en <= %s
        """, (fecha_inicio, fecha_fin))
        result = cursor.fetchone()
        total_comparaciones = result['cantidad'] if result else 0
        
        cursor.close()
        conn.close()
        
        return {
            'periodo_dias': days,
            'fecha_inicio': fecha_inicio.isoformat(),
            'fecha_fin': fecha_fin.isoformat(),
            'resumen_interacciones': [
                {'tipo': r['tipo_interaccion'], 'cantidad': r['cantidad']}
                for r in resumen_interacciones
            ],
            'resumen_entidades': [
                {'tipo': r['tipo_entidad'], 'cantidad': r['cantidad']}
                for r in resumen_entidades
            ],
            'top_llantas': [
                {'llanta_id': r['entidad_id'], 'vistas': r['cantidad']}
                for r in top_llantas
            ],
            'top_negocios': [
                {'negocio_id': r['entidad_id'], 'vistas': r['cantidad']}
                for r in top_negocios
            ],
            'resumen_dispositivos': [
                {'dispositivo': r['dispositivo'], 'cantidad': r['cantidad']}
                for r in resumen_dispositivos
            ],
            'total_busquedas': total_busquedas,
            'total_comparaciones': total_comparaciones
        }
    
    except Exception as e:
        if conn:
            try:
                if 'cursor' in locals():
                    cursor.close()
                conn.close()
            except:
                pass
        error_msg = str(e).lower()
        print(f"[GET_INTERACTION_SUMMARY] Error: {str(e)}")
        
        # Si la tabla no existe, retornar objeto vacío en lugar de error
        if any(keyword in error_msg for keyword in ['interacciones_usuario', 'table', "doesn't exist", "does not exist", "unknown table"]):
            print("[GET_INTERACTION_SUMMARY] ⚠️ La tabla 'interacciones_usuario' no existe.")
            print("[GET_INTERACTION_SUMMARY] Ejecuta el script SQL: crear_tabla_interacciones.sql")
            # Retornar estructura vacía pero válida
            fecha_fin = datetime.now(timezone.utc)
            fecha_inicio = fecha_fin - timedelta(days=days)
            return {
                'periodo_dias': days,
                'fecha_inicio': fecha_inicio.isoformat(),
                'fecha_fin': fecha_fin.isoformat(),
                'resumen_interacciones': [],
                'resumen_entidades': [],
                'top_llantas': [],
                'top_negocios': [],
                'resumen_dispositivos': [],
                'total_busquedas': 0,
                'total_comparaciones': 0
            }
        
        import traceback
        traceback.print_exc()
        # Retornar estructura vacía pero válida en caso de cualquier otro error
        fecha_fin = datetime.now(timezone.utc)
        fecha_inicio = fecha_fin - timedelta(days=days)
        return {
            'periodo_dias': days,
            'fecha_inicio': fecha_inicio.isoformat(),
            'fecha_fin': fecha_fin.isoformat(),
            'resumen_interacciones': [],
            'resumen_entidades': [],
            'top_llantas': [],
            'top_negocios': [],
            'resumen_dispositivos': [],
            'total_busquedas': 0,
            'total_comparaciones': 0
        }


def get_interactions(entity_type=None, entity_id=None, interaction_type=None, 
                    user_id=None, limit=100, offset=0):
    """
    Obtiene interacciones con filtros opcionales.
    """
    conn = get_db_connection()
    if not conn:
        return []
    
    try:
        cursor = conn.cursor()
        
        query = "SELECT * FROM interacciones_usuario WHERE 1=1"
        params = []
        
        if entity_type:
            query += " AND tipo_entidad = %s"
            params.append(entity_type)
        
        if entity_id:
            query += " AND entidad_id = %s"
            params.append(entity_id)
        
        if interaction_type:
            query += " AND tipo_interaccion = %s"
            params.append(interaction_type)
        
        if user_id:
            query += " AND usuario_id = %s"
            params.append(user_id)
        
        query += " ORDER BY creado_en DESC LIMIT %s OFFSET %s"
        params.extend([limit, offset])
        
        cursor.execute(query, params)
        results = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return results
    
    except Exception as e:
        if conn:
            try:
                cursor.close()
                conn.close()
            except:
                pass
        error_msg = str(e)
        print(f"[GET_INTERACTIONS] Error: {error_msg}")
        
        # Si la tabla no existe, retornar lista vacía
        if 'interacciones_usuario' in error_msg.lower() or 'table' in error_msg.lower() or 'doesn\'t exist' in error_msg.lower():
            print("[GET_INTERACTIONS] ⚠️ La tabla 'interacciones_usuario' no existe.")
            return []
        
        import traceback
        traceback.print_exc()
        return []
