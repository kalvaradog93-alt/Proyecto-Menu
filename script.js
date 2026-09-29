const form = document.getElementById('supervisionForm');
const adminPrintButton = document.getElementById('adminPrintButton');
let adminOnlyPrint = false;

function createTextEditor(control) {
  if (control.dataset.richEditor) return;

  const editor = document.createElement('div');
  editor.className = `rich-editor ${control.tagName === 'TEXTAREA' ? 'rich-editor-area' : 'rich-editor-input'}`;
  editor.contentEditable = 'true';
  editor.setAttribute('role', 'textbox');
  editor.setAttribute('aria-label', control.getAttribute('placeholder') || control.name || 'Campo de texto');
  editor.dataset.placeholder = control.getAttribute('placeholder') || '';
  editor.innerHTML = control.value || '';

  const toolbar = document.createElement('div');
  toolbar.className = 'rich-toolbar';
  toolbar.innerHTML = '<button type="button" data-command="bold" aria-label="Negrita"><b>B</b></button><button type="button" data-command="underline" aria-label="Subrayado"><u>U</u></button>';

  const dictationFields = ['trabajo', 'detalles', 'administracion'];
  if (control.name?.startsWith('informePunto') || dictationFields.includes(control.name)) {
    const dictateButton = document.createElement('button');
    dictateButton.type = 'button';
    dictateButton.className = 'dictate-button';
    dictateButton.setAttribute('aria-label', 'Dictar informe');
    dictateButton.title = 'Dictar informe por voz';
    dictateButton.textContent = '🎙️ Dictar';
    toolbar.appendChild(dictateButton);

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      dictateButton.disabled = true;
      dictateButton.title = 'El dictado por voz no está disponible en este navegador';
    } else {
      const recognition = new SpeechRecognition();
      recognition.lang = 'es-CR';
      recognition.continuous = true;
      recognition.interimResults = true;
      let committedText = '';

      recognition.onstart = () => {
        dictateButton.classList.add('is-listening');
        dictateButton.textContent = '⏹️ Detener';
        editor.focus();
        committedText = editor.innerText.trim();
      };
      recognition.onresult = event => {
        let interimText = '';
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const text = event.results[i][0].transcript;
          if (event.results[i].isFinal) committedText += `${text} `;
          else interimText += text;
        }
        editor.innerText = `${committedText}${interimText}`.trim();
        syncValue();
      };
      recognition.onend = () => {
        dictateButton.classList.remove('is-listening');
        dictateButton.textContent = '🎙️ Dictar';
      };
      recognition.onerror = () => recognition.stop();
      dictateButton.addEventListener('click', () => {
        if (dictateButton.classList.contains('is-listening')) recognition.stop();
        else recognition.start();
      });
    }
  }

  control.hidden = true;
  control.dataset.richEditor = 'true';
  control.insertAdjacentElement('afterend', toolbar);
  toolbar.insertAdjacentElement('afterend', editor);

  const syncValue = () => {
    control.value = editor.innerHTML === '<br>' ? '' : editor.innerHTML;
  };

  toolbar.querySelectorAll('button').forEach(button => {
    button.addEventListener('mousedown', event => event.preventDefault());
    button.addEventListener('click', () => {
      editor.focus();
      document.execCommand(button.dataset.command, false);
      syncValue();
    });
  });
  editor.addEventListener('input', syncValue);
}

function setupRichEditors() {
  document.querySelectorAll('input[type="text"], textarea').forEach(createTextEditor);
}

function setVisibility(element, isVisible) {
  // Se usan ambas técnicas para evitar que algún estilo del formulario
  // mantenga visible el elemento aunque tenga el atributo hidden.
  element.hidden = !isVisible;
  element.classList.toggle('is-hidden', !isVisible);
  element.style.display = isVisible ? '' : 'none';
}

function updateVisibility() {
  const isProviderVisit = document.getElementById('visitaProveedor').checked;
  const includeAdmin = document.getElementById('includeAdmin').checked;

  setVisibility(document.getElementById('providerCompany'), isProviderVisit);
  setVisibility(document.getElementById('providerWork'), isProviderVisit);
  setVisibility(document.getElementById('personnelBlock'), isProviderVisit);
  setVisibility(document.getElementById('ownerCard'), isProviderVisit);
  setVisibility(document.getElementById('adminBlock'), includeAdmin);
  setVisibility(adminPrintButton, includeAdmin);
  setVisibility(document.getElementById('officerCard'), true);
}

