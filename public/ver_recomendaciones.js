document.addEventListener('DOMContentLoaded', function() {
    const dniInput = document.getElementById('dniBuscar');
    const buscarBtn = document.getElementById('buscarRecomendacionesBtn');
    const resultadosDiv = document.getElementById('resultadosRecomendaciones');

    // Función para obtener el DNI de la URL
    function getDniFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('dni');
    }

    // Si el DNI está en la URL, lo precargamos
    const dniDesdeUrl = getDniFromUrl();
    if (dniDesdeUrl) {
        dniInput.value = dniDesdeUrl;
        buscarRecomendaciones(dniDesdeUrl); // Buscar automáticamente al cargar
    }

    // Evento para el botón "Buscar Recomendaciones"
    buscarBtn.addEventListener('click', function() {
        const dni = dniInput.value;
        if (dni) {
            buscarRecomendaciones(dni);
        } else {
            alert('Por favor, ingresa tu DNI.');
        }
    });

    // Función para buscar y mostrar las recomendaciones
    async function buscarRecomendaciones(dni) {
        resultadosDiv.innerHTML = '<p>Cargando recomendaciones...</p>';
        try {
            const response = await fetch(`http://localhost:3001/getPreventivePlan/${dni}`);
            if (response.ok) {
                const planPreventivo = await response.json();
                console.log("Plan Preventivo Recibido:", planPreventivo);
                mostrarPlanEnHTML(planPreventivo);
            } else if (response.status === 404) {
                resultadosDiv.innerHTML = '<p>No se encontraron recomendaciones para este DNI.</p>';
            } else {
                resultadosDiv.innerHTML = '<p>Error al obtener las recomendaciones.</p>';
            }
        } catch (error) {
            console.error('Error al solicitar el plan preventivo:', error);
            resultadosDiv.innerHTML = '<p>Error al conectar con el servidor.</p>';
        }
    }

    // Función para mostrar el plan en HTML (la misma que tenías antes)
    function mostrarPlanEnHTML(plan) {
        console.log('Plan recibido en el frontend:', plan);
        const nombreUsuario = plan.name;
        let html = `<div class="container-recomendaciones">
                        <h2>¡Hola, ${nombreUsuario}! Felicitaciones por decidirte a hacer tu Día Preventivo!!</h2>
                        <p class="intro-text">A continuación te vamos a hacer las recomendaciones sobre las prácticas y acciones preventivas que debes llevar a cabo a la brevedad. Cada recomendación tiene una explicación si quieres saber más y nuestros preventivistas van a guiarte sobre cómo hacer cada prestación, dónde y cómo hacerlas. Además vamos a darte información personalizada sobre todas las acciones preventivas que necesitas hacer. Por último vas a poder discutir todos los resultados con un médico especializado en prevención y sobre todo en el Día Preventivo. ¡Adelante!</p>`;
    
        const recomendacionesPorCategoria = {};
        plan.recommendations.forEach(recommendation => {
            if (!recomendacionesPorCategoria[recommendation.categoria]) {
                recomendacionesPorCategoria[recommendation.categoria] = [];
            }
            recomendacionesPorCategoria[recommendation.categoria].push(recommendation);
        });
    
        const coloresCategorias = {
            "Prevención de enfermedades crónicas y riesgo cardiovascular": "#2B6CB0",
            "Prevención del cáncer": "#E53E3E"
            // Agrega más colores para tus otras categorías
        };
    
        for (const categoria in recomendacionesPorCategoria) {
            if (recomendacionesPorCategoria.hasOwnProperty(categoria)) {
                const color = coloresCategorias[categoria] || "#718096";
                html += `<div class="categoria-container">
                            <h3 class="categoria-titulo" style="background-color: ${color};">${categoria}</h3>
                            <ul class="practicas-lista">`;
                recomendacionesPorCategoria[categoria].forEach(recommendation => {
                    html += `<li class="practica-item">${recommendation.practica} <button class="conocer-mas-btn text-xs text-primary mt-1" data-explicativo-id="${recommendation.explicativo_id}">Conozca más</button></li>`;
                });
                html += `</ul></div>`;
            }
        }
    
        html += `</div>`; // Cierre del contenedor principal
        resultadosDiv.innerHTML = html;
    }
});