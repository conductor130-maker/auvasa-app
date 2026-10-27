// ============================================================
//  APP HORARIOS AUVASA - Lógica principal (v3 limpia)
// ============================================================

let DATOS = { lineas: [] };
let favoritos = JSON.parse(localStorage.getItem('auvasa_favoritos') || '{"grupos":[]}');
let historial = [];
let lineaActual = null;
let grupoActual = null;
let grupoIndexActual = 0;
let cocheIndexActual = 0;
let filtroDiaActivo = null;
let listaGruposFiltrada = [];
let grupoSeleccionadoModal = null;
let favoritoPendiente = null;

// ---------- CARGA DE DATOS ----------
async function cargarDatos() {
  const grid = document.getElementById('grid-tipos');
  try {
    const res = await fetch('horarios.json');
    if (!res.ok) throw new Error('No se pudo cargar horarios.json (HTTP ' + res.status + ')');
    const texto = await res.text();
    try {
      DATOS = JSON.parse(texto);
    } catch (jsonErr) {
      throw new Error('JSON inválido: ' + jsonErr.message + '. Valídalo en https://jsonlint.com');
    }
    if (!DATOS.lineas || !Array.isArray(DATOS.lineas)) {
      throw new Error('El JSON no tiene la propiedad "lineas" o no es una lista.');
    }
    renderTipos();
  } catch (e) {
    console.error('Error cargando datos:', e);
    grid.innerHTML =
      '<div style="grid-column:1/-1;background:#fff;color:#1a1a1a;border-left:6px solid #E30613;padding:20px;border-radius:12px;">' +
      '<h3 style="color:#E30613;">⚠️ No se pudieron cargar los horarios</h3>' +
      '<pre style="background:#f4f6f9;padding:12px;border-radius:8px;white-space:pre-wrap;font-size:0.85rem;">' + e.message + '</pre>' +
      '</div>';
  }
}

// ---------- NAVEGACIÓN ----------
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

// ---------- PANTALLA 1: TIPOS ----------
const TIPOS = [
  { id: 'ordinaria', emoji: '🚌', nombre: 'Líneas Ordinarias' },
  { id: 'matinal', emoji: '🌅', nombre: 'Líneas Matinales' },
  { id: 'laboral', emoji: '🏭', nombre: 'Laborales y Polígonos' },
  { id: 'buho', emoji: '🦉', nombre: 'Líneas Búho' },
  { id: 'futbol', emoji: '⚽', nombre: 'Servicios Fútbol' },
  { id: 'lanzadera', emoji: '🎓', nombre: 'Lanzaderas y Universitarias' },
  { id: 'personal', emoji: '🚐', nombre: 'Coches de Personal' },
  { id: 'manual', emoji: '📖', nombre: 'Manual y Normativa' }
];

function renderTipos() {
  const grid = document.getElementById('grid-tipos');
  grid.innerHTML = TIPOS.map(t =>
    '<button class="boton-tipo tipo-' + t.id + '" onclick="mostrarLineas(\'' + t.id + '\')">' +
      '<span class="emoji">' + t.emoji + '</span>' +
      '<span>' + t.nombre + '</span>' +
    '</button>'
  ).join('');
}

// ---------- PANTALLA 2: LÍNEAS ----------
function mostrarLineas(tipoId) {
  const tipo = TIPOS.find(t => t.id === tipoId);
  document.getElementById('titulo-tipo').textContent = tipo.nombre;
  const lineas = DATOS.lineas.filter(l => l.tipo === tipoId);
  const grid = document.getElementById('grid-lineas');
  if (lineas.length === 0) {
    grid.innerHTML = '<p style="text-align:center;padding:40px;color:var(--texto-secundario)">No hay líneas en esta categoría.</p>';
  } else {
    grid.innerHTML = lineas.map(l =>
      '<div class="tarjeta-linea">' +
        '<div>' +
          '<span class="num">' + l.id + '</span>' +
          '<div class="nombre">' + l.nombre + '</div>' +
        '</div>' +
        '<div class="botones-linea">' +
          '<button class="btn-recorrido" onclick="verRecorrido(\'' + l.id + '\')">🗺️ Ver Recorrido</button>' +
          '<button class="btn-horario" onclick="verHorarios(\'' + l.id + '\')">⏱️ Elegir Horario</button>' +
        '</div>' +
      '</div>'
    ).join('');
  }
  navegar('pantalla-lineas');
}