function setupInspection(item) {
  const yesCheck = item.querySelector('.yes-check');
  const noCheck = item.querySelector('.no-check');
  const specifyField = item.querySelector('.specify-field');

  const updateInspection = () => {
    // Cada opción permite una sola respuesta y “No” muestra su especificación.
    if (yesCheck.checked) noCheck.checked = false;
    if (noCheck.checked) yesCheck.checked = false;
    setVisibility(specifyField, noCheck.checked);
  };

  yesCheck.addEventListener('change', updateInspection);
  noCheck.addEventListener('change', updateInspection);
  updateInspection();
}

document.querySelectorAll('.inspection-item').forEach(setupInspection);

document.getElementById('visitaProveedor').addEventListener('change', updateVisibility);
document.getElementById('includeAdmin').addEventListener('change', updateVisibility);

function bindRemove(button) {
  button.addEventListener('click', () => {
    const rows = document.querySelectorAll('.person-row');
    if (rows.length > 1) button.closest('.person-row').remove();
    else button.closest('.person-row').querySelectorAll('input').forEach(input => input.value = '');
  });
}
document.querySelectorAll('.remove').forEach(bindRemove);
document.getElementById('addPerson').addEventListener('click', () => {
  const row = document.querySelector('.person-row').cloneNode(true);
  row.querySelectorAll('input').forEach(input => input.value = '');
  row.querySelectorAll('.rich-editor').forEach(editor => editor.innerHTML = '');
  document.getElementById('personnelList').appendChild(row);
  bindRemove(row.querySelector('.remove'));
});

function showPhotos(files) {
  const preview = document.getElementById('photoPreview');
  [...files].forEach(file => {
    if (!file.type.startsWith('image/')) return;
    const image = document.createElement('img');
    image.alt = file.name;
    image.src = URL.createObjectURL(file);
    preview.appendChild(image);
  });
}
document.getElementById('photos').addEventListener('change', event => showPhotos(event.target.files));
document.getElementById('cameraButton').addEventListener('click', () => document.getElementById('cameraInput').click());
document.getElementById('cameraInput').addEventListener('change', event => showPhotos(event.target.files));

function setupSignature(card) {
  const digitalDisabled = card.querySelector('.disable-digital-signature');
  digitalDisabled.addEventListener('change', () => {
    card.classList.toggle('digital-disabled', digitalDisabled.checked);
  });

  const canvas = card.querySelector('.signature-canvas');
  const ctx = canvas.getContext('2d');
  let drawing = false;
  const point = event => {
    const rect = canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * canvas.width / rect.width, y: (event.clientY - rect.top) * canvas.height / rect.height };
  };
  canvas.addEventListener('pointerdown', event => { drawing = true; canvas.setPointerCapture(event.pointerId); const p = point(event); ctx.beginPath(); ctx.moveTo(p.x, p.y); });
  canvas.addEventListener('pointermove', event => { if (!drawing) return; const p = point(event); ctx.lineTo(p.x, p.y); ctx.strokeStyle = '#17265e'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.stroke(); });
  canvas.addEventListener('pointerup', () => drawing = false);
  card.querySelector('.clear-sign').addEventListener('click', () => { ctx.clearRect(0, 0, canvas.width, canvas.height); card.querySelector('.signature-upload').value = ''; });
  card.querySelector('.signature-upload').addEventListener('change', event => { const file = event.target.files[0]; if (!file) return; const image = new Image(); image.onload = () => { ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(image, 0, 0, canvas.width, canvas.height); }; image.src = URL.createObjectURL(file); });
}
document.querySelectorAll('.signature-card').forEach(setupSignature);
setupRichEditors();

const pointReports = document.getElementById('pointReports');
const pointReportsList = document.getElementById('pointReportsList');
const pointReportTabs = document.getElementById('pointReportTabs');
const pointChecksContainer = document.getElementById('pointChecks');
const customPoints = document.getElementById('customPoints');
const addPointButton = document.getElementById('addPoint');
let pointChecks = [...document.querySelectorAll('.point-check')];
let reportElements = [];

function refreshPointChecks() {
  pointChecks = [...document.querySelectorAll('.point-check')];
}

