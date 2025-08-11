const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxrSwJsiMmc8x4vIogAkAWuULW6f_13aHKvXUfxebcWjNCHbOQROb4vxaQcmassBYrN4g/exec";

async function cargarOpciones() {
  try {
    const [cirujanos, enfermeros, instrumentistas, diagnosticos] = await Promise.all([
      fetch('cirujanos.json').then(res => {
        if (!res.ok) throw new Error('Error al cargar cirujanos.json');
        return res.json();
      }),
      fetch('enfermeros.json').then(res => {
        if (!res.ok) throw new Error('Error al cargar enfermeros.json');
        return res.json();
      }),
      fetch('instrumentistas.json').then(res => {
        if (!res.ok) throw new Error('Error al cargar instrumentistas.json');
        return res.json();
      }),
      fetch('diagnosticos.json').then(res => {
        if (!res.ok) throw new Error('Error al cargar diagnosticos.json');
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

      console.log("Enviando datos:", dataObj); // Depuración

      const res = await fetch(SCRIPT_URL, {
        method: "POST",
        body: JSON.stringify(dataObj),
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        throw new Error(`Error HTTP: ${res.status} ${res.statusText}`);
      }

      const result = await res.json();

      if (result.status === "OK") {
        alerta.classList.remove("alert-info");
        alerta.classList.add("alert-success");
        alerta.textContent = `Registro guardado con éxito. Nº asignado: ${result.numero}`;
        form.reset();
        form.classList.remove("was-validated");
        document.getElementById("numero").value = result.numero;

        const selects = document.querySelectorAll('select');
        selects.forEach(select => {
          const choicesInstance = select.choices;
          if (choicesInstance) {
            choicesInstance.setChoiceByValue("");
          }
        });
      } else {
        throw new Error(result.message || "Error en el servidor");
      }
    } catch (err) {
      console.error("Error en la solicitud:", err);
      alerta.classList.remove("alert-info");
      alerta.classList.add("alert-danger");
      alerta.textContent = "Error al guardar los datos: " + err.message;
    }
  });
});