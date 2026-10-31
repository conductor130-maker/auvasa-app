let DATOS = { lineas: [] };
let favoritos = JSON.parse(localStorage.getItem('auvasa_favoritos') || '{"grupos":[]}');
let historial = [];
let lineaActual = null;
let grupoActual = null;
let cocheIndexActual = 0;
let listaGruposFiltrada = [];
let favoritoPendiente = null;

// ---------- CARGA DE DATOS BLINDADA ----------
async function cargarDatos() {
  const grid = document.getElementById('grid-tipos');
  try {
    const res = await fetch('horarios.json');
    if (!res.ok) throw new Error('No se pudo cargar horarios.json (HTTP ' + res.status + ')');
    const texto = await res.text();
    
    try {
      DATOS = JSON.parse(texto);
    } catch (jsonErr) {
      // Si el JSON está mal, extraemos la línea exacta del error
      const match = jsonErr.message.match(/position (\d+)/);
      let extra = '';
      if (match) {
        const pos = parseInt(match[1]);
        const antes = texto.substring(0, pos);
        const linea = antes.split('\n').length;
        extra = ' (aprox. línea ' + linea + ')';
      }
      throw new Error('JSON inválido' + extra + ': ' + jsonErr.message + '. Valídalo en https://jsonlint.com');
    }
    
    if (!DATOS.lineas || !Array.isArray(DATOS.lineas)) {
      throw new Error('El JSON no tiene la propiedad "lineas" o no es una lista.');
    }
    
    renderTipos();
  } catch (e) {
    console.error('Error cargando datos:', e);
    grid.innerHTML = '<div style="grid-column:1/-1;padding:20px;background:#fff;color:#E30613;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,0.1);"><h3>⚠️ Error cargando horarios</h3><p style="margin-top:10px;font-weight:bold;">' + e.message + '</p></div>';
  }
}

function irA(id) {
  document.querySelectorAll('.pantalla').forEach(p => p.classList.remove('activa'));
  document.getElementById(id).classList.add('activa');
  window.scrollTo(0, 0);
}
function volverAtras() {
  const anterior = historial.pop();
  if (anterior) irA(anterior);
  else irA('pantalla-tipos');
}
function navegar(id) {
  const actual = document.querySelector('.pantalla.activa');
  if (actual && actual.id !== id) historial.push(actual.id);
  irA(id);
}

const TIPOS = [
  { id: 'ordinaria', emoji: '🚌', nombre: 'Líneas Ordinarias' },
  { id: 'matinal', emoji: '🌅', nombre: 'Líneas Matinales' },
  { id: 'laboral', emoji: '🏭', nombre: 'Laborales y Polígonos' },
  { id: 'buho', emoji: '🦉', nombre: 'Líneas Búho' },
  { id: 'futbol', emoji: '⚽', nombre: 'Servicios Fútbol' },
  { id: 'lanzadera', emoji: '🎓', nombre: 'Lanzaderas y Univ.' },
  { id: 'personal', emoji: '🚐', nombre: 'Coches de Personal' },
  { id: 'manual', emoji: '📖', nombre: 'Manual y Normativa' }
];

function renderTipos() {
  const grid = document.getElementById('grid-tipos');
  grid.innerHTML = TIPOS.map(t =>
    '<button class="boton-tipo tipo-' + t.id + '" onclick="mostrarLineas(\'' + t.id + '\')">' +
      '<span class="emoji">' + t.emoji + '</span><span>' + t.nombre + '</span>' +
    '</button>'
  ).join('');
}

function mostrarLineas(tipoId) {
  const tipo = TIPOS.find(t => t.id === tipoId);
  document.getElementById('titulo-tipo').textContent = tipo.nombre;
  const lineas = DATOS.lineas.filter(l => l.tipo === tipoId);
  const grid = document.getElementById('grid-lineas');
  
  if (lineas.length === 0) {
    grid.innerHTML = '<p style="text-align:center;padding:40px;">No hay líneas disponibles.</p>';
  } else {
    grid.innerHTML = lineas.map(l =>
      '<div class="tarjeta-linea">' +
        '<div><span class="num">' + l.id + '</span><div class="nombre">' + l.nombre + '</div></div>' +
        '<div class="botones-linea">' +
          '<button class="btn-recorrido" onclick="verRecorrido(\'' + l.id + '\')">🗺️ Recorrido</button>' +
          '<button class="btn-horario" onclick="verGruposCoches(\'' + l.id + '\')">⏱️ Horarios</button>' +
        '</div>' +
      '</div>'
    ).join('');
  }
  navegar('pantalla-lineas');
}