// ---------- PANTALLA 3A: RECORRIDO ----------
function verRecorrido(id) {
  const linea = DATOS.lineas.find(l => l.id === id);
  lineaActual = linea;
  document.getElementById('titulo-recorrido').textContent = 'Línea ' + linea.id + ' – ' + linea.nombre;
  let html = '';
  linea.recorridos.forEach(r => {
    html += '<div class="bloque-recorrido"><h3>' + r.sentido + '</h3><ol>' +
      r.paradas.map(p => '<li>' + p + '</li>').join('') +
      '</ol></div>';
  });
  if (linea.letreros && linea.letreros.length) {
    html += '<div class="bloque-recorrido"><h3>📟 Letreros CUBE</h3><ul class="lista-letreros">' +
      linea.letreros.map(l => '<li>' + l + '</li>').join('') +
      '</ul></div>';
  }
  if (linea.notas && linea.notas.length) {
    html += '<div class="bloque-recorrido"><h3>📝 Notas oficiales</h3><ul class="lista-notas">' +
      linea.notas.map(n => '<li>' + n + '</li>').join('') +
      '</ul></div>';
  }
  if (linea.paginaRecorridoPDF) {
    html += '<div class="bloque-recorrido"><a class="btn-pdf" href="libro_horarios.pdf#page=' + linea.paginaRecorridoPDF + '" target="_blank">📄 Ver hoja original del PDF</a></div>';
  }
  document.getElementById('contenido-recorrido').innerHTML = html;
  navegar('pantalla-recorrido');
}

