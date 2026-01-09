"""
Generación de Reportes de Gobierno de Datos
"""
from app.db import get_db_connection
from datetime import datetime, timezone, timedelta
import uuid
import json


def generate_governance_report(report_type, title, description=None,
                              generated_by=None, generated_by_email=None,
                              start_date=None, end_date=None, data=None):
    """
    Genera y guarda un reporte de gobierno de datos.
    
    Args:
        report_type: Tipo de reporte ('CALIDAD_DATOS', 'AUDITORIA', 'ACCESOS', etc.)
        title: Título del reporte
        description: Descripción del reporte
        generated_by: ID del usuario que genera el reporte
        generated_by_email: Email del usuario
        start_date: Fecha de inicio del período
        end_date: Fecha de fin del período
        data: Datos del reporte (dict)
    """
    conn = get_db_connection()
    if not conn:
        return None
    
    try:
        cursor = conn.cursor()
        report_id = f"rpt-{uuid.uuid4().hex[:12]}"
        
        data_json = json.dumps(data) if data else None
        
        cursor.execute("""
            INSERT INTO reportes_gobernanza
            (id, tipo_reporte, titulo, descripcion, datos_reporte, generado_por,
             generado_por_email, fecha_inicio, fecha_fin, creado_en)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (report_id, report_type, title, description, data_json,
              generated_by, generated_by_email, start_date, end_date,
              datetime.now(timezone.utc)))
        
        conn.commit()
        cursor.close()
        conn.close()
        return report_id
    except Exception as e:
        print(f"[REPORTS] Error generating report: {str(e)}")
        if conn:
            conn.rollback()
            cursor.close()
            conn.close()
        return None


def get_audit_summary(days=30):
    """
    Genera un resumen de auditoría para los últimos N días.
    """
    conn = get_db_connection()
    if not conn:
        return {}
    
    try:
        cursor = conn.cursor()
        start_date = datetime.now(timezone.utc) - timedelta(days=days)
        
        # Resumen por acción
        cursor.execute("""
            SELECT accion, COUNT(*) as cantidad
            FROM auditoria_cambios
            WHERE creado_en >= %s
            GROUP BY accion
        """, (start_date,))
        actions_summary = cursor.fetchall()
        
        # Resumen por tabla
        cursor.execute("""
            SELECT tabla, COUNT(*) as cantidad
            FROM auditoria_cambios
            WHERE creado_en >= %s
            GROUP BY tabla
            ORDER BY cantidad DESC
            LIMIT 10
        """, (start_date,))
        tables_summary = cursor.fetchall()
        
        # Resumen por usuario
        cursor.execute("""
            SELECT usuario_id, usuario_email, COUNT(*) as cantidad
            FROM auditoria_cambios
            WHERE creado_en >= %s AND usuario_id IS NOT NULL
            GROUP BY usuario_id, usuario_email
            ORDER BY cantidad DESC
            LIMIT 10
        """, (start_date,))
        users_summary = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return {
            'periodo_dias': days,
            'fecha_inicio': start_date.isoformat(),
            'fecha_fin': datetime.now(timezone.utc).isoformat(),
            'resumen_acciones': actions_summary,
            'tablas_mas_modificadas': tables_summary,
            'usuarios_mas_activos': users_summary
        }
    except Exception as e:
        print(f"[REPORTS] Error getting audit summary: {str(e)}")
        if conn:
            cursor.close()
            conn.close()
        return {}


def get_access_summary(days=30):
    """
    Genera un resumen de accesos para los últimos N días.
    """
    conn = get_db_connection()
    if not conn:
        return {}
    
    try:
        cursor = conn.cursor()
        start_date = datetime.now(timezone.utc) - timedelta(days=days)
        
        # Resumen por tipo de acceso
        cursor.execute("""
            SELECT tipo_acceso, COUNT(*) as cantidad
            FROM logs_acceso
            WHERE creado_en >= %s
            GROUP BY tipo_acceso
        """, (start_date,))
        access_types = cursor.fetchall()
        
        # Intentos fallidos
        cursor.execute("""
            SELECT COUNT(*) as cantidad
            FROM logs_acceso
            WHERE creado_en >= %s AND exitoso = FALSE
        """, (start_date,))
        failed_attempts = cursor.fetchone()
        
        # Usuarios más activos
        cursor.execute("""
            SELECT usuario_id, usuario_email, COUNT(*) as cantidad
            FROM logs_acceso
            WHERE creado_en >= %s AND usuario_id IS NOT NULL
            GROUP BY usuario_id, usuario_email
            ORDER BY cantidad DESC
            LIMIT 10
        """, (start_date,))
        active_users = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return {
            'periodo_dias': days,
            'fecha_inicio': start_date.isoformat(),
            'fecha_fin': datetime.now(timezone.utc).isoformat(),
            'resumen_tipos_acceso': access_types,
            'intentos_fallidos': failed_attempts['cantidad'] if failed_attempts else 0,
            'usuarios_mas_activos': active_users
        }
    except Exception as e:
        print(f"[REPORTS] Error getting access summary: {str(e)}")
        if conn:
            cursor.close()
            conn.close()
        return {}