function verRecorrido(id) {
  const linea = DATOS.lineas.find(l => l.id === id);
  lineaActual = linea;
  document.getElementById('titulo-recorrido').textContent = 'Línea ' + linea.id + ' – ' + linea.nombre;
  let html = '';
  if(linea.recorridos) {
    linea.recorridos.forEach(r => {
      html += '<div class="bloque-recorrido"><h3>' + r.sentido + '</h3><ol>' +
        r.paradas.map(p => '<li>' + p + '</li>').join('') + '</ol></div>';
    });
  }
  if (linea.letreros && linea.letreros.length) {
    html += '<div class="bloque-recorrido"><h3>📟 Letreros CUBE</h3><ul class="lista-letreros">' +
      linea.letreros.map(l => '<li>' + l + '</li>').join('') + '</ul></div>';
  }
  if (linea.notas && linea.notas.length) {
    html += '<div class="bloque-recorrido"><h3>📝 Notas</h3><ul class="lista-notas">' +
      linea.notas.map(n => '<li>' + n + '</li>').join('') + '</ul></div>';
  }
  if (linea.paginaRecorridoPDF) {
    html += '<div class="bloque-recorrido"><a class="btn-pdf" href="libro_horarios.pdf#page=' + linea.paginaRecorridoPDF + '" target="_blank">📄 Ver PDF</a></div>';
  }
  document.getElementById('contenido-recorrido').innerHTML = html;
  navegar('pantalla-recorrido');
}

function verGruposCoches(id) {
  const linea = DATOS.lineas.find(l => l.id === id);
  lineaActual = linea;
  document.getElementById('titulo-horarios').textContent = 'Turnos Línea ' + linea.id;
  document.getElementById('filtros-dia').innerHTML = '';
  
  listaGruposFiltrada = linea.horarios || [];
  const cont = document.getElementById('lista-horarios');
  
  if (!listaGruposFiltrada.length) {
    cont.innerHTML = '<p style="text-align:center;padding:20px;">No hay horarios cargados.</p>';
    navegar('pantalla-horarios');
    return;
  }

  cont.innerHTML = listaGruposFiltrada.map((h, i) =>
    '<button class="boton-grupo" onclick="abrirGrupo(' + i + ')">' +
      '<div class="grupo-titulo">' + h.nombre + '</div>' +
      '<div class="grupo-sub">' + h.tipoDia + '</div>' +
      '<div class="grupo-accion">Elegir horario ▶</div>' +
    '</button>'
  ).join('');
  
  navegar('pantalla-horarios');
}

function abrirGrupo(grupoIndex) {
  const grupo = listaGruposFiltrada[grupoIndex];
  grupoActual = grupo;

  let coches = [];
  if (Array.isArray(grupo.cochesDetalle) && grupo.cochesDetalle.length) {
    coches = grupo.cochesDetalle;
  } else if (Array.isArray(grupo.salidas) && grupo.salidas.length) {
    coches = grupo.salidas.map(function (s, i) {
      return {
        nombre: s.horario || ('Horario ' + (i + 1)),
        primeraSalida: s.hora || '—',
        retirada: grupo.retirada || '',
        salidas: [{ cabecera: s.cabecera, hora: s.hora }],
        _incompleto: true
      };
    });
  }

  grupoActual.cochesDetalle = coches;
  document.getElementById('titulo-coches').textContent = 'Línea ' + lineaActual.id + ' · ' + grupo.nombre;

  if (!coches.length) {
    document.getElementById('lista-coches').innerHTML = '<div style="padding:20px;text-align:center;">No hay turnos cargados.</div>';
    navegar('pantalla-coches');
    return;
  }

  const lista = document.getElementById('lista-coches');
  lista.innerHTML = coches.map((coche, i) =>
    '<button class="btn-coche" onclick="verDetalleCoche(' + i + ')">' +
      '<div class="info-coche">' +
        '<span class="titulo-coche">' + coche.nombre + '</span>' +
        '<span class="retirada">' + (coche.retirada || '') + '</span>' +
      '</div>' +
      '<span class="primera">' + (coche.primeraSalida || '—') + '</span>' +
    '</button>'
  ).join('');

  navegar('pantalla-coches');
}

