"""
Sistema de Versionado de Datos
"""
from app.db import get_db_connection
from datetime import datetime, timezone
import uuid
import json


def create_version(table, record_id, full_data, user_id=None, 
                  user_email=None, change_reason=None):
    """
    Crea una nueva versión de un registro.
    
    Args:
        table: Nombre de la tabla
        record_id: ID del registro
        full_data: Datos completos del registro (dict)
        user_id: ID del usuario que crea la versión
        user_email: Email del usuario
        change_reason: Motivo del cambio
    """
    conn = get_db_connection()
    if not conn:
        return False
    
    try:
        cursor = conn.cursor()
        
        # Obtener la versión actual más alta
        cursor.execute("""
            SELECT MAX(version) as max_version
            FROM historial_versiones
            WHERE tabla = %s AND registro_id = %s
        """, (table, record_id))
        
        result = cursor.fetchone()
        next_version = (result['max_version'] or 0) + 1
        
        version_id = f"ver-{uuid.uuid4().hex[:12]}"
        full_data_json = json.dumps(full_data) if full_data else None
        
        cursor.execute("""
            INSERT INTO historial_versiones
            (id, tabla, registro_id, version, datos_completos, usuario_id,
             usuario_email, motivo_cambio, creado_en)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (version_id, table, record_id, next_version, full_data_json,
              user_id, user_email, change_reason, datetime.now(timezone.utc)))
        
        conn.commit()
        cursor.close()
        conn.close()
        return True
    except Exception as e:
        print(f"[VERSIONING] Error creating version: {str(e)}")
        if conn:
            conn.rollback()
            cursor.close()
            conn.close()
        return False


def get_versions(table, record_id, limit=10):
    """
    Obtiene el historial de versiones de un registro.
    
    Args:
        table: Nombre de la tabla
        record_id: ID del registro
        limit: Número máximo de versiones a retornar
    """
    conn = get_db_connection()
    if not conn:
        return []
    
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM historial_versiones
            WHERE tabla = %s AND registro_id = %s
            ORDER BY version DESC
            LIMIT %s
        """, (table, record_id, limit))
        
        results = cursor.fetchall()
        cursor.close()
        conn.close()
        
        # Parsear JSON de datos_completos
        for result in results:
            if result.get('datos_completos'):
                try:
                    result['datos_completos'] = json.loads(result['datos_completos'])
                except:
                    pass
        
        return results
    except Exception as e:
        print(f"[VERSIONING] Error getting versions: {str(e)}")
        if conn:
            cursor.close()
            conn.close()
        return []


def get_version(table, record_id, version):
    """
    Obtiene una versión específica de un registro.
    
    Args:
        table: Nombre de la tabla
        record_id: ID del registro
        version: Número de versión
    """
    conn = get_db_connection()
    if not conn:
        return None
    
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM historial_versiones
            WHERE tabla = %s AND registro_id = %s AND version = %s
        """, (table, record_id, version))
        
        result = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if result and result.get('datos_completos'):
            try:
                result['datos_completos'] = json.loads(result['datos_completos'])
            except:
                pass
        
        return result
    except Exception as e:
        print(f"[VERSIONING] Error getting version: {str(e)}")
        if conn:
            cursor.close()
            conn.close()
        return None
