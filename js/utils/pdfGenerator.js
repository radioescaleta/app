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
        
        // Estilos para los inputs de tiempo (más pequeños) vs el principal
        if (input.classList.contains('time-input')) {
            span.style.marginRight = "5px";
            span.style.fontSize = "12px";
            span.style.color = "#555";
        } else {
            span.style.fontWeight = "bold";
        }
        
        input.parentNode.replaceChild(span, input);
    });

    // Mejorar aspecto de los bloques para impresión
    const blocks = clone.querySelectorAll('.escaleta-block');
    blocks.forEach(block => {
        block.style.boxShadow = 'none';
        block.style.border = '1px solid #ddd';
        block.style.backgroundColor = '#ffffff';
        block.style.marginBottom = '15px';
        block.style.pageBreakInside = 'avoid';
    });

    // Formatear los textos largos (guiones) para que se vean enteros y elegantes
    const textPreviews = clone.querySelectorAll('.text-preview');
    textPreviews.forEach(div => {
        div.style.whiteSpace = 'pre-wrap';
        div.style.overflow = 'visible';
        div.style.textOverflow = 'clip';
        div.style.background = 'transparent';
        div.style.border = 'none';
        div.style.borderLeft = '4px solid #00acc1';
        div.style.padding = '5px 0 5px 15px';
        div.style.fontStyle = 'italic';
        div.style.fontSize = '14px';
        div.style.lineHeight = '1.6';
        div.style.color = '#333';
        div.style.marginTop = '10px';
    });

    // Eliminar botones de acción
    const actions = clone.querySelectorAll('.block-actions');
    actions.forEach(a => a.remove());
    
    // Clonar y añadir también el Diagrama de Gantt si existe
    const gantt = document.getElementById('ganttContainer');
    if (gantt) {
        // Asegurarse de que el Gantt esté actualizado antes de clonar
        // Ya debería estarlo si el usuario lo vio, pero si no lo vio, podría estar vacío.
        // Mejor añadirlo tal cual.
        const ganttClone = gantt.cloneNode(true);
        ganttClone.style.display = 'block'; // Forzar que se vea en el PDF aunque estemos en Modo Lista
        ganttClone.style.marginTop = '40px';
        ganttClone.style.pageBreakBefore = 'always'; // Que salga en una página nueva si es posible
        
        // Título para el Gantt
        const ganttTitle = document.createElement('h3');
        ganttTitle.innerText = "Diagrama de Gantt";
        ganttTitle.style.textAlign = "center";
        ganttTitle.style.marginBottom = "20px";
        ganttClone.insertBefore(ganttTitle, ganttClone.firstChild);
        
        clone.appendChild(ganttClone);
    }

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
