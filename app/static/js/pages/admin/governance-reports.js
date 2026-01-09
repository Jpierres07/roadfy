// Funciones de traducción para PDFs
function translateAccessTypeForPDF(type) {
    const translations = {
        'LOGIN': 'Inicio de Sesión', 'LOGIN_FAILED': 'Inicio de Sesión Fallido',
        'LOGOUT': 'Cierre de Sesión', 'API_ACCESS': 'Acceso a API',
        'DATA_ACCESS': 'Acceso a Datos', 'FILE_DOWNLOAD': 'Descarga de Archivo',
        'REPORT_GENERATION': 'Generación de Reporte', 'ADMIN_ACTION': 'Acción de Administrador',
        'DATA_EXPORT': 'Exportación de Datos', 'DATA_IMPORT': 'Importación de Datos'
    };
    return translations[type] || type;
}

function translateAuditActionForPDF(action) {
    const translations = {
        'INSERT': 'Inserción', 'UPDATE': 'Actualización', 'DELETE': 'Eliminación',
        'SELECT': 'Consulta', 'CREATE': 'Creación', 'MODIFY': 'Modificación', 'REMOVE': 'Remoción'
    };
    return translations[action] || action;
}

// Funciones para generar reportes PDF de gobierno de datos
window.downloadGovernancePDF = async function(reportType = 'full') {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Cargar datos
        const [auditSummary, accessSummary, dataQuality] = await Promise.all([
            api.get('/governance/reports/audit-summary?days=30').catch(() => ({})),
            api.get('/governance/reports/access-summary?days=30').catch(() => ({})),
            api.get('/governance/data-quality').catch(() => ({}))
        ]);
        
        let yPos = 20;
        
        // Encabezado
        doc.setFontSize(20);
        doc.setTextColor(59, 130, 246); // Azul primario
        doc.text('ROADFY - Reporte de Gobierno de Datos', 14, yPos);
        yPos += 10;
        
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(`Generado el: ${new Date().toLocaleDateString('es-PE')} ${new Date().toLocaleTimeString('es-PE')}`, 14, yPos);
        yPos += 15;
        
        // Resumen de Auditoría
        if (reportType === 'full' || reportType === 'audit') {
            doc.setFontSize(16);
            doc.setTextColor(59, 130, 246);
            doc.text('Resumen de Auditoría (Últimos 30 días)', 14, yPos);
            yPos += 10;
            
            if (auditSummary.resumen_acciones && auditSummary.resumen_acciones.length > 0) {
                doc.setFontSize(12);
                doc.setTextColor(0, 0, 0);
                const auditTable = auditSummary.resumen_acciones.map(a => [translateAuditActionForPDF(a.accion), a.cantidad.toString()]);
                doc.autoTable({
                    startY: yPos,
                    head: [['Acción', 'Cantidad']],
                    body: auditTable,
                    theme: 'striped',
                    headStyles: { fillColor: [59, 130, 246] }
                });
                yPos = doc.lastAutoTable.finalY + 15;
            }
            
            if (auditSummary.tablas_mas_modificadas && auditSummary.tablas_mas_modificadas.length > 0) {
                doc.setFontSize(14);
                doc.text('Tablas Más Modificadas', 14, yPos);
                yPos += 8;
                const tablesData = auditSummary.tablas_mas_modificadas.map(t => [t.tabla, t.cantidad.toString()]);
                doc.autoTable({
                    startY: yPos,
                    head: [['Tabla', 'Cambios']],
                    body: tablesData,
                    theme: 'striped'
                });
                yPos = doc.lastAutoTable.finalY + 15;
            }
        }
        
        // Resumen de Accesos
        if (reportType === 'full' || reportType === 'access') {
            if (yPos > 250) {
                doc.addPage();
                yPos = 20;
            }
            
            doc.setFontSize(16);
            doc.setTextColor(59, 130, 246);
            doc.text('Resumen de Accesos (Últimos 30 días)', 14, yPos);
            yPos += 10;
            
            if (accessSummary.resumen_tipos_acceso && accessSummary.resumen_tipos_acceso.length > 0) {
                doc.setFontSize(12);
                doc.setTextColor(0, 0, 0);
                const accessTable = accessSummary.resumen_tipos_acceso.map(a => [translateAccessTypeForPDF(a.tipo_acceso), a.cantidad.toString()]);
                doc.autoTable({
                    startY: yPos,
                    head: [['Tipo de Acceso', 'Cantidad']],
                    body: accessTable,
                    theme: 'striped',
                    headStyles: { fillColor: [16, 185, 129] }
                });
                yPos = doc.lastAutoTable.finalY + 10;
            }
            
            doc.setFontSize(11);
            doc.text(`Intentos Fallidos: ${accessSummary.intentos_fallidos || 0}`, 14, yPos);
            yPos += 15;
        }
        
        // Calidad de Datos
        if (reportType === 'full' || reportType === 'quality') {
            if (yPos > 250) {
                doc.addPage();
                yPos = 20;
            }
            
            doc.setFontSize(16);
            doc.setTextColor(59, 130, 246);
            doc.text('Calidad de Datos', 14, yPos);
            yPos += 10;
            
            if (dataQuality.total && dataQuality.total > 0) {
                doc.setFontSize(12);
                doc.setTextColor(0, 0, 0);
                const qualityData = [
                    ['Excelente', (dataQuality.EXCELENTE || 0).toString(), `${(dataQuality.porcentaje_excelente || 0).toFixed(2)}%`],
                    ['Buena', (dataQuality.BUENA || 0).toString(), `${(dataQuality.porcentaje_buena || 0).toFixed(2)}%`],
                    ['Regular', (dataQuality.REGULAR || 0).toString(), `${(dataQuality.porcentaje_regular || 0).toFixed(2)}%`],
                    ['Mala', (dataQuality.MALA || 0).toString(), `${(dataQuality.porcentaje_mala || 0).toFixed(2)}%`],
                    ['Sin Datos', (dataQuality.SIN_DATOS || 0).toString(), `${(dataQuality.porcentaje_sin_datos || 0).toFixed(2)}%`]
                ];
                doc.autoTable({
                    startY: yPos,
                    head: [['Nivel', 'Cantidad', 'Porcentaje']],
                    body: qualityData,
                    theme: 'striped',
                    headStyles: { fillColor: [245, 158, 11] }
                });
                yPos = doc.lastAutoTable.finalY + 10;
                
                doc.setFontSize(11);
                doc.text(`Total de registros: ${dataQuality.total}`, 14, yPos);
            }
        }
        
        // Pie de página
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(10);
            doc.setTextColor(128, 128, 128);
            doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
        }
        
        // Descargar
        const fileName = `reporte-gobierno-datos-${reportType}-${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
        
    } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Error al generar el PDF: ' + error.message);
    }
};
