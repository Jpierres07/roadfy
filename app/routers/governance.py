"""
Endpoints para Gobierno de Datos
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.db import get_db_connection
from app.auth import get_current_user, require_super_admin
from app.governance.audit import get_audit_trail, get_access_logs
from app.governance.metadata import get_metadata, get_data_quality_report
from app.governance.versioning import get_versions, get_version
from app.governance.reports import generate_governance_report, get_audit_summary, get_access_summary
from app.governance.interactions import log_interaction, get_interaction_summary, get_interactions

governance_bp = Blueprint('governance', __name__)


@governance_bp.route('/audit-trail', methods=['GET'])
@jwt_required()
@require_super_admin
def get_audit_trail_endpoint():
    """Obtiene el historial de auditoría. Solo super-admin."""
    table = request.args.get('table')
    record_id = request.args.get('record_id')
    user_id = request.args.get('user_id')
    action = request.args.get('action')
    limit = request.args.get('limit', 100, type=int)
    offset = request.args.get('offset', 0, type=int)
    
    results = get_audit_trail(table, record_id, user_id, action, limit, offset)
    
    return jsonify({
        'count': len(results),
        'results': results
    }), 200


@governance_bp.route('/access-logs', methods=['GET'])
@jwt_required()
@require_super_admin
def get_access_logs_endpoint():
    """Obtiene los logs de acceso. Solo super-admin."""
    user_id = request.args.get('user_id')
    access_type = request.args.get('access_type')
    successful = request.args.get('successful')
    successful = successful.lower() == 'true' if successful else None
    limit = request.args.get('limit', 100, type=int)
    offset = request.args.get('offset', 0, type=int)
    
    results = get_access_logs(user_id, access_type, successful, limit, offset)
    
    return jsonify({
        'count': len(results),
        'results': results
    }), 200


@governance_bp.route('/metadata/<table>/<record_id>', methods=['GET'])
@jwt_required()
@require_super_admin
def get_metadata_endpoint(table, record_id):
    """Obtiene metadatos de un registro. Solo super-admin."""
    field = request.args.get('field')
    metadata = get_metadata(table, record_id, field)
    
    if not metadata:
        return jsonify({'error': 'Metadata not found'}), 404
    
    return jsonify(metadata), 200


@governance_bp.route('/data-quality', methods=['GET'])
@jwt_required()
@require_super_admin
def get_data_quality_endpoint():
    """Obtiene reporte de calidad de datos. Solo super-admin."""
    table = request.args.get('table')
    report = get_data_quality_report(table)
    
    return jsonify(report), 200


@governance_bp.route('/versions/<table>/<record_id>', methods=['GET'])
@jwt_required()
@require_super_admin
def get_versions_endpoint(table, record_id):
    """Obtiene historial de versiones de un registro. Solo super-admin."""
    limit = request.args.get('limit', 10, type=int)
    versions = get_versions(table, record_id, limit)
    
    return jsonify({
        'count': len(versions),
        'versions': versions
    }), 200


@governance_bp.route('/versions/<table>/<record_id>/<int:version>', methods=['GET'])
@jwt_required()
@require_super_admin
def get_version_endpoint(table, record_id, version):
    """Obtiene una versión específica. Solo super-admin."""
    version_data = get_version(table, record_id, version)
    
    if not version_data:
        return jsonify({'error': 'Version not found'}), 404
    
    return jsonify(version_data), 200


@governance_bp.route('/reports/audit-summary', methods=['GET'])
@jwt_required()
@require_super_admin
def get_audit_summary_endpoint():
    """Obtiene resumen de auditoría. Solo super-admin."""
    days = request.args.get('days', 30, type=int)
    summary = get_audit_summary(days)
    
    return jsonify(summary), 200


@governance_bp.route('/reports/access-summary', methods=['GET'])
@jwt_required()
@require_super_admin
def get_access_summary_endpoint():
    """Obtiene resumen de accesos. Solo super-admin."""
    days = request.args.get('days', 30, type=int)
    summary = get_access_summary(days)
    
    return jsonify(summary), 200


@governance_bp.route('/interactions', methods=['POST'])
def log_interaction_endpoint():
    """Registra una interacción del usuario. Endpoint público."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body is required'}), 400
    
    interaction_type = data.get('interaction_type')
    entity_type = data.get('entity_type')
    entity_id = data.get('entity_id')
    metadata = data.get('metadata')
    
    if not all([interaction_type, entity_type, entity_id]):
        return jsonify({'error': 'interaction_type, entity_type, and entity_id are required'}), 400
    
    # Obtener usuario si está autenticado
    user_id = None
    user_email = None
    try:
        from flask_jwt_extended import get_jwt_identity
        from app.auth import get_current_user
        user = get_current_user()
        if user:
            user_id = user.get('id')
            user_email = user.get('correo')
    except:
        pass  # Usuario no autenticado, continuar sin user_id
    
    try:
        success = log_interaction(
            interaction_type=interaction_type,
            entity_type=entity_type,
            entity_id=entity_id,
            user_id=user_id,
            user_email=user_email,
            metadata=metadata
        )
        
        if success:
            return jsonify({'message': 'Interaction logged successfully'}), 201
        else:
            # Si falla, puede ser que la tabla no existe, pero no bloqueamos la aplicación
            # Retornamos 200 con un mensaje informativo en lugar de 500
            # Esto permite que la aplicación continúe funcionando normalmente
            return jsonify({
                'message': 'Interaction logging is not available',
                'note': 'La tabla de interacciones puede no estar creada. Verifica los logs del servidor.'
            }), 200
    except Exception as e:
        print(f"[LOG_INTERACTION_ENDPOINT] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        # Retornar 200 en lugar de 500 para no bloquear la aplicación
        # La tabla puede no existir, pero la aplicación debe continuar funcionando
        error_msg = str(e)
        if 'interacciones_usuario' in error_msg.lower() or 'table' in error_msg.lower():
            return jsonify({
                'message': 'Interaction logging is not available',
                'note': 'La tabla de interacciones no existe. Ejecuta crear_tabla_interacciones.sql'
            }), 200
        return jsonify({
            'message': 'Interaction logging is not available',
            'note': 'Error al registrar interacción. Verifica los logs del servidor.'
        }), 200


@governance_bp.route('/reports/interaction-summary', methods=['GET'])
@jwt_required()
@require_super_admin
def get_interaction_summary_endpoint():
    """Obtiene resumen de interacciones. Solo super-admin."""
    try:
        days = request.args.get('days', 30, type=int)
        summary = get_interaction_summary(days)
        
        # Si summary está vacío, puede ser que la tabla no existe
        # Retornar un objeto con estructura válida pero vacío
        if not summary:
            return jsonify({
                'periodo_dias': days,
                'fecha_inicio': None,
                'fecha_fin': None,
                'resumen_interacciones': [],
                'resumen_entidades': [],
                'top_llantas': [],
                'top_negocios': [],
                'resumen_dispositivos': [],
                'total_busquedas': 0,
                'total_comparaciones': 0,
                'note': 'La tabla de interacciones puede no estar creada. Verifica los logs del servidor.'
            }), 200
        
        return jsonify(summary), 200
    except Exception as e:
        print(f"[GET_INTERACTION_SUMMARY_ENDPOINT] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        # Retornar objeto vacío en lugar de error 500
        return jsonify({
            'periodo_dias': request.args.get('days', 30, type=int),
            'fecha_inicio': None,
            'fecha_fin': None,
            'resumen_interacciones': [],
            'resumen_entidades': [],
            'top_llantas': [],
            'top_negocios': [],
            'resumen_dispositivos': [],
            'total_busquedas': 0,
            'total_comparaciones': 0,
            'note': 'Error al obtener resumen de interacciones. Verifica los logs del servidor.'
        }), 200


@governance_bp.route('/interactions', methods=['GET'])
@jwt_required()
@require_super_admin
def get_interactions_endpoint():
    """Obtiene interacciones con filtros. Solo super-admin."""
    entity_type = request.args.get('entity_type')
    entity_id = request.args.get('entity_id')
    interaction_type = request.args.get('interaction_type')
    user_id = request.args.get('user_id')
    limit = request.args.get('limit', 100, type=int)
    offset = request.args.get('offset', 0, type=int)
    
    results = get_interactions(
        entity_type=entity_type,
        entity_id=entity_id,
        interaction_type=interaction_type,
        user_id=user_id,
        limit=limit,
        offset=offset
    )
    
    return jsonify({
        'count': len(results),
        'results': results
    }), 200