function verDetalleCoche(cocheIndex) {
  cocheIndexActual = cocheIndex;
  const coche = grupoActual.cochesDetalle[cocheIndex];
  const cont = document.getElementById('detalle-horario');

  const primera = coche.salidas && coche.salidas[0];
  const ultima = coche.salidas && coche.salidas[coche.salidas.length - 1];
  const incompleto = coche._incompleto || (coche.salidas && coche.salidas.length <= 1);

  let html = '';

  if (incompleto) {
    html += '<div style="background:#FFF4E0;border-left:4px solid #F39200;padding:14px;border-radius:10px;margin-bottom:16px;font-size:0.9rem;color:#6B4A00;">' +
      '<b>⚠️ Turno incompleto en la app.</b><br>Consulta el PDF oficial para ver todas las salidas de este coche.</div>';
  }

  html += '<div class="tarjeta-principal">' +
    '<h3>L' + lineaActual.id + ' · ' + grupoActual.nombre + ' · ' + coche.nombre + '</h3>' +
    '<div class="sub">' + grupoActual.tipoDia + '</div>' +
    '<div class="dato"><span>Primera salida</span><strong>' + (primera ? primera.hora + ' (' + primera.cabecera + ')' : '—') + '</strong></div>' +
    '<div class="dato"><span>Última salida</span><strong>' + (ultima ? ultima.hora + ' (' + ultima.cabecera + ')' : '—') + '</strong></div>' +
    '<div class="dato"><span>Retirada</span><strong>' + (coche.retirada || '—') + '</strong></div>' +
  '</div>';

  const total = grupoActual.cochesDetalle.length;
  html += '<div class="nav-horarios">' +
    '<button ' + (cocheIndex === 0 ? 'disabled' : '') + ' onclick="verDetalleCoche(' + (cocheIndex - 1) + ')">◀ Anterior</button>' +
    '<button ' + (cocheIndex === total - 1 ? 'disabled' : '') + ' onclick="verDetalleCoche(' + (cocheIndex + 1) + ')">Siguiente ▶</button>' +
  '</div>';

  if (coche.salidas && coche.salidas.length > 1) {
    const cabeceras = [];
    coche.salidas.forEach(s => { if (cabeceras.indexOf(s.cabecera) === -1) cabeceras.push(s.cabecera); });

    if (cabeceras.length === 2) {
      const col1 = cabeceras[0], col2 = cabeceras[1];
      const filas1 = coche.salidas.filter(s => s.cabecera === col1);
      const filas2 = coche.salidas.filter(s => s.cabecera === col2);
      const maxFilas = Math.max(filas1.length, filas2.length);
      html += '<table class="tabla-pdf"><thead><tr><th>' + col1 + '</th><th>' + col2 + '</th></tr></thead><tbody>';
      for (let i = 0; i < maxFilas; i++) {
        html += '<tr><td>' + (filas1[i] ? filas1[i].hora : '') + '</td><td>' + (filas2[i] ? filas2[i].hora : '') + '</td></tr>';
      }
      html += '</tbody></table>';
    } else {
      html += '<table class="tabla-pdf"><thead><tr><th>Cabecera</th><th>Hora</th></tr></thead><tbody>' +
        coche.salidas.map(s => '<tr><td>' + s.cabecera + '</td><td>' + s.hora + '</td></tr>').join('') + '</tbody></table>';
    }
  }

  html += '<div class="acciones-detalle">' +
    '<button class="btn-fav" onclick="abrirModalFavorito()">⭐ Guardar</button>' +
    (grupoActual.paginaPDF ? '<a class="btn-pdf-detalle" href="libro_horarios.pdf#page=' + grupoActual.paginaPDF + '" target="_blank">📄 Ver PDF</a>' : '') +
  '</div>';

  cont.innerHTML = html;
  navegar('pantalla-detalle');
}

function abrirModalFavorito() {
  favoritoPendiente = {
    lineaId: lineaActual.id, lineaNombre: lineaActual.nombre,
    grupo: grupoActual.nombre,
    coche: grupoActual.cochesDetalle[cocheIndexActual].nombre,
    tipoDia: grupoActual.tipoDia,
    paginaPDF: grupoActual.paginaPDF || null,
    primeraSalida: grupoActual.cochesDetalle[cocheIndexActual].primeraSalida
  };
  document.getElementById('modalFavorito').classList.remove('oculto');
  document.getElementById('nombreGrupo').value = '';
  const cont = document.getElementById('gruposExistentes');
  cont.innerHTML = favoritos.grupos.map((g, i) =>
    '<span class="grupo-opcion" onclick="document.getElementById(\'nombreGrupo\').value=\'' + g.nombre + '\'; this.classList.add(\'seleccionado\')">' + g.nombre + '</span>'
  ).join('');
}

function cerrarModal() { document.getElementById('modalFavorito').classList.add('oculto'); }

function guardarFavorito() {
  const nombre = document.getElementById('nombreGrupo').value.trim();
  if (!nombre) return;
  let grupo = favoritos.grupos.find(g => g.nombre.toLowerCase() === nombre.toLowerCase());
  if (!grupo) { grupo = { nombre: nombre, horarios: [] }; favoritos.grupos.push(grupo); }
  grupo.horarios.push(favoritoPendiente);
  localStorage.setItem('auvasa_favoritos', JSON.stringify(favoritos));
  cerrarModal();
  alert('Guardado en ' + nombre);
}

function renderFavoritos() {
  const cont = document.getElementById('contenido-favoritos');
  if (!favoritos.grupos.length) {
    cont.innerHTML = '<p style="text-align:center;padding:40px;">No hay favoritos.</p>'; return;
  }
  cont.innerHTML = favoritos.grupos.map((g, gi) =>
    '<div class="grupo-favoritos"><h3>📁 ' + g.nombre + '</h3>' +
    g.horarios.map((f, fi) =>
      '<div class="favorito-item"><div><b>L' + f.lineaId + ' · ' + f.coche + '</b><br><small>' + f.tipoDia + '</small></div>' +
      '<button onclick="favoritos.grupos[' + gi + '].horarios.splice(' + fi + ',1); renderFavoritos();">🗑️</button></div>'
    ).join('') + '</div>'
  ).join('');
}

function buscar(t) {
  if (!t) { document.getElementById('resultadosBusqueda').innerHTML = ''; return; }
  const cont = document.getElementById('resultadosBusqueda');
  const res = DATOS.lineas.filter(l => l.id.toLowerCase().includes(t.toLowerCase()) || l.nombre.toLowerCase().includes(t.toLowerCase()));
  cont.innerHTML = res.map(l => '<div class="resultado" onclick="document.getElementById(\'barraBusqueda\').classList.add(\'oculto\'); verRecorrido(\'' + l.id + '\')">Línea ' + l.id + ' - ' + l.nombre + '</div>').join('');
}

document.addEventListener('DOMContentLoaded', function () {
  if (localStorage.getItem('auvasa_dark') === '1') document.body.classList.add('dark');
  document.getElementById('btnOscuro').addEventListener('click', function() {
    document.body.classList.toggle('dark');
    localStorage.setItem('auvasa_dark', document.body.classList.contains('dark') ? '1' : '0');
  });
  document.getElementById('btnBuscar').addEventListener('click', function() { document.getElementById('barraBusqueda').classList.toggle('oculto'); });
  document.getElementById('inputBusqueda').addEventListener('input', function(e) { buscar(e.target.value); });
  document.getElementById('btnFavoritos').addEventListener('click', function() { renderFavoritos(); navegar('pantalla-favoritos'); });
  cargarDatos();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
});