function addCustomPoint() {
  const row = document.createElement('div');
  row.className = 'custom-point-row';
  row.innerHTML = `
    <label><input type="checkbox" class="point-check" value="Otro" checked />
      <span>Otro puesto</span>
      <input type="text" class="custom-point-name" placeholder="Especifique el puesto" />
    </label>
    <button type="button" class="remove remove-point">Eliminar</button>`;
  customPoints.appendChild(row);
  const check = row.querySelector('.point-check');
  const nameInput = row.querySelector('.custom-point-name');
  check.addEventListener('change', updatePointReports);
  nameInput.addEventListener('input', updatePointReports);
  row.querySelector('.remove-point').addEventListener('click', () => {
    const reportIndex = pointChecks.indexOf(check);
    if (reportIndex !== -1) {
      reportElements[reportIndex]?.remove();
      reportElements.splice(reportIndex, 1);
    }
    row.remove();
    refreshPointChecks();
    updatePointReports();
  });
  refreshPointChecks();
  reportElements.push(createPointReport('Otro', pointChecks.length - 1));
  updatePointReports();
}

addPointButton.addEventListener('click', addCustomPoint);

function createPointReport(point, index) {
  const report = document.createElement('article');
  report.className = 'point-report is-disabled';
  report.dataset.point = point;
  const reportSignature = point === 'Caseta Principal' ? '' : `
    <div class="report-signature">
      <div class="signature-card report-signature-card">
        <h3>Firma del informe</h3>
        <label>Nombre y apellidos<input type="text" name="nombreFirmaPunto${index}" /></label>
        <label>Cédula<input type="text" name="cedulaFirmaPunto${index}" /></label>
        <label class="signature-mode"><input type="checkbox" class="disable-digital-signature" /> Firma física (deshabilitar firma digital)</label>
        <canvas class="signature-canvas" aria-label="Firma del informe"></canvas>
        <div class="physical-signature-line">Firma física</div>
        <b>Subir firma JPG o PNG</b>
        <input class="signature-upload" type="file" accept="image/png,image/jpeg" />
        <button type="button" class="clear-sign">Limpiar firma</button>
      </div>
    </div>`;
  report.innerHTML = `
    <h3 class="point-report-title"></h3>
    <label>Informe del Puesto<textarea name="informePunto${index}" rows="4" placeholder="Escriba el informe de este puesto..."></textarea></label>
    <section class="inspection-section point-inspection-section" aria-label="Verificación del punto">
      <h2>Verificación</h2>
      <div class="inspection-list">
        ${['Uniforme', 'Equipo de Seguridad', 'Bitácora', 'Activos', 'Recorrido'].map((name, itemIndex) => `
          <div class="inspection-item">
            <div class="inspection-choice">
              <span class="inspection-name">${name}</span>
              <label><input type="checkbox" class="inspection-check yes-check" /> <span>Sí</span></label>
              <label><input type="checkbox" class="inspection-check no-check" /> <span>No</span></label>
            </div>
            <label class="specify-field">Especifique<input type="text" name="especificacionPunto${index}_${itemIndex}" /></label>
          </div>`).join('')}
      </div>
    </section>
    ${reportSignature}`;
  pointReportsList.appendChild(report);
  const reportSignatureCard = report.querySelector('.signature-card');
  if (reportSignatureCard) setupSignature(reportSignatureCard);
  report.querySelectorAll('.inspection-item').forEach(setupInspection);
  report.querySelectorAll('textarea, input[type="text"]').forEach(createTextEditor);
  return report;
}

reportElements = [...pointChecks].map((check, index) => createPointReport(check.value, index));

let activeReportIndex = null;

