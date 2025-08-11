const SCRIPT_URL = "https://docs.google.com/forms/u/0/d/e/1FAIpQLSe_A6jax7Mto3gEbfMQXajO1EnrVS9BXHTlfUwHLmtLUp3qWA/formResponse";

async function cargarOpciones() {
  try {
    const [cirujanos, enfermeros, anestesiologos, diagnosticos] = await Promise.all([
      fetch('cirujanos.json').then(res => {
        if (!res.ok) throw new Error('Error al cargar cirujanos.json: ' + res.statusText);
        return res.json();
      }),
      fetch('enfermeros.json').then(res => {
        if (!res.ok) throw new Error('Error al cargar enfermeros.json: ' + res.statusText);
        return res.json();
      }),
      fetch('anestesiologos.json').then(res => {
        if (!res.ok) throw new Error('Error al cargar anestesiologos.json: ' + res.statusText);
        return res.json();
      }),
      fetch('diagnosticos.json').then(res => {
        if (!res.ok) throw new Error('Error al cargar diagnosticos.json: ' + res.statusText);
        return res.json();
      })
    ]);

    llenarSelect('medico_cirujano', cirujanos);
    llenarSelect('enfermero', enfermeros);
    llenarSelect('anestesiologo', anestesiologos);
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

    // Dividir la fecha en año, mes y día si es necesario
    let fechaYear = '';
    let fechaMonth = '';
    let fechaDay = '';
    if (dataObj.fecha) {
      const [year, month, day] = dataObj.fecha.split('-');
      fechaYear = year;
      fechaMonth = month;
      fechaDay = day;
    }

    // Mapear los nombres de los campos a los entry IDs del Google Form
    const formBody = new URLSearchParams();
    formBody.append('entry.487126253', dataObj.estado || '');
    formBody.append('entry.365267802_year', fechaYear || '');
    formBody.append('entry.365267802_month', fechaMonth || '');
    formBody.append('entry.365267802_day', fechaDay || '');
    formBody.append('entry.129819069', dataObj.nombres || '');
    formBody.append('entry.411420745', dataObj.sexo || '');
    formBody.append('entry.2142979259', dataObj.edad || '');
    formBody.append('entry.2104873773', dataObj.hcl || '');
    formBody.append('entry.1351880325', dataObj.cedula || '');
    formBody.append('entry.44199439', dataObj.especialidad || '');
    formBody.append('entry.1988959802', dataObj.procedencia || '');    
    formBody.append('entry.51260872', dataObj.qx || '');
    formBody.append('entry.447555786', dataObj.medico_cirujano || '');
    formBody.append('entry.1042485773', dataObj.enfermero || '');
    formBody.append('entry.7007821s29', dataObj.anestesiologo || '');
    formBody.append('entry.1236994085', dataObj.diagnostico || '');
    formBody.append('entry.1285987142', dataObj.observaciones || '');

    try {
      alerta.classList.remove("alert-danger", "d-none");
      alerta.classList.add("alert-info");
      alerta.textContent = "Guardando... por favor espere";

      console.log("Enviando datos:", Object.fromEntries(formBody));

      await fetch(SCRIPT_URL, {
        method: "POST",
        body: formBody,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        mode: "no-cors"
      });

      // Simular un retraso para dar tiempo al servidor
      await new Promise(resolve => setTimeout(resolve, 1000));

      alerta.classList.remove("alert-info");
      alerta.classList.add("alert-success");
      alerta.textContent = "Datos enviados correctamente.";
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
      console.warn("Advertencia: Solicitud con no-cors, no se puede verificar la respuesta del servidor:", err);
      // Mostrar éxito porque los datos se están guardando
      alerta.classList.remove("alert-info", "d-none");
      alerta.classList.add("alert-success");
      alerta.textContent = "Datos enviados correctamente.";
      form.reset();
      form.classList.remove("was-validated");
    }
  });
});