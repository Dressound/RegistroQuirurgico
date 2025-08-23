/******************************************************
 * CONFIG
 ******************************************************/
const SCRIPT_URL = "https://docs.google.com/forms/u/0/d/e/1FAIpQLSe_A6jax7Mto3gEbfMQXajO1EnrVS9BXHTlfUwHLmtLUp3qWA/formResponse";
const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTIjLmNFr9xaa4rAx0hPrU6fngh76oQezTXJuFl4VlF6xSAJHwU6bS1U8iNqoObuaAEz00hHsCzZdyx/pub?gid=507093533&single=true&output=csv";

let USUARIOS = [];

/******************************************************
 * ESTADO / FLAGS
 ******************************************************/
let usuarioLogueado = null;
let opcionesCargadas = false;
let choicesIniciados = false;
let pacientesRegistrados = [];
let currentPage = 1;
const rowsPerPage = 50;
let camposCSV = [];


$("#prevPage")?.addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    renderizarTabla();
  }
});

$("#nextPage")?.addEventListener("click", () => {
  if (currentPage < Math.ceil(pacientesRegistrados.length / rowsPerPage)) {
    currentPage++;
    renderizarTabla();
  }
});

/******************************************************
 * UTILIDADES
 ******************************************************/
function $(selector) { return document.querySelector(selector); }
function $all(selector) { return Array.from(document.querySelectorAll(selector)); }

function debounce(fn, delay = 200) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function mostrarMensajePermiso(texto) {
  const mensaje = document.getElementById("mensajePermiso");
  mensaje.textContent = texto;
  mensaje.classList.remove("d-none"); // mostrar mensaje
  setTimeout(() => mensaje.classList.add("d-none"), 3000); // desaparecer después de 3s
}
/******************************************************
 * LOGIN
 ******************************************************/
function intentarLogin(usuario, password) {
  return USUARIOS.find(u => u.usuario === usuario && u.password === password) || null;
}

function mostrarApp(user) {
  usuarioLogueado = user;
  sessionStorage.setItem("usuarioLogueado", JSON.stringify(user));

  $("#loginView").style.display = "none";
  $("#appView").style.display = "block";
  $("#welcomeBar").style.display = "block";
  $("#welcomeText").innerHTML = `Bienvenid@, <b>${user.nombre}</b>`;
  $("#usuario_registro").value = user.nombre;

  // Mostrar/Ocultar botones según rol
  // Mostrar botones según rol
  const botones = ["#btnFormulario", "#btnRegistros", "#btnEstadisticas"];
  botones.forEach(id => $(id).style.display = "inline-block");

  $("#usuario_registro").value = user.nombre;

  if (!opcionesCargadas) cargarOpciones();
}

function cerrarSesion() {
  sessionStorage.removeItem("usuarioLogueado");
  usuarioLogueado = null;

  $("#welcomeBar").style.display = "none";
  $("#appView").style.display = "none";
  $("#loginView").style.display = "block";
  $("#welcomeText").innerHTML = "";
  $("#usuario").value = "";
  $("#password").value = "";
}

/******************************************************
 * CARGA DE USUARIOS DESDE JSON
 ******************************************************/
async function cargarUsuarios() {
  try {
    const res = await fetch("usuarios.json");
    if (!res.ok) throw new Error("Error al cargar usuarios.json");
    USUARIOS = await res.json();
  } catch (err) {
    console.error("No se pudieron cargar los usuarios:", err);
  }
}

/******************************************************
 * CARGA SELECTS DESDE JSON
 ******************************************************/
async function cargarOpciones() {
  try {
    // Cargar todos los JSON en paralelo
    const [cirujanos, enfermeros, anestesiologos, diagnosticos] = await Promise.all([
      fetch('cirujanos.json').then(res => res.json()),
      fetch('enfermeros.json').then(res => res.json()),
      fetch('anestesiologos.json').then(res => res.json()),
      fetch('diagnosticos.json').then(res => res.json())
    ]);

    // Llenar selects con depuración
    llenarSelect('medico_cirujano', cirujanos);
    llenarSelect('enfermero', enfermeros);
    llenarSelect('anestesiologo', anestesiologos);
    llenarSelect('diagnostico', diagnosticos, true); // true = mostrar código

    // Inicializar Choices SOLO si los selects existen
    if (!choicesIniciados) {
      inicializarChoices();
      choicesIniciados = true;
    }

    opcionesCargadas = true;
    console.log("Opciones cargadas correctamente.");
  } catch (err) {
    console.error("Error al cargar opciones:", err);
  }
}

