// js/utils/pdfGenerator.js

export function downloadPDF(elementId, filename = "escaleta.pdf") {
    const element = document.getElementById(elementId);
    if (!element) return;

    // Clonamos para limpiar estilos de drag and drop o botones de borrar
    const clone = element.cloneNode(true);
    
    // Convertir inputs en spans para el PDF
    const inputs = clone.querySelectorAll('input');
    inputs.forEach(input => {
        const span = document.createElement('span');
        span.innerText = input.value;
        span.style.fontWeight = "bold";
        input.parentNode.replaceChild(span, input);
    });

    // Eliminar botones de acción
    const actions = clone.querySelectorAll('.block-actions');
    actions.forEach(a => a.remove());

    const opt = {
        margin:       10,
        filename:     filename,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    if (typeof html2pdf !== 'undefined') {
        html2pdf().set(opt).from(clone).save();
    } else {
        console.error("Librería html2pdf no cargada");
    }
}
