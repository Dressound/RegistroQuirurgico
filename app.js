/******************************************************
 * CONFIG Y ESTADO
 ******************************************************/
let USUARIOS = [
  { "usuario": "admin", "password": "12345", "nombre": "Dr. Hugo Tapia" },
  { "usuario": "yamilet", "password": "anestesia", "nombre": "Dra. Yamilet Pérez" },
  { "usuario": "jhonny", "password": "enfermeria", "nombre": "Enf. Jhonny Rosero" }
];

let usuarioLogueado = null;
let opcionesCargadas = false;
let choicesIniciados = false;

/******************************************************
 * SELECTORES UTILES
 ******************************************************/
function $(selector) { return document.querySelector(selector); }
function $all(selector) { return Array.from(document.querySelectorAll(selector)); }

/******************************************************
 * LOGIN
 ******************************************************/
function intentarLogin(usuario, password) {
  const user = USUARIOS.find(u => u.usuario === usuario && u.password === password);
  return user || null;
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
 * CARGA SELECTS
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
  select.innerHTML = '';
  lista.forEach(item => {
    const option = document.createElement('option');
    option.value = item.codigo;
    option.textContent = item.descripcion;
    select.appendChild(option);
  });
}

function llenarSelectDiagnosticos(id, lista) {
  const select = document.getElementById(id);
  select.innerHTML = '';
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
 * INICIO
 ******************************************************/
document.addEventListener("DOMContentLoaded", () => {
  const loginForm = $("#loginForm");
  const loginError = $("#loginError");
  const btnLogout = $("#btnLogout");

  // Restaurar sesión si existe
  const guardado = sessionStorage.getItem("usuarioLogueado");
  if (guardado) {
    mostrarApp(JSON.parse(guardado));
  } else {
    $("#loginView").style.display = "block";
  }

  // Login submit
  loginForm.addEventListener("submit", e => {
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

  // Logout
  btnLogout.addEventListener("click", e => {
    e.preventDefault();
    cerrarSesion();
  });
});