// ---------- PANTALLA 3B: GRUPOS ----------
function verHorarios(id) {
  const linea = DATOS.lineas.find(l => l.id === id);
  lineaActual = linea;
  filtroDiaActivo = null;
  document.getElementById('titulo-horarios').textContent = 'Horarios Línea ' + linea.id;
  const tiposDia = [];
  linea.horarios.forEach(h => {
    if (tiposDia.indexOf(h.tipoDia) === -1) tiposDia.push(h.tipoDia);
  });
  document.getElementById('filtros-dia').innerHTML = tiposDia.map(td =>
    '<button class="chip-dia" data-dia="' + td + '" onclick="filtrarPorDia(\'' + td.replace(/'/g, "\\'") + '\')">' + td + '</button>'
  ).join('');
  renderListaGrupos(linea.horarios);
  navegar('pantalla-horarios');
}

function filtrarPorDia(tipoDia) {
  filtroDiaActivo = tipoDia;
  document.querySelectorAll('.chip-dia').forEach(c => {
    c.classList.toggle('activo', c.dataset.dia === tipoDia);
  });
  const filtrados = lineaActual.horarios.filter(h => h.tipoDia === tipoDia);
  renderListaGrupos(filtrados);
}

function renderListaGrupos(horarios) {
  listaGruposFiltrada = horarios;
  const cont = document.getElementById('lista-horarios');
  if (!horarios.length) {
    cont.innerHTML = '<p style="text-align:center;padding:20px;color:var(--texto-secundario)">No hay horarios.</p>';
    return;
  }
  cont.innerHTML = horarios.map((h, i) => {
    const numCoches = (h.cochesDetalle && h.cochesDetalle.length) || (h.salidas && h.salidas.length) || 0;
    const primera = (h.cochesDetalle && h.cochesDetalle[0] && h.cochesDetalle[0].primeraSalida) ||
                    (h.salidas && h.salidas[0] && h.salidas[0].hora) || '—';
    return '<div class="tarjeta-horario" onclick="abrirGrupo(' + i + ')">' +
      '<div class="info">' +
        '<h4>' + h.nombre + '</h4>' +
        '<p>' + h.tipoDia + (h.coches ? ' · ' + h.coches + ' coches' : '') + '</p>' +
        '<p>' + numCoches + ' turno(s) · 1ª salida: ' + primera + '</p>' +
      '</div>' +
      '<div class="hora">' + primera + '</div>' +
    '</div>';
  }).join('');
}

// ---------- PANTALLA 3C: COCHES ----------
function abrirGrupo(grupoIndex) {
  const grupo = listaGruposFiltrada[grupoIndex];
  grupoActual = grupo;
  grupoIndexActual = grupoIndex;

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

  if (!coches.length) {
    document.getElementById('titulo-coches').textContent = 'Línea ' + lineaActual.id + ' · ' + grupo.nombre;
    document.getElementById('lista-coches').innerHTML =
      '<div style="grid-column:1/-1;padding:20px;text-align:center;">Este horario no tiene turnos cargados todavía. Consulta el PDF.</div>';
    navegar('pantalla-coches');
    return;
  }

  grupoActual.cochesDetalle = coches;
  document.getElementById('titulo-coches').textContent = 'Línea ' + lineaActual.id + ' · ' + grupo.nombre;

  const algunIncompleto = coches.some(c => c._incompleto);
  const aviso = algunIncompleto
    ? '<div style="background:#FFF4E0;border-left:4px solid #F39200;padding:14px 16px;border-radius:10px;margin-bottom:16px;font-size:0.9rem;color:#6B4A00;line-height:1.5;">⚠️ Este grupo no tiene todas las salidas del día cargadas. Cada botón muestra solo su primera salida. Para el turno completo, consulta el PDF.</div>'
    : '';

  const lista = document.getElementById('lista-coches');
  lista.innerHTML = aviso + coches.map((coche, i) =>
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

// ---------- PANTALLA 4: DETALLE ----------
function verDetalleCoche(cocheIndex) {
  cocheIndexActual = cocheIndex;
  const coche = grupoActual.cochesDetalle[cocheIndex];
  const cont = document.getElementById('detalle-horario');

  const primera = coche.salidas && coche.salidas[0];
  const ultima = coche.salidas && coche.salidas[coche.salidas.length - 1];
  const descanso = grupoActual.descanso || '20 min en cabecera';
  const incompleto = coche._incompleto || (coche.salidas && coche.salidas.length <= 1);

  let html = '';

  if (incompleto) {
    html += '<div style="background:#FFF4E0;border-left:4px solid #F39200;padding:14px 16px;border-radius:10px;margin-bottom:16px;font-size:0.9rem;color:#6B4A00;line-height:1.5;">' +
      '<strong>⚠️ Este turno solo tiene cargada la primera salida.</strong><br>' +
      'Para ver el turno completo, selecciona el grupo <b>"12 coches A"</b> (que ya tiene el JSON actualizado) o consulta el PDF.' +
    '</div>';
  }

  html += '<div class="tarjeta-principal">' +
    '<h3>L' + lineaActual.id + ' · ' + grupoActual.nombre + ' · ' + coche.nombre + '</h3>' +
    '<div class="sub">' + grupoActual.tipoDia + '</div>' +
    '<div class="dato"><span>Primera salida</span><strong>' + (primera ? primera.hora + ' desde ' + primera.cabecera : '—') + '</strong></div>' +
    '<div class="dato"><span>Última salida</span><strong>' + (ultima ? ultima.hora + ' desde ' + ultima.cabecera : '—') + '</strong></div>' +
    '<div class="dato"><span>Descanso</span><strong>' + descanso + '</strong></div>' +
  '</div>';

  const total = grupoActual.cochesDetalle.length;
  html += '<div class="nav-horarios">' +
    '<button ' + (cocheIndex === 0 ? 'disabled' : '') + ' onclick="verDetalleCoche(' + (cocheIndex - 1) + ')">◀ Anterior</button>' +
    '<button ' + (cocheIndex === total - 1 ? 'disabled' : '') + ' onclick="verDetalleCoche(' + (cocheIndex + 1) + ')">Siguiente ▶</button>' +
  '</div>';

  // GENERAR TABLA ESTILO PDF
  if (coche.salidas && coche.salidas.length) {
    const cabeceras = [];
    coche.salidas.forEach(s => {
      if (cabeceras.indexOf(s.cabecera) === -1) cabeceras.push(s.cabecera);
    });

    if (cabeceras.length === 2) {
      const col1 = cabeceras[0];
      const col2 = cabeceras[1];
      
      const filas1 = coche.salidas.filter(s => s.cabecera === col1);
      const filas2 = coche.salidas.filter(s => s.cabecera === col2);
      const maxFilas = Math.max(filas1.length, filas2.length);

      html += '<table class="tabla-pdf">' +
        '<thead><tr><th>' + col1.substring(0, 7) + '.</th><th>' + col2.substring(0, 7) + '</th></tr></thead>' +
        '<tbody>';
      
      for (let i = 0; i < maxFilas; i++) {
        const h1 = filas1[i] ? filas1[i].hora : '';
        const h2 = filas2[i] ? filas2[i].hora : '';
        // Resaltar descansos comunes (11:30 y 18:59 en este turno)
        const clase1 = (h1 === '11:30' || h1 === '18:59') ? ' class="hora-descanso"' : '';
        const clase2 = (h2 === '11:30' || h2 === '18:59') ? ' class="hora-descanso"' : '';
        
        html += '<tr><td' + clase1 + '>' + h1 + '</td><td' + clase2 + '>' + h2 + '</td></tr>';
      }
      
      html += '</tbody>' +
        '<tfoot><tr><td colspan="2" class="footer-retirada">' + (coche.retirada || 'Se retira') + '</td></tr></tfoot>' +
      '</table>';
    } else {
      // Vista de una sola columna
      html += '<table class="tabla-coche">' +
        '<thead><tr><th>Cabecera</th><th>Hora</th></tr></thead><tbody>' +
        coche.salidas.map(s => '<tr><td>' + s.cabecera + '</td><td class="hora">' + s.hora + '</td></tr>').join('') +
        '</tbody></table>';
    }
  }

  html += '<div class="acciones-detalle">' +
    '<button class="btn-fav" onclick="abrirModalFavorito()">⭐ Guardar en Mis Turnos</button>' +
    (grupoActual.paginaPDF ? '<a class="btn-pdf-detalle" href="libro_horarios.pdf#page=' + grupoActual.paginaPDF + '" target="_blank">📄 Ver PDF</a>' : '') +
  '</div>';

  cont.innerHTML = html;
  navegar('pantalla-detalle');
}

// ---------- FAVORITOS ----------
function abrirModalFavorito() {
  favoritoPendiente = {
    lineaId: lineaActual.id,
    lineaNombre: lineaActual.nombre,
    grupo: grupoActual ? grupoActual.nombre : '',
    coche: grupoActual && grupoActual.cochesDetalle ? (grupoActual.cochesDetalle[cocheIndexActual] ? grupoActual.cochesDetalle[cocheIndexActual].nombre : null) : null,
    tipoDia: grupoActual ? grupoActual.tipoDia : '',
    paginaPDF: grupoActual ? grupoActual.paginaPDF : null,
    primeraSalida: grupoActual && grupoActual.cochesDetalle
      ? (grupoActual.cochesDetalle[cocheIndexActual] ? grupoActual.cochesDetalle[cocheIndexActual].primeraSalida : null)
      : (grupoActual && grupoActual.salidas && grupoActual.salidas[0] ? grupoActual.salidas[0].hora : null)
  };
  document.getElementById('modalFavorito').classList.remove('oculto');
  document.getElementById('nombreGrupo').value = '';
  grupoSeleccionadoModal = null;
  const cont = document.getElementById('gruposExistentes');
  if (favoritos.grupos.length) {
    cont.innerHTML = '<label>O selecciona un grupo existente:</label>' +
      favoritos.grupos.map((g, i) =>
        '<span class="grupo-opcion" onclick="seleccionarGrupoModal(' + i + ', this)">' + g.nombre + '</span>'
      ).join('');
  } else {
    cont.innerHTML = '';
  }
}

function seleccionarGrupoModal(i, el) {
  grupoSeleccionadoModal = i;
  document.getElementById('nombreGrupo').value = favoritos.grupos[i].nombre;
  document.querySelectorAll('#gruposExistentes .grupo-opcion').forEach(e => e.classList.remove('seleccionado'));
  el.classList.add('seleccionado');
}

function cerrarModal() {
  document.getElementById('modalFavorito').classList.add('oculto');
  favoritoPendiente = null;
}

function guardarFavorito() {
  const nombre = document.getElementById('nombreGrupo').value.trim();
  if (!nombre) { alert('Escribe un nombre para el grupo'); return; }
  let grupo = favoritos.grupos.find(g => g.nombre.toLowerCase() === nombre.toLowerCase());
  if (!grupo) {
    grupo = { nombre: nombre, horarios: [] };
    favoritos.grupos.push(grupo);
  }
  const yaExiste = grupo.horarios.some(f =>
    f.lineaId === favoritoPendiente.lineaId &&
    f.grupo === favoritoPendiente.grupo &&
    f.coche === favoritoPendiente.coche &&
    f.tipoDia === favoritoPendiente.tipoDia
  );
  if (!yaExiste) grupo.horarios.push(favoritoPendiente);
  localStorage.setItem('auvasa_favoritos', JSON.stringify(favoritos));
  cerrarModal();
  alert('⭐ Guardado en el grupo "' + grupo.nombre + '"');
}

function renderFavoritos() {
  const cont = document.getElementById('contenido-favoritos');
  if (!favoritos.grupos.length) {
    cont.innerHTML = '<p style="text-align:center;padding:40px;color:var(--texto-secundario)">Aún no tienes favoritos.<br>Guarda tus turnos habituales desde cualquier horario.</p>';
    return;
  }
  cont.innerHTML = favoritos.grupos.map(function (g, gi) {
    return '<div class="grupo-favoritos">' +
      '<h3>📁 ' + g.nombre + '</h3>' +
      g.horarios.map(function (f, fi) {
        return '<div class="favorito-item">' +
          '<div>' +
            '<strong>L' + f.lineaId + ' · ' + (f.coche || f.grupo) + '</strong><br>' +
            '<small>' + f.tipoDia + (f.coche ? ' · ' + f.grupo : '') + ' · 1ª salida: ' + (f.primeraSalida || '—') + '</small>' +
          '</div>' +
          '<button onclick="eliminarFavorito(' + gi + ',' + fi + ')">🗑️</button>' +
        '</div>';
      }).join('') +
    '</div>';
  }).join('');
}

function eliminarFavorito(gi, fi) {
  if (!confirm('¿Eliminar este horario del grupo?')) return;
  favoritos.grupos[gi].horarios.splice(fi, 1);
  if (!favoritos.grupos[gi].horarios.length) favoritos.grupos.splice(gi, 1);
  localStorage.setItem('auvasa_favoritos', JSON.stringify(favoritos));
  renderFavoritos();
}

// ---------- BUSCADOR ----------
function buscar(termino) {
  const t = termino.toLowerCase().trim();
  const cont = document.getElementById('resultadosBusqueda');
  if (!t) { cont.innerHTML = ''; return; }
  const resultados = [];
  DATOS.lineas.forEach(function (l) {
    if (l.id.toLowerCase().indexOf(t) !== -1 || l.nombre.toLowerCase().indexOf(t) !== -1) {
      resultados.push({ tipo: 'linea', linea: l, texto: 'Línea ' + l.id + ' – ' + l.nombre });
    }
    if (l.recorridos) {
      l.recorridos.forEach(function (r) {
        if (r.paradas) {
          r.paradas.forEach(function (p) {
            if (p.toLowerCase().indexOf(t) !== -1) {
              resultados.push({ tipo: 'parada', linea: l, texto: p, sub: 'Línea ' + l.id + ' (' + r.sentido + ')' });
            }
          });
        }
      });
    }
    if (l.horarios) {
      l.horarios.forEach(function (h) {
        if (h.nombre.toLowerCase().indexOf(t) !== -1 || h.tipoDia.toLowerCase().indexOf(t) !== -1) {
          resultados.push({ tipo: 'horario', linea: l, texto: h.nombre + ' (' + h.tipoDia + ')', sub: 'Línea ' + l.id });
        }
      });
    }
  });
  const vistos = {};
  const unicos = [];
  resultados.forEach(function (r) {
    const key = r.texto + (r.sub || '');
    if (!vistos[key]) { vistos[key] = true; unicos.push(r); }
  });
  const finales = unicos.slice(0, 40);
  if (!finales.length) { cont.innerHTML = '<div class="resultado">Sin resultados</div>'; return; }
  cont.innerHTML = finales.map(function (r, i) {
    return '<div class="resultado" onclick="irResultado(' + i + ')">' + r.texto + '<br><small>' + (r.sub || '') + '</small></div>';
  }).join('');
  window._resultadosBusqueda = finales;
}

function irResultado(i) {
  const r = window._resultadosBusqueda[i];
  document.getElementById('barraBusqueda').classList.add('oculto');
  document.getElementById('inputBusqueda').value = '';
  verRecorrido(r.linea.id);
}

// ---------- MODO OSCURO ----------
function toggleOscuro() {
  document.body.classList.toggle('dark');
  localStorage.setItem('auvasa_dark', document.body.classList.contains('dark') ? '1' : '0');
}

// ---------- INIT ----------
document.addEventListener('DOMContentLoaded', function () {
  if (localStorage.getItem('auvasa_dark') === '1') document.body.classList.add('dark');
  document.getElementById('btnOscuro').addEventListener('click', toggleOscuro);
  document.getElementById('btnBuscar').addEventListener('click', function () {
    const barra = document.getElementById('barraBusqueda');
    barra.classList.toggle('oculto');
    if (!barra.classList.contains('oculto')) document.getElementById('inputBusqueda').focus();
  });
  document.getElementById('btnFavoritos').addEventListener('click', function () {
    renderFavoritos();
    navegar('pantalla-favoritos');
  });
  let timeoutBusqueda;
  document.getElementById('inputBusqueda').addEventListener('input', function (e) {
    clearTimeout(timeoutBusqueda);
    timeoutBusqueda = setTimeout(function () { buscar(e.target.value); }, 180);
  });
  cargarDatos();
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(function (e) { console.log('SW no registrado:', e); });
  }
});