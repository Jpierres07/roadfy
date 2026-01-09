// Componente Footer
function renderFooter() {
    const footer = document.getElementById('footer');
    footer.innerHTML = `
        <div class="footer-container">
            <p>&copy; ${new Date().getFullYear()} ROADFY. Todos los derechos reservados.</p>
            <p>RímacW y ShuanJP</p>
        </div>
    `;
}