function activateReport(index) {
  activeReportIndex = index;
  const hasSelectedPoint = pointChecks.some(check => check.checked);
  reportElements.forEach((report, reportIndex) => {
    const isFallbackReport = !hasSelectedPoint && reportIndex === 0;
    const isActive = reportIndex === index && (pointChecks[reportIndex]?.checked || isFallbackReport);
    report.classList.toggle('is-active', isActive);
    report.setAttribute('aria-hidden', String(!isActive));
  });
  pointReportTabs.querySelectorAll('[role="tab"]').forEach((tab, tabIndex) => {
    const isActive = tabIndex === index;
    tab.classList.toggle('is-active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
  });
}

function updatePointReports() {
  refreshPointChecks();
  const selectedIndexes = [];
  pointReportTabs.innerHTML = '';

  pointChecks.forEach((check, index) => {
    const report = reportElements[index];
    if (!report) return;
    const selected = check.checked;
    const title = report.querySelector('.point-report-title');
    const customName = check.closest('.custom-point-row')?.querySelector('.custom-point-name')?.value.trim();
    const pointName = check.value === 'Otro' && customName ? `Otro: ${customName}` : check.value;
    title.textContent = `Informe del Puesto: ${pointName}`;
    report.classList.toggle('is-disabled', !selected);
    report.classList.remove('is-active');
    report.setAttribute('aria-hidden', String(!selected));

    if (selected) {
      selectedIndexes.push(index);
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'point-report-tab';
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-selected', 'false');
      tab.textContent = pointName;
      tab.addEventListener('click', () => activateReport(index));
      pointReportTabs.appendChild(tab);
    }
  });

  // Mantiene visible la verificación aunque no se haya marcado ningún puesto.
  // Se utiliza el primer informe como formulario base en ese caso.
  const hasSelectedPoints = selectedIndexes.length > 0;
  const visibleIndexes = hasSelectedPoints ? selectedIndexes : [0];

  if (!hasSelectedPoints && reportElements[0]) {
    const fallbackReport = reportElements[0];
    fallbackReport.classList.remove('is-disabled');
    fallbackReport.querySelector('.point-report-title').textContent = 'Informe del Puesto';
    fallbackReport.setAttribute('aria-hidden', 'false');
  }

  pointReports.hidden = false;
  pointReports.classList.remove('is-hidden');
  if (!visibleIndexes.includes(activeReportIndex)) {
    activateReport(visibleIndexes[0]);
  } else {
    activateReport(activeReportIndex);
  }
}

pointChecksContainer.addEventListener('change', updatePointReports);
updatePointReports();

let pointReportsPrintPlaceholder = null;

function preparePointReportsForPrint() {
  pointReports.classList.add('print-all-reports');

  // Conserva la posición original: justo debajo de “Puesto Visitado”.
  reportElements.forEach(report => {
    const isSelected = !report.classList.contains('is-disabled');
    report.classList.toggle('print-report-page', isSelected);
  });
}

function restorePointReportsAfterPrint() {
  pointReports.classList.remove('print-all-reports');
  reportElements.forEach(report => report.classList.remove('print-report-page'));
  pointReportsPrintPlaceholder = null;
}

function prepareNativeFieldsForPrint() {
  document.querySelectorAll('input[type="date"], input[type="time"]').forEach(input => {
    if (input.nextElementSibling?.classList.contains('print-control-value')) return;
    const value = document.createElement('span');
    value.className = 'print-control-value';
    value.textContent = input.value;
    input.classList.add('print-control-hidden');
    input.insertAdjacentElement('afterend', value);
  });
}

function prepareTextareasForPrint() {
  preparePointReportsForPrint();
  prepareNativeFieldsForPrint();
  document.body.classList.toggle('admin-only-print', adminOnlyPrint);
  document.querySelectorAll('textarea').forEach(textarea => {
    const editor = textarea.nextElementSibling?.nextElementSibling?.classList.contains('rich-editor')
      ? textarea.nextElementSibling.nextElementSibling
      : null;
    if (editor) textarea.value = editor.innerHTML;

    const existingValue = textarea.nextElementSibling?.classList.contains('print-textarea-value');
    const value = existingValue ? textarea.nextElementSibling : document.createElement('div');

    value.className = 'print-textarea-value';
    value.innerHTML = textarea.value.trim();
    textarea.classList.add('print-hidden');

    if (!existingValue) textarea.insertAdjacentElement('afterend', value);
  });

  // Los bloques vacíos no deben consumir espacio en el informe impreso.
  document.querySelectorAll('.print-textarea-value').forEach(value => {
    const textarea = value.previousElementSibling;
    const label = textarea?.closest('label');
    label?.classList.toggle('print-empty', !value.textContent.trim());
  });
}

function restoreTextareasAfterPrint() {
  document.body.classList.remove('admin-only-print');
  adminOnlyPrint = false;
  document.querySelectorAll('.print-control-value').forEach(value => value.remove());
  document.querySelectorAll('.print-control-hidden').forEach(input => input.classList.remove('print-control-hidden'));
  restorePointReportsAfterPrint();
  document.querySelectorAll('.print-textarea-value').forEach(value => value.remove());
  document.querySelectorAll('textarea.print-hidden').forEach(textarea => textarea.classList.remove('print-hidden'));
  document.querySelectorAll('.print-empty').forEach(label => label.classList.remove('print-empty'));
}

window.addEventListener('beforeprint', prepareTextareasForPrint);
window.addEventListener('afterprint', restoreTextareasAfterPrint);
form.addEventListener('submit', event => {
  event.preventDefault();
  adminOnlyPrint = false;
  prepareTextareasForPrint();
  window.print();
});

adminPrintButton.addEventListener('click', () => {
  if (!document.getElementById('includeAdmin').checked) return;
  adminOnlyPrint = true;
  prepareTextareasForPrint();
  window.print();
});

updateVisibility();
