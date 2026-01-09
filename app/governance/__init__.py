"""
Módulo de Gobierno de Datos (Data Governance)
"""
from app.governance.audit import log_change, log_access
from app.governance.metadata import update_metadata, get_metadata
from app.governance.versioning import create_version, get_versions
from app.governance.reports import generate_governance_report

__all__ = [
    'log_change',
    'log_access',
    'update_metadata',
    'get_metadata',
    'create_version',
    'get_versions',
    'generate_governance_report'
]
