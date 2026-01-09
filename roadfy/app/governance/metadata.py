"""
Gestión de Metadatos de Datos
"""
from app.db import get_db_connection
from datetime import datetime, timezone
import uuid
import json


def update_metadata(table, record_id, field=None, data_quality='BUENA',
                   data_source=None, user_id=None, comments=None, tags=None):
    """
    Actualiza o crea metadatos para un registro.
    
    Args:
        table: Nombre de la tabla
        record_id: ID del registro
        field: Campo específico (opcional)
        data_quality: Calidad del dato ('EXCELENTE', 'BUENA', 'REGULAR', 'MALA', 'SIN_DATOS')
        data_source: Origen del dato
        user_id: ID del usuario que actualiza
        comments: Comentarios sobre el dato
        tags: Etiquetas (lista o dict)
    """
    conn = get_db_connection()
    if not conn:
        return False
    
    try:
        cursor = conn.cursor()
        
        # Verificar si ya existe
        cursor.execute("""
            SELECT id FROM metadatos_datos
            WHERE tabla = %s AND registro_id = %s AND campo = %s
        """, (table, record_id, field))
        
        existing = cursor.fetchone()
        
        tags_json = json.dumps(tags) if tags else None
        
        if existing:
            # Actualizar existente
            cursor.execute("""
                UPDATE metadatos_datos
                SET calidad_dato = %s, origen_dato = %s, ultima_actualizacion = %s,
                    ultimo_usuario_id = %s, comentarios = %s, etiquetas = %s,
                    actualizado_en = %s
                WHERE id = %s
            """, (data_quality, data_source, datetime.now(timezone.utc),
                  user_id, comments, tags_json, datetime.now(timezone.utc),
                  existing['id']))
        else:
            # Crear nuevo
            metadata_id = f"meta-{uuid.uuid4().hex[:12]}"
            cursor.execute("""
                INSERT INTO metadatos_datos
                (id, tabla, registro_id, campo, calidad_dato, origen_dato,
                 ultima_actualizacion, ultimo_usuario_id, comentarios, etiquetas,
                 creado_en, actualizado_en)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (metadata_id, table, record_id, field, data_quality, data_source,
                  datetime.now(timezone.utc), user_id, comments, tags_json,
                  datetime.now(timezone.utc), datetime.now(timezone.utc)))
        
        conn.commit()
        cursor.close()
        conn.close()
        return True
    except Exception as e:
        print(f"[METADATA] Error updating metadata: {str(e)}")
        if conn:
            conn.rollback()
            cursor.close()
            conn.close()
        return False


def get_metadata(table, record_id, field=None):
    """
    Obtiene metadatos de un registro.
    
    Args:
        table: Nombre de la tabla
        record_id: ID del registro
        field: Campo específico (opcional)
    """
    conn = get_db_connection()
    if not conn:
        return None
    
    try:
        cursor = conn.cursor()
        
        if field:
            cursor.execute("""
                SELECT * FROM metadatos_datos
                WHERE tabla = %s AND registro_id = %s AND campo = %s
            """, (table, record_id, field))
        else:
            cursor.execute("""
                SELECT * FROM metadatos_datos
                WHERE tabla = %s AND registro_id = %s
            """, (table, record_id))
        
        result = cursor.fetchone()
        cursor.close()
        conn.close()
        
        return result
    except Exception as e:
        print(f"[METADATA] Error getting metadata: {str(e)}")
        if conn:
            cursor.close()
            conn.close()
        return None


def get_data_quality_report(table=None):
    """
    Genera un reporte de calidad de datos.
    
    Args:
        table: Filtrar por tabla (opcional)
    """
    conn = get_db_connection()
    if not conn:
        return {}
    
    try:
        cursor = conn.cursor()
        
        if table:
            cursor.execute("""
                SELECT 
                    calidad_dato,
                    COUNT(*) as cantidad
                FROM metadatos_datos
                WHERE tabla = %s
                GROUP BY calidad_dato
            """, (table,))
        else:
            cursor.execute("""
                SELECT 
                    calidad_dato,
                    COUNT(*) as cantidad
                FROM metadatos_datos
                GROUP BY calidad_dato
            """)
        
        results = cursor.fetchall()
        cursor.close()
        conn.close()
        
        report = {
            'EXCELENTE': 0,
            'BUENA': 0,
            'REGULAR': 0,
            'MALA': 0,
            'SIN_DATOS': 0
        }
        
        for row in results:
            report[row['calidad_dato']] = row['cantidad']
        
        total = sum(report.values())
        report['total'] = total
        report['porcentaje_excelente'] = (report['EXCELENTE'] / total * 100) if total > 0 else 0
        report['porcentaje_buena'] = (report['BUENA'] / total * 100) if total > 0 else 0
        
        return report
    except Exception as e:
        print(f"[METADATA] Error getting quality report: {str(e)}")
        if conn:
            cursor.close()
            conn.close()
        return {}
