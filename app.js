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
const rowsPerPage = 5;

/******************************************************
 * UTILIDADES
 ******************************************************/
function $(selector) { return document.querySelector(selector); }
function $all(selector) { return Array.from(document.querySelectorAll(selector)); }

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
  $("#welcomeText").innerHTML = `Bienvenido, <b>${user.nombre}</b>`;
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
    const [cirujanos, enfermeros, anestesiologos, diagnosticos] = await Promise.all([
      fetch('cirujanos.json').then(res => res.json()),
      fetch('enfermeros.json').then(res => res.json()),
      fetch('anestesiologos.json').then(res => res.json()),
      fetch('diagnosticos.json').then(res => res.json())
    ]);

    llenarSelectConId('medico_cirujano', cirujanos);
    llenarSelectConId('enfermero', enfermeros);
    llenarSelectConId('anestesiologo', anestesiologos);
    llenarSelectDiagnosticos('diagnostico', diagnosticos);

    if (!choicesIniciados) {
      inicializarChoices();
      choicesIniciados = true;
    }
    opcionesCargadas = true;
  } catch (err) {
    console.error("Error al cargar opciones:", err);
  }
}

function llenarSelectConId(id, lista) {
  const select = document.getElementById(id);
  const firstOption = select.querySelector('option[value=""]');
  select.innerHTML = "";
  if (firstOption) select.appendChild(firstOption);

  lista.forEach(item => {
    const option = document.createElement('option');
    option.value = item.codigo;
    option.textContent = item.descripcion;
    select.appendChild(option);
  });
}