function llenarSelect(id, lista, mostrarCodigo = false) {
  const select = document.getElementById(id);
  if (!select) return console.error("Select no encontrado:", id);

  // Limpiar opciones existentes
  select.innerHTML = "";

  // Si existe opción vacía, mantenerla
  const firstOption = select.querySelector('option[value=""]');
  if (firstOption) select.appendChild(firstOption);

  // Agregar opciones
  lista.forEach(item => {
    // Validar que existan los campos esperados
    if (!item.codigo || !item.descripcion) {
      console.warn("Item inválido en JSON:", item);
      return;
    }
    const option = document.createElement("option");
    option.value = item.codigo;
    option.textContent = mostrarCodigo ? `${item.codigo} - ${item.descripcion}` : item.descripcion;
    select.appendChild(option);
  });
}


function inicializarChoices() {
  const selects = $all('select:not([size])');
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

/******************************************************
 * VALIDACIONES Y FECHAS
 ******************************************************/
function setFechaLimites(inputFecha) {
  const hoy = new Date();
  const primerDiaMesActual = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const ultimoDiaMesSiguiente = new Date(hoy.getFullYear(), hoy.getMonth() + 2, 0);
  inputFecha.min = primerDiaMesActual.toISOString().slice(0, 10);
  inputFecha.max = ultimoDiaMesSiguiente.toISOString().slice(0, 10);
}

/******************************************************
 * TABLA DE REGISTROS
 ******************************************************/
function mostrarFormulario() {
  $("#formularioView").style.display = "block";
  $("#tablaView").style.display = "none";
}

function mostrarTabla() {
  $("#formularioView").style.display = "none";
  $("#tablaView").style.display = "block";
  cargarCSV();
}

//TRADUCCION DE VALORES EN LA TABLA A MOSTRAR REGISTROS
let traducciones = {};

async function cargarTraducciones() {
  try {
    // Cargar traducciones generales
    const [data, enfermeros, anestesiologos, cirujanos] = await Promise.all([
      fetch('traducciones.json').then(r => r.json()),
      fetch('enfermeros.json').then(r => r.json()),
      fetch('anestesiologos.json').then(r => r.json()),
      fetch('cirujanos.json').then(r => r.json())
    ]);

    traducciones = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k.toLowerCase().replace(/\s+/g, ''), v])
    );
    traducciones.enfermero = Object.fromEntries(enfermeros.map(e => [e.codigo, e.descripcion]));
    traducciones.anestesiologo = Object.fromEntries(anestesiologos.map(e => [e.codigo, e.descripcion]));
    traducciones.cirujanoprincipal = Object.fromEntries(cirujanos.map(e => [e.codigo, e.descripcion]));
    console.log("Traducciones cargadas:", traducciones);

  } catch (err) {
    console.error("Error cargando traducciones o enfermeros:", err);
  }
}

function valorLegible(campo, valor) {
  if (!valor) return valor;

  const cleanVal = String(valor).trim(); // limpiar espacios
  if (traducciones[campo] && traducciones[campo][cleanVal] !== undefined) {
    return traducciones[campo][cleanVal];
  }
  return valor; // si no hay traducción, deja el valor original
}
///////////////////////////

