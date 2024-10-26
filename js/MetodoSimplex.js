document.addEventListener("DOMContentLoaded", function () {
    const metodoSeleccion = document.getElementById("Metodo_seleccion");
    const inputsSeccion = document.getElementById("inputs-section");
    const iteracionesDiv = document.getElementById("Iteracion");
    const optimaSolucionDiv = document.getElementById("Sol-optima");
    const BottonBorrar = document.getElementById("Botton-Borrar");
    const funObjetivoInput = document.getElementById("fun-objetivo");
    const constraintsTextarea = document.getElementById("constraints");

    // Inicialmente ocultar la sección de inputs
    inputsSeccion.style.display = "none";

    metodoSeleccion.addEventListener("change", function () {
        iteracionesDiv.innerHTML = ""; // Limpiar resultados de iteraciones previas
        optimaSolucionDiv.innerHTML = ""; // Limpiar resultados de la solución óptima
        if (metodoSeleccion.value === "Maximización_Minimización" || metodoSeleccion.value === "Minimización") {
            inputsSeccion.style.display = "block"; // Mostrar inputs
            funObjetivoInput.value = ""; // Limpiar el input de la función objetivo
            constraintsTextarea.value = "";
        } else {
            inputsSeccion.style.display = "none"; // Ocultar inputs
            iteracionesDiv.innerHTML = "";
            optimaSolucionDiv.innerHTML = "";
        }
    });

    BottonBorrar.addEventListener("click", function () {
        iteracionesDiv.innerHTML = "";
        optimaSolucionDiv.innerHTML = "";
        inputsSeccion.style.display = "none";
        metodoSeleccion.value = "";
        funObjetivoInput.value = ""; // Limpiar el input de la función objetivo
        constraintsTextarea.value = ""; // Limpiar el textarea de las restricciones
    });
});

// Función para parsear la ecuación objetivo
function parseObjectiveFunction(func, metodoSeleccion) {
    let variables = func.split('+').map(v => v.trim());
    let coefficients = [];
    variables.forEach(v => {
        let match = v.match(/([-]?\d*\.?\d*)[xX](\d+)/); // Permitir decimales
        if (match) {
            let coefficient = match[1] === "" || match[1] === "-" ? (match[1] === "-" ? -1 : 1) : parseFloat(match[1]);
            if (metodoSeleccion === "Minimización") {
                coefficients.push(coefficient); // Para minimización no cambiamos el signo
            } else {
                coefficients.push(-coefficient); // Cambiar signo para maximización
            }
        }
    });
    return coefficients;
}

// Función para parsear las restricciones
function parseConstraints(constraints, numVariables) {
    let tableau = [];
    constraints.forEach(constraint => {
        if (constraint.trim() === "") return;

        let parts = constraint.replace(/\s+/g, '').split(/<=|>=|<|>|≤|≥|=/); 
        if (parts.length < 2) {
            console.error("Formato de restricción no válido:", constraint);
            return;
        }

        let leftPart = parts[0].trim().split('+').map(v => v.trim());
        let rhs = parseFloat(parts[1].trim()); // Asegurarse de convertir a float
        let row = Array(numVariables).fill(0);

        leftPart.forEach(v => {
            let match = v.match(/([-]?\d*\.?\d*)[xX](\d+)/); // Permitir decimales
            if (match) {
                let coefficient = parseFloat(match[1] || 1);
                let variableIndex = parseInt(match[2]) - 1;
                row[variableIndex] = coefficient;
            }
        });

        row.push(rhs);
        tableau.push(row);
    });
    return tableau;
}

// Función para extraer la solución óptima
function extractSolution(tableau) {
    let variables = Array(tableau[0].length - 1).fill(0); // Crear un array para las variables
    let Z = tableau[tableau.length - 1][tableau[0].length - 1]; // Último valor de la función objetivo

    for (let i = 0; i < tableau.length - 1; i++) {
        let row = tableau[i];
        // Encontrar el índice de la variable básica
        let basicVariableIndex = row.slice(0, row.length - 1).findIndex(val => val !== 0);
        if (basicVariableIndex !== -1) {
            variables[basicVariableIndex] = row[row.length - 1]; // Asignar el valor del RHS
        }
    }

    return { Z, variables };
}