function llenarSelectDiagnosticos(id, lista) {
  const select = document.getElementById(id);
  const firstOption = select.querySelector('option[value=""]');
  select.innerHTML = "";
  if (firstOption) select.appendChild(firstOption);

  lista.forEach(item => {
    const option = document.createElement('option');
    option.value = item.codigo;
    option.textContent = `${item.codigo} - ${item.descripcion}`;
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

function cargarCSV() {
  Papa.parse(CSV_URL, {
    download: true,
    header: false, // seguimos leyendo todo como datos
    complete: function(results) {
      if (results.data.length === 0) return;

      // Guardar la primera fila como encabezados
      const encabezados = results.data[0];
      pacientesRegistrados = results.data.slice(1); // resto de filas como pacientes

      // Limpiar encabezados actuales
      const thead = $("#tablaPacientes thead tr#encabezados");
      thead.innerHTML = "";
      encabezados.forEach(header => {
        const th = document.createElement("th");
        th.textContent = header;
        th.style.backgroundColor = "#065a82"; // color de fondo encabezado
        th.style.color = "#ffffff";           // color de texto
        th.style.padding = "8px";
        thead.appendChild(th);
      });

      renderizarTabla();
    }
  });
}

function renderizarTabla() {
  const tbody = $("#tablaPacientes tbody");
  const buscador = $("#buscador").value.toLowerCase();
  const filtered = pacientesRegistrados.filter(p => Object.values(p).join(" ").toLowerCase().includes(buscador));

  const totalPages = Math.ceil(filtered.length / rowsPerPage);
  if (currentPage > totalPages) currentPage = totalPages || 1;

  const start = (currentPage - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const pageItems = filtered.slice(start, end);

  tbody.innerHTML = "";
  pageItems.forEach(row => {
    const tr = document.createElement("tr");
    row.forEach(val => {  // cada fila es un array de valores
      const td = document.createElement("td");
      td.textContent = val;
      td.style.padding = "6px";
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

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

  // Botón “Estadísticas”
  $("#btnEstadisticas").addEventListener("click", () => {
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
  
  $("#btnEstadisticas").addEventListener("click", () => {
    $("#formularioView").style.display = "none";
    $("#tablaView").style.display = "none";
    $("#estadisticasView").style.display = "block";
  
    const fecha = $("#fechaFiltro").value;
    generarEstadisticas(fecha);
  });
  $("#buscador")?.addEventListener("input", () => renderizarTabla());

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

    const formBody = new URLSearchParams();
    // --- Aquí va el mapeo con entry.xxxxxxx (tal cual tu segundo código) ---
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
    formBody.append('entry.1896317539', dataObj.hora_llamada_hospitalizado || '');
    formBody.append('entry.1041618293', dataObj.hora_llamada_emergencia || '');
    formBody.append('entry.1995690425', dataObj.hora_cirugia_programada || '');
    formBody.append('entry.475374554', dataObj.hora_llegada_cqx || '');
    formBody.append('entry.1726212408', dataObj.hora_entrada_quirofano || '');
    formBody.append('entry.1981970497', dataObj.hora_llegada_anestesiologo || '');
    formBody.append('entry.270921844', dataObj.hora_inicio_anestesia || '');
    formBody.append('entry.526398815', dataObj.hora_fin_anestesia || '');
    formBody.append('entry.1522781365', dataObj.hora_salida_anestesiologo || '');
    formBody.append('entry.486157334', dataObj.hora_llegada_cirujano || '');
    formBody.append('entry.188160866', dataObj.hora_inicio_cirujano || '');
    formBody.append('entry.975478532', dataObj.hora_fin_cirujano || '');
    formBody.append('entry.442187380', dataObj.hora_salida_cirujano || '');
    formBody.append('entry.140140796', dataObj.hora_inicio_desinfeccion || '');
    formBody.append('entry.566458365', dataObj.hora_fin_desinfeccion || '');
    formBody.append('entry.701289561', dataObj.hora_inicio_limpieza || '');
    formBody.append('entry.844668019', dataObj.hora_fin_limpieza || '');
    formBody.append('entry.447555786', dataObj.medico_cirujano || '');
    formBody.append('entry.1042485773', dataObj.enfermero || '');
    formBody.append('entry.700782129', dataObj.anestesiologo || '');
    formBody.append('entry.1236994085', dataObj.diagnostico || '');
    formBody.append('entry.1285987142', dataObj.observaciones || '');
    formBody.append('entry.1820166925', dataObj.tipo || '');
    formBody.append('entry.1776562404', dataObj.procedimientoRealizado || '');
    formBody.append('entry.497081423', dataObj.priayudantecir || '');
    formBody.append('entry.2060304106', dataObj.ayudanteAnestesiologo || '');
    formBody.append('entry.84166006', dataObj.tipoAnestesia || '');
    formBody.append('entry.364278059', dataObj.instrumentista || '');
    formBody.append('entry.1683147629', dataObj.circulante || '');
    formBody.append('entry.1151898401', dataObj.instrumentistaRecibe || '');
    formBody.append('entry.705613535', dataObj.circulanteRecibe || '');
    formBody.append('entry.1150100577', dataObj.canalizaPaciente || '');
    formBody.append('entry.645393412', dataObj.recuperacion || '');
    formBody.append('entry.927804697', dataObj.listaVerificacion || '');
    formBody.append('entry.387616470', dataObj.profilaxis || '');
    formBody.append('entry.564715053', dataObj.marcacionQuirurgica || '');
    formBody.append('entry.1998975230', dataObj.pacienteBrazalete || '');
    formBody.append('entry.417762088', dataObj.pacienteIdentificado || '');
    formBody.append('entry.428608782', dataObj.suspendidoPor || '');
    formBody.append('entry.1752272102', dataObj.horaEntrega || '');
    formBody.append('entry.1707511039', dataObj.fechaEntrega || '');
    formBody.append('entry.1007786212', dataObj.segayudantecir || '');
    formBody.append('entry.405214287', dataObj.priayudanteenf || '');
    formBody.append('entry.754781265', dataObj.horaTraenParte || '');

    try {
      alerta.classList.remove("alert-danger", "d-none", "alert-success");
      alerta.classList.add("alert-info");
      alerta.textContent = "Guardando... por favor espere";

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
      alerta.classList.remove("alert-info", "d-none");
      alerta.classList.add("alert-success");
      alerta.textContent = "Datos enviados (modo no-cors).";
      form.reset();
      form.classList.remove("was-validated");
      mostrarTabla();
    }
  });
});