function cargarCSV() {
  function generarEncabezados() {
    if (pacientesRegistrados.length === 0) return;

    const thead = document.querySelector("#tablaPacientes thead");
    thead.innerHTML = ""; // Limpiar cualquier encabezado previo

    const tr = document.createElement("tr");
    const columnasTraducidas = traducciones.columnas || {}; // <--- agrega esta línea

    Object.keys(pacientesRegistrados[0]).forEach(campo => {
      const th = document.createElement("th");
      // Si existe traducción para el encabezado, usarla; si no, dejar el original
      th.textContent = columnasTraducidas[campo] || campo;
      th.classList.add("encabezadoTabla");
      tr.appendChild(th);
    });

    thead.appendChild(tr);
  }

  Papa.parse(CSV_URL, {
    download: true,
    header: true, // cada fila es un objeto
    skipEmptyLines: true,
    complete: function (results) {
      // Filtrar filas vacías
      pacientesRegistrados = results.data.filter(row => Object.values(row).some(val => val.trim() !== ""));
      if (pacientesRegistrados.length === 0) return;

      // Guardar campos para traducciones
      camposCSV = Object.keys(pacientesRegistrados[0]).map(h => h.toLowerCase().replace(/\s+/g, ''));

      generarEncabezados();
      renderizarTabla();
    },

    error: function (err) {
      console.error("Error cargando CSV:", err);
    }
  });

}

function renderizarTabla() {
  const tbody = $("#tablaPacientes tbody");
  const buscador = $("#buscador").value.toLowerCase();

  const filtered = pacientesRegistrados.filter(p =>
    Object.values(p).join(" ").toLowerCase().includes(buscador)
  );

  const totalPages = Math.ceil(filtered.length / rowsPerPage);
  if (currentPage > totalPages) currentPage = totalPages || 1;

  const start = (currentPage - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const pageItems = filtered.slice(start, end);

  tbody.innerHTML = "";

  // Ya solo renderiza la página actual
  const fragment = document.createDocumentFragment();
  pageItems.forEach(row => {
    const tr = document.createElement("tr");
    Object.entries(row).forEach(([campo, val]) => {
      const td = document.createElement("td");
      td.textContent = valorLegible(campo.toLowerCase().replace(/\s+/g, ''), val);
      td.style.padding = "6px";
      tr.appendChild(td);
    });
    fragment.appendChild(tr);
  });

  tbody.innerHTML = "";
  tbody.appendChild(fragment);

  $("#pageInfo").textContent = `Página ${currentPage} de ${totalPages || 1}`;
}


let chartProcedimientos = null;
let chartSexo = null;

function generarEstadisticas(fechaFiltro = "") {
  // Filtrar datos
  let datos = pacientesRegistrados;
  if (fechaFiltro) {
    datos = datos.filter(p => p[2] === fechaFiltro); // columna 2 = fecha
  }

  // Contar Procedimientos y Sexo
  const contProcedimientos = {};
  const contSexo = {};

  datos.forEach(p => {
    const tipo = p[13] || "Desconocido"; // Procedimiento Realizado
    const sexo = p[4] || "Desconocido";  // Sexo
    contProcedimientos[tipo] = (contProcedimientos[tipo] || 0) + 1;
    contSexo[sexo] = (contSexo[sexo] || 0) + 1;
  });

  const tipos = Object.keys(contProcedimientos);
  const cantidades = Object.values(contProcedimientos);

  const sexos = Object.keys(contSexo);
  const cantidadesSexo = Object.values(contSexo);

  // Destruir gráficos anteriores si existen
  if (chartProcedimientos) chartProcedimientos.destroy();
  if (chartSexo) chartSexo.destroy();

  // Gráfico de Procedimientos
  const ctxProc = document.getElementById("graficoProcedimientos").getContext("2d");
  chartProcedimientos = new Chart(ctxProc, {
    type: 'bar',
    data: {
      labels: tipos,
      datasets: [{
        label: 'Cantidad de Procedimientos',
        data: cantidades,
        backgroundColor: '#17a2b8'
      }]
    },
    options: {
      responsive: false,          // desactiva auto ajuste
      maintainAspectRatio: false, // respetar tamaño del contenedor
      plugins: { legend: { display: false } }
    }
  });

  // Gráfico de Sexo
  const ctxSexo = document.getElementById("graficoSexo").getContext("2d");
  chartSexo = new Chart(ctxSexo, {
    type: 'pie',
    data: {
      labels: sexos,
      datasets: [{
        label: 'Sexo de Pacientes',
        data: cantidadesSexo,
        backgroundColor: ['#007bff', '#dc3545', '#6c757d']
      }]
    },
    options: {
      responsive: false,
      maintainAspectRatio: false
    }
  });
}


function cambiarPagina(offset) {
  currentPage += offset;
  renderizarTabla();
}

/******************************************************
 * INICIO
 ******************************************************/
document.addEventListener("DOMContentLoaded", async () => {

  // Cargar CSV y traducciones en paralelo
  await Promise.all([cargarTraducciones(), cargarCSV()]);

  // Botón “Estadísticas”
  $("#btnEstadisticas").addEventListener("click", () => {
    if (usuarioLogueado.rol !== "admin") {
      return mostrarMensajePermiso("No tienes permisos para ver estadísticas");
    }
    $("#tablaView").style.display = "none";
    $("#formularioView").style.display = "none";
    $("#estadisticasView").style.display = "block";

    // Generar gráficos con la fecha que esté seleccionada (vacía = todo)
    const fecha = $("#fechaFiltro").value;
    generarEstadisticas(fecha);
  });

  // Filtro de fecha
  $("#fechaFiltro").addEventListener("change", (e) => {
    generarEstadisticas(e.target.value);
  });

  const loginForm = $("#loginForm");
  const loginError = $("#loginError");
  const btnLogout = $("#btnLogout");

  $("#btnFormulario").addEventListener("click", () => {
    $("#formularioView").style.display = "block";
    $("#tablaView").style.display = "none";
    $("#estadisticasView").style.display = "none";
  });

  $("#btnRegistros").addEventListener("click", () => {
    $("#formularioView").style.display = "none";
    $("#tablaView").style.display = "block";
    $("#estadisticasView").style.display = "none";
    cargarCSV();
  });

  function debounce(fn, delay) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  $("#buscador")?.addEventListener("input", debounce(() => renderizarTabla(), 200));

  await cargarUsuarios();

  const guardado = sessionStorage.getItem("usuarioLogueado");
  if (guardado) mostrarApp(JSON.parse(guardado));
  else $("#loginView").style.display = "block";

  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const usuario = $("#usuario").value.trim();
    const password = $("#password").value.trim();
    const user = intentarLogin(usuario, password);
    if (user) {
      loginError.textContent = "";
      mostrarApp(user);
    } else {
      loginError.textContent = "Usuario o contraseña incorrectos";
    }
  });

  btnLogout.addEventListener("click", (e) => {
    e.preventDefault();
    cerrarSesion();
  });

  /*********** FORMULARIO QUIRÚRGICO ***********/
  const form = $("#quirForm");
  const alerta = $("#alertaRespuesta");
  const fechaInput = $("#fecha");
  setFechaLimites(fechaInput);

  $("#cedula").addEventListener("input", function () {
    const cedula = this.value;
    if (cedula.length === 10 && /^\d{10}$/.test(cedula)) this.setCustomValidity("");
    else this.setCustomValidity("La cédula debe tener 10 dígitos numéricos.");
  });

  $("#hcl").addEventListener("input", function () {
    const hcl = this.value;
    if (/^\d+$/.test(hcl)) this.setCustomValidity("");
    else this.setCustomValidity("La historia clínica debe contener solo números.");
  });

  fechaInput.addEventListener("change", function () {
    const fecha = new Date(this.value);
    const minDate = new Date(this.min);
    const maxDate = new Date(this.max);
    if (fecha < minDate || fecha > maxDate) this.setCustomValidity("La fecha debe estar en el mes actual o siguiente.");
    else this.setCustomValidity("");
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!usuarioLogueado) {
      alerta.classList.remove("d-none", "alert-success", "alert-info");
      alerta.classList.add("alert-danger");
      alerta.textContent = "Debe iniciar sesión para enviar el formulario.";
      return;
    }

    if (!form.checkValidity()) {
      form.classList.add("was-validated");
      return;
    }

    const formData = new FormData(form);
    const dataObj = Object.fromEntries(formData.entries());

    let fechaYear = '', fechaMonth = '', fechaDay = '';
    if (dataObj.fecha) {
      const [year, month, day] = dataObj.fecha.split('-');
      fechaYear = year; fechaMonth = month; fechaDay = day;
    }

    const mapping = {
      usuario_registro: 'entry.1072257536',
      estado: 'entry.487126253',
      fecha: { year: 'entry.365267802_year', month: 'entry.365267802_month', day: 'entry.365267802_day' },
      nombres: 'entry.129819069',
      sexo: 'entry.411420745',
      edad: 'entry.2142979259',
      hcl: 'entry.2104873773',
      cedula: 'entry.1351880325',
      especialidad: 'entry.44199439',
      procedencia: 'entry.1988959802',
      qx: 'entry.51260872',
      hora_llamada_hospitalizado: 'entry.1896317539',
      hora_llamada_emergencia: 'entry.1041618293',
      hora_cirugia_programada: 'entry.1995690425',
      hora_llegada_cqx: 'entry.475374554',
      hora_entrada_quirofano: 'entry.1726212408',
      hora_llegada_anestesiologo: 'entry.1981970497',
      hora_inicio_anestesia: 'entry.270921844',
      hora_fin_anestesia: 'entry.526398815',
      hora_salida_anestesiologo: 'entry.1522781365',
      hora_llegada_cirujano: 'entry.486157334',
      hora_inicio_cirujano: 'entry.188160866',
      hora_fin_cirujano: 'entry.975478532',
      hora_salida_cirujano: 'entry.442187380',
      hora_inicio_desinfeccion: 'entry.140140796',
      hora_fin_desinfeccion: 'entry.566458365',
      hora_inicio_limpieza: 'entry.701289561',
      hora_fin_limpieza: 'entry.844668019',
      medico_cirujano: 'entry.447555786',
      enfermero: 'entry.1042485773',
      anestesiologo: 'entry.700782129',
      diagnostico: 'entry.1236994085',
      observaciones: 'entry.1285987142',
      tipo: 'entry.1820166925',
      procedimientoRealizado: 'entry.1776562404',
      priayudantecir: 'entry.497081423',
      ayudanteAnestesiologo: 'entry.2060304106',
      tipoAnestesia: 'entry.84166006',
      instrumentista: 'entry.364278059',
      circulante: 'entry.1683147629',
      instrumentistaRecibe: 'entry.1151898401',
      circulanteRecibe: 'entry.705613535',
      canalizaPaciente: 'entry.1150100577',
      recuperacion: 'entry.645393412',
      listaVerificacion: 'entry.927804697',
      profilaxis: 'entry.387616470',
      marcacionQuirurgica: 'entry.564715053',
      pacienteBrazalete: 'entry.1998975230',
      pacienteIdentificado: 'entry.417762088',
      suspendidoPor: 'entry.428608782',
      horaEntrega: 'entry.1752272102',
      fechaEntrega: 'entry.1707511039',
      segayudantecir: 'entry.1007786212',
      priayudanteenf: 'entry.405214287',
      horaTraenParte: 'entry.754781265'
    };

    // Generar automáticamente formBody
    function generarFormBody(mapping, dataObj) {
      const formBody = new URLSearchParams();
      for (let key in mapping) {
        if (key === 'fecha' && dataObj.fecha) {
          const [year, month, day] = dataObj.fecha.split("-");
          formBody.append(mapping.fecha.year, year);
          formBody.append(mapping.fecha.month, month);
          formBody.append(mapping.fecha.day, day);
        } else {
          formBody.append(mapping[key], dataObj[key] || "");
        }
      }
      return formBody;
    }
    try {
      alerta.classList.remove("alert-danger", "d-none", "alert-success");
      alerta.classList.add("alert-info");
      alerta.textContent = "Guardando... por favor espere";

      const formBody = generarFormBody(mapping, dataObj);

      await fetch(SCRIPT_URL, {
        method: "POST",
        body: formBody,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        mode: "no-cors"
      });

      await new Promise(resolve => setTimeout(resolve, 900));

      alerta.classList.remove("alert-info");
      alerta.classList.add("alert-success");
      alerta.textContent = "Datos enviados correctamente.";

      form.reset();
      form.classList.remove("was-validated");

      mostrarTabla(); // refrescar registros
    } catch (err) {
      console.error(err);
      alerta.classList.remove("alert-info", "d-none");
      alerta.classList.add("alert-danger");
      alerta.textContent = "Error enviando los datos. Revisa la conexión.";
    }
  });
});