// Función principal para resolver el método Simplex
function solveSimplex() {
    try {
        const metodoSeleccion = document.getElementById("Metodo_seleccion").value;
        const objetivoFuncion = document.getElementById("fun-objetivo").value.trim();
        const constraints = document.getElementById("constraints").value.trim().split('\n').filter(c => c !== "");

        if (objetivoFuncion === "" || constraints.length === 0) {
            alert("Debe ingresar la función objetivo y al menos una restricción.");
            return;
        }

        let iteracionesDiv = document.getElementById("Iteracion");
        let optimaSolucionDiv = document.getElementById("Sol-optima");

        // Parsear ecuación objetivo y restricciones
        let coefObjetivo = parseObjectiveFunction(objetivoFuncion, metodoSeleccion);
        let tableau = parseConstraints(constraints, coefObjetivo.length);

        // Añadir fila de la función objetivo al tableau
        tableau.push([...coefObjetivo, 0]);

        let iteracion = 1;

        while (true) {
            console.log(`Iteración ${iteracion}: tableau actual:`, tableau);

            let lastRow = tableau[tableau.length - 1];
            let minValue = Math.min(...lastRow.slice(0, lastRow.length - 1));

            if (minValue >= 0) {
                break; // Solución óptima alcanzada
            }
            let enteringColumn = lastRow.indexOf(minValue);

            let ratios = [];
            for (let i = 0; i < tableau.length - 1; i++) {
                let rhs = tableau[i][tableau[i].length - 1];
                let coeff = tableau[i][enteringColumn];
                if (coeff > 0) {
                    ratios.push(rhs / coeff);
                } else {
                    ratios.push(Infinity);
                }
            }
            let leavingRow = ratios.indexOf(Math.min(...ratios));

            let pivotValue = tableau[leavingRow][enteringColumn];
            if (pivotValue === 0) {
                console.error("El valor del pivote no es válido.");
                return;
            }

            for (let j = 0; j < tableau[leavingRow].length; j++) {
                tableau[leavingRow][j] /= pivotValue;
            }

            for (let i = 0; i < tableau.length; i++) {
                if (i !== leavingRow) {
                    let factor = tableau[i][enteringColumn];
                    for (let j = 0; j < tableau[i].length; j++) {
                        tableau[i][j] -= factor * tableau[leavingRow][j];
                    }
                }
            }

            let iterationHTML = `<h4>Iteración ${iteracion}</h4><table border='1'>`;
            for (let i = 0; i < tableau.length; i++) {
                iterationHTML += "<tr>";
                for (let j = 0; j < tableau[i].length; j++) {
                    iterationHTML += `<td>${tableau[i][j].toFixed(4)}</td>`;
                }
                iterationHTML += "</tr>";
            }
            iterationHTML += "</table>";
            iteracionesDiv.innerHTML += iterationHTML;

            iteracion++;
        }

        let solution = extractSolution(tableau);
        if (solution) {
            optimaSolucionDiv.innerHTML = `<p>La solución óptima es:<br> Z =  ${solution.Z.toFixed(4)}`;
            for (let i = 0; i < solution.variables.length; i++) {
                optimaSolucionDiv.innerHTML += ` <br>X${i + 1} = ${solution.variables[i].toFixed(4)}`;
            }
            optimaSolucionDiv.innerHTML += `</p>`;
        } else {
            optimaSolucionDiv.innerHTML = `<p>No se pudo encontrar una solución óptima.</p>`;
        }

    } catch (error) {
        console.error("Error en solveSimplex:", error);
        alert("Ha ocurrido un error: " + error.message);
    }
}
