const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxrSwJsiMmc8x4vIogAkAWuULW6f_13aHKvXUfxebcWjNCHbOQROb4vxaQcmassBYrN4g/exec"; // Ejemplo: https://docs.google.com/forms/d/e/.../formResponse

     async function cargarOpciones() {
       try {
         const [cirujanos, enfermeros, instrumentistas, diagnosticos] = await Promise.all([
           fetch('cirujanos.json').then(res => {
             if (!res.ok) throw new Error('Error al cargar cirujanos.json: ' + res.statusText);
             return res.json();
           }),
           fetch('enfermeros.json').then(res => {
             if (!res.ok) throw new Error('Error al cargar enfermeros.json: ' + res.statusText);
             return res.json();
           }),
           fetch('instrumentistas.json').then(res => {
             if (!res.ok) throw new Error('Error al cargar instrumentistas.json: ' + res.statusText);
             return res.json();
           }),
           fetch('diagnosticos.json').then(res => {
             if (!res.ok) throw new Error('Error al cargar diagnosticos.json: ' + res.statusText);
             return res.json();
           })
         ]);

         llenarSelect('medico_cirujano', cirujanos);
         llenarSelect('enfermero', enfermeros);
         llenarSelect('instrumentista', instrumentistas);
         llenarSelectDiagnosticos('diagnostico', diagnosticos);

         inicializarChoices();
       } catch (err) {
         console.error("Error al cargar opciones:", err);
         const alerta = document.getElementById("alertaRespuesta");
         alerta.classList.remove("d-none");
         alerta.classList.add("alert-danger");
         alerta.textContent = "Error al cargar las opciones: " + err.message;
       }
     }

     function llenarSelect(id, lista) {
       const select = document.getElementById(id);
       lista.forEach(item => {
         const option = document.createElement('option');
         option.value = item;
         option.textContent = item;
         select.appendChild(option);
       });
     }

     function llenarSelectDiagnosticos(id, lista) {
       const select = document.getElementById(id);
       lista.forEach(item => {
         const option = document.createElement('option');
         option.value = item.codigo;
         option.textContent = `${item.codigo} - ${item.descripcion}`;
         select.appendChild(option);
       });
     }

     function inicializarChoices() {
       const selects = document.querySelectorAll('select');
       selects.forEach(select => {
         new Choices(select, {
           searchEnabled: true,
           itemSelectText: '',
           shouldSort: false,
           placeholderValue: 'Seleccione...',
           searchPlaceholderValue: 'Buscar...'
         });
       });
     }

     function setFechaLimites(inputFecha) {
       const hoy = new Date();
       const primerDiaMesActual = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
       const ultimoDiaMesSiguiente = new Date(hoy.getFullYear(), hoy.getMonth() + 2, 0);

       inputFecha.min = primerDiaMesActual.toISOString().slice(0, 10);
       inputFecha.max = ultimoDiaMesSiguiente.toISOString().slice(0, 10);
     }

     document.addEventListener("DOMContentLoaded", () => {
       cargarOpciones();

       const form = document.getElementById("quirForm");
       const alerta = document.getElementById("alertaRespuesta");
       const fechaInput = document.getElementById("fecha");

       setFechaLimites(fechaInput);

       // Validación de cédula
       document.getElementById("cedula").addEventListener("input", function () {
         const cedula = this.value;
         if (cedula.length === 10 && /^\d{10}$/.test(cedula)) {
           this.setCustomValidity("");
         } else {
           this.setCustomValidity("La cédula debe tener 10 dígitos numéricos.");
         }
       });

       // Validación de HCL
       document.getElementById("hcl").addEventListener("input", function () {
         const hcl = this.value;
         if (/^\d+$/.test(hcl)) {
           this.setCustomValidity("");
         } else {
           this.setCustomValidity("La historia clínica debe contener solo números.");
         }
       });

       // Validación de fecha
       fechaInput.addEventListener("change", function () {
         const fecha = new Date(this.value);
         const minDate = new Date(this.min);
         const maxDate = new Date(this.max);
         if (fecha < minDate || fecha > maxDate) {
           this.setCustomValidity("La fecha debe estar en el mes actual o siguiente.");
         } else {
           this.setCustomValidity("");
         }
       });

       form.addEventListener("submit", async (e) => {
         e.preventDefault();

         if (!form.checkValidity()) {
           form.classList.add("was-validated");
           return;
         }

         const formData = new FormData(form);
         const dataObj = Object.fromEntries(formData.entries());

         // Mapear los nombres de los campos a los entry IDs del Google Form
         const formBody = new URLSearchParams();
         formBody.append('entry.123456789', dataObj.estado || ''); // Reemplaza con los entry IDs reales
         formBody.append('entry.987654321', dataObj.fecha || '');
         formBody.append('entry.456789123', dataObj.nombres || '');
         formBody.append('entry.321654987', dataObj.sexo || '');
         formBody.append('entry.654987321', dataObj.edad || '');
         formBody.append('entry.789123456', dataObj.hcl || '');
         formBody.append('entry.147258369', dataObj.cedula || '');
         formBody.append('entry.258369147', dataObj.qx || '');
         formBody.append('entry.369147258', dataObj.medico_cirujano || '');
         formBody.append('entry.741852963', dataObj.enfermero || '');
         formBody.append('entry.852963741', dataObj.instrumentista || '');
         formBody.append('entry.963741852', dataObj.diagnostico || '');
         formBody.append('entry.159357486', dataObj.observaciones || '');

         try {
           alerta.classList.remove("alert-danger", "d-none");
           alerta.classList.add("alert-info");
           alerta.textContent = "Guardando... por favor espere";

           console.log("Enviando datos:", dataObj);

           await fetch(SCRIPT_URL, {
             method: "POST",
             body: formBody,
             headers: { "Content-Type": "application/x-www-form-urlencoded" }
           });

           alerta.classList.remove("alert-info");
           alerta.classList.add("alert-success");
           alerta.textContent = "Datos enviados correctamente. Por favor, verifica la hoja de cálculo para confirmar el registro.";
           form.reset();
           form.classList.remove("was-validated");

           const selects = document.querySelectorAll('select');
           selects.forEach(select => {
             const choicesInstance = select.choices;
             if (choicesInstance) {
               choicesInstance.setChoiceByValue("");
             }
           });
         } catch (err) {
           console.error("Error en la solicitud:", err);
           alerta.classList.remove("alert-info");
           alerta.classList.add("alert-danger");
           alerta.textContent = "Error al enviar los datos: " + err.message + ". Verifica la hoja de cálculo.";
         }
       });
     });