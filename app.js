const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyvTyZxbdgysSeDKaPSRdV5j1jIUzItR5vne8Q5qnWeHqdNBQcrWVs6UjpJEDoJC4Cwjg/exec";

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

    try {
      alerta.classList.remove("alert-danger", "d-none");
      alerta.classList.add("alert-info");
      alerta.textContent = "Guardando... por favor espere";

      console.log("Enviando datos:", dataObj);

      await fetch(SCRIPT_URL, {
        method: "POST",
        body: JSON.stringify(dataObj),
        headers: { "Content-Type": "application/json" },
        mode: "no-cors" // Evita el bloqueo por CORS
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