"""
Sistema de Auditoría de Cambios y Logs de Acceso
"""
from app.db import get_db_connection
from datetime import datetime, timezone
from flask import request
import uuid


def log_change(table, record_id, action, user_id=None, user_email=None, 
               old_data=None, new_data=None, field_changed=None, 
               old_value=None, new_value=None):
    """
    Registra un cambio en la base de datos.
    
    Args:
        table: Nombre de la tabla
        record_id: ID del registro modificado
        action: 'INSERT', 'UPDATE', o 'DELETE'
        user_id: ID del usuario que realizó el cambio
        user_email: Email del usuario
        old_data: Datos anteriores (dict o JSON)
        new_data: Datos nuevos (dict o JSON)
        field_changed: Campo específico modificado (opcional)
        old_value: Valor anterior del campo (opcional)
        new_value: Valor nuevo del campo (opcional)
    """
    conn = get_db_connection()
    if not conn:
        return False
    
    try:
        cursor = conn.cursor()
        audit_id = f"audit-{uuid.uuid4().hex[:12]}"
        
        # Obtener información de la solicitud
        ip_address = request.remote_addr if request else None
        user_agent = request.headers.get('User-Agent') if request else None
        
        # Convertir datos a JSON si son dicts
        import json
        old_data_json = json.dumps(old_data) if old_data else None
        new_data_json = json.dumps(new_data) if new_data else None
        
        cursor.execute("""
            INSERT INTO auditoria_cambios 
            (id, tabla, registro_id, accion, usuario_id, usuario_email, 
             datos_anteriores, datos_nuevos, campo_modificado, valor_anterior, 
             valor_nuevo, ip_address, user_agent, creado_en)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (audit_id, table, record_id, action, user_id, user_email,
              old_data_json, new_data_json, field_changed, old_value, new_value,
              ip_address, user_agent, datetime.now(timezone.utc)))
        
        conn.commit()
        cursor.close()
        conn.close()
        return True
    except Exception as e:
        print(f"[AUDIT] Error logging change: {str(e)}")
        if conn:
            conn.rollback()
            cursor.close()
            conn.close()
        return False


def log_access(user_id=None, user_email=None, access_type='LOGIN', 
               successful=True, error_message=None):
    """
    Registra un acceso al sistema (login, logout, etc.).
    
    Args:
        user_id: ID del usuario
        user_email: Email del usuario
        access_type: Tipo de acceso ('LOGIN', 'LOGOUT', 'LOGIN_FAILED', etc.)
        successful: Si el acceso fue exitoso
        error_message: Mensaje de error si falló
    """
    conn = get_db_connection()
    if not conn:
        return False
    
    try:
        cursor = conn.cursor()
        log_id = f"log-{uuid.uuid4().hex[:12]}"
        
        # Obtener información de la solicitud
        ip_address = request.remote_addr if request else None
        user_agent = request.headers.get('User-Agent') if request else None
        
        cursor.execute("""
            INSERT INTO logs_acceso 
            (id, usuario_id, usuario_email, tipo_acceso, ip_address, 
             user_agent, exitoso, mensaje_error, creado_en)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (log_id, user_id, user_email, access_type, ip_address, 
              user_agent, successful, error_message, datetime.now(timezone.utc)))
        
        conn.commit()
        cursor.close()
        conn.close()
        return True
    except Exception as e:
        print(f"[AUDIT] Error logging access: {str(e)}")
        if conn:
            conn.rollback()
            cursor.close()
            conn.close()
        return False


def get_audit_trail(table=None, record_id=None, user_id=None, 
                    action=None, limit=100, offset=0):
    """
    Obtiene el historial de auditoría.
    
    Args:
        table: Filtrar por tabla (opcional)
        record_id: Filtrar por ID de registro (opcional)
        user_id: Filtrar por usuario (opcional)
        action: Filtrar por acción (opcional)
        limit: Límite de resultados
        offset: Offset para paginación
    """
    conn = get_db_connection()
    if not conn:
        return []
    
    try:
        cursor = conn.cursor()
        conditions = []
        params = []
        
        if table:
            conditions.append("tabla = %s")
            params.append(table)
        if record_id:
            conditions.append("registro_id = %s")
            params.append(record_id)
        if user_id:
            conditions.append("usuario_id = %s")
            params.append(user_id)
        if action:
            conditions.append("accion = %s")
            params.append(action)
        
        where_clause = " AND ".join(conditions) if conditions else "1=1"
        params.extend([limit, offset])
        
        cursor.execute(f"""
            SELECT * FROM auditoria_cambios
            WHERE {where_clause}
            ORDER BY creado_en DESC
            LIMIT %s OFFSET %s
        """, params)
        
        results = cursor.fetchall()
        cursor.close()
        conn.close()
        
        return results
    except Exception as e:
        print(f"[AUDIT] Error getting audit trail: {str(e)}")
        if conn:
            cursor.close()
            conn.close()
        return []


def get_access_logs(user_id=None, access_type=None, successful=None, 
                   limit=100, offset=0):
    """
    Obtiene los logs de acceso.
    
    Args:
        user_id: Filtrar por usuario (opcional)
        access_type: Filtrar por tipo de acceso (opcional)
        successful: Filtrar por éxito (opcional)
        limit: Límite de resultados
        offset: Offset para paginación
    """
    conn = get_db_connection()
    if not conn:
        return []
    
    try:
        cursor = conn.cursor()
        conditions = []
        params = []
        
        if user_id:
            conditions.append("usuario_id = %s")
            params.append(user_id)
        if access_type:
            conditions.append("tipo_acceso = %s")
            params.append(access_type)
        if successful is not None:
            conditions.append("exitoso = %s")
            params.append(successful)
        
        where_clause = " AND ".join(conditions) if conditions else "1=1"
        params.extend([limit, offset])
        
        cursor.execute(f"""
            SELECT * FROM logs_acceso
            WHERE {where_clause}
            ORDER BY creado_en DESC
            LIMIT %s OFFSET %s
        """, params)
        
        results = cursor.fetchall()
        cursor.close()
        conn.close()
        
        return results
    except Exception as e:
        print(f"[AUDIT] Error getting access logs: {str(e)}")
        if conn:
            cursor.close()
            conn.close()
        return []
