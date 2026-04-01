import emailjs from 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/+esm';

emailjs.init({
  publicKey: 'oZjq5OdIqraX_zf0L'
});

const STORAGE_KEYS = {
  reservations: 'wedding_reservations_v3',
  rsvps: 'wedding_rsvps_v3'
};

const state = {
  items: normalizeItems(Array.isArray(window.WEDDING_ITEMS) ? window.WEDDING_ITEMS : []),
  supabase: null,
  reservations: [],
  rsvpsCount: 0,
  activeItem: null
};

const el = {
  cards: document.getElementById('cards'),
  empty: document.getElementById('emptyState'),
  search: document.getElementById('searchInput'),
  categoria: document.getElementById('categoriaFiltro'),
  faixa: document.getElementById('faixaFiltro'),
  kpiDisponiveis: document.getElementById('kpiDisponiveis'),
  kpiEscolhidos: document.getElementById('kpiEscolhidos'),
  kpiConfirmados: document.getElementById('kpiConfirmados'),
  toast: document.getElementById('toast'),
  pixKeyView: document.getElementById('pixKeyView'),
  copyPixBtn: document.getElementById('copyPixBtn'),
  rsvpForm: document.getElementById('rsvpForm'),
  cancelForm: document.getElementById('cancelForm'),
  shareBtn: document.getElementById('shareBtn'),
  coupleNames: document.getElementById('coupleNames'),
  eventDate: document.getElementById('eventDate'),
  eventTime: document.getElementById('eventTime'),
  eventDateLong: document.getElementById('eventDateLong'),
  configBanner: document.getElementById('configBanner'),
  giftDialog: document.getElementById('giftDialog'),
  giftForm: document.getElementById('giftForm'),
  giftDialogTitle: document.getElementById('giftDialogTitle'),
  closeDialogBtn: document.getElementById('closeDialogBtn'),
  resultDialog: document.getElementById('resultDialog'),
  resultTitle: document.getElementById('resultTitle'),
  resultMessage: document.getElementById('resultMessage'),
  closeResultDialogBtn: document.getElementById('closeResultDialogBtn'),
  closeResultBtn: document.getElementById('closeResultBtn'),
  notifyWhatsappLink: document.getElementById('notifyWhatsappLink'),
  notifyEmailLink: document.getElementById('notifyEmailLink'),
  cancelCodeWrap: document.getElementById('cancelCodeWrap'),
  cancelCodeView: document.getElementById('cancelCodeView')
};

function normalizeItems(items) {
  return items.map((item, index) => {
    const nome = String(item.item || item.nome || `Item ${index + 1}`).trim();
    let link = String(item.link || '').trim();
    if (link && !/^https?:\/\//i.test(link)) link = `https://${link.replace(/^\/+/, '')}`;

    return {
      id: String(item.id || `item-${index + 1}`),
      item: nome,
      nome,
      categoria: String(item.categoria || 'Outros').trim(),
      preco: Number(item.preco || 0),
      faixa: String(item.faixa || '').trim(),
      status: String(item.status || 'Disponível').trim(),
      imagem: String(item.imagem || '').trim(),
      link
    };
  });
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getNotificationsConfig() {
  return {
    email: window.APP_CONFIG?.notifications?.email || '',
    whatsapp: window.APP_CONFIG?.notifications?.whatsapp || ''
  };
}

function loadLocalReservations() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.reservations);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalReservations() {
  localStorage.setItem(STORAGE_KEYS.reservations, JSON.stringify(state.reservations));
}

function loadLocalRsvps() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.rsvps);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalRsvp(payload) {
  const all = loadLocalRsvps();
  all.push(payload);
  localStorage.setItem(STORAGE_KEYS.rsvps, JSON.stringify(all));
  state.rsvpsCount = all.length;
}

function syncItemsWithReservations() {
  const reservedIds = new Set(
    state.reservations
      .filter((reservation) => reservation && reservation.status !== 'cancelled')
      .map((reservation) => String(reservation.item_id))
  );

  state.items = state.items.map((item) => ({
    ...item,
    status: reservedIds.has(String(item.id)) ? 'Escolhido' : 'Disponível'
  }));
}

function showToast(message, isError = false) {
  if (!el.toast) return;
  el.toast.textContent = message;
  el.toast.style.background = isError ? '#8b2d2d' : '#3a7d5d';
  el.toast.classList.remove('hidden', 'success-burst');
  if (!isError) {
    void el.toast.offsetWidth;
    el.toast.classList.add('success-burst');
  }
  window.clearTimeout(showToast._timer);
  showToast._timer = window.setTimeout(() => {
    el.toast.classList.add('hidden');
  }, 3500);
}

function showConfigBanner(message) {
  if (!el.configBanner) return;
  el.configBanner.textContent = message;
  el.configBanner.classList.remove('hidden');
}

function hideConfigBanner() {
  if (!el.configBanner) return;
  el.configBanner.classList.add('hidden');
}

function setEventTexts() {
  const wedding = window.APP_CONFIG?.wedding || {};
  const couple = wedding.couple || 'Mariana & Diego';
  const dateLabel = wedding.dateLabel || '18/04/2026';
  const timeLabel = wedding.timeLabel || '16:30 hrs';
  const pixKey = wedding.pixKey || '62995163186';

  if (el.coupleNames) el.coupleNames.textContent = couple;
  if (el.eventDate) el.eventDate.textContent = dateLabel;
  if (el.eventTime) el.eventTime.textContent = timeLabel;
  if (el.eventDateLong) el.eventDateLong.textContent = `${dateLabel} às ${timeLabel}`;
  if (el.pixKeyView) el.pixKeyView.textContent = pixKey || 'Chave PIX não configurada';
}

function showResult({ title, message, cancelCode = '', eventText = '' }) {
  if (!el.resultDialog || !el.resultTitle || !el.resultMessage) return;

  el.resultTitle.textContent = title;
  el.resultMessage.textContent = message;

  if (el.cancelCodeWrap && el.cancelCodeView) {
    if (cancelCode) {
      el.cancelCodeView.textContent = cancelCode;
      el.cancelCodeWrap.classList.remove('hidden');
    } else {
      el.cancelCodeView.textContent = '';
      el.cancelCodeWrap.classList.add('hidden');
    }
  }

  const notifications = getNotificationsConfig();

  if (el.notifyWhatsappLink) {
    if (notifications.whatsapp) {
      el.notifyWhatsappLink.href = `https://wa.me/${notifications.whatsapp}?text=${encodeURIComponent(eventText)}`;
    } else {
      el.notifyWhatsappLink.href = `https://wa.me/?text=${encodeURIComponent(eventText)}`;
    }
    el.notifyWhatsappLink.classList.remove('hidden');
  }

  if (el.notifyEmailLink) {
    const subject = encodeURIComponent(title || 'Atualização do site');
    const body = encodeURIComponent(eventText || message || '');
    if (notifications.email) {
      el.notifyEmailLink.href = `mailto:${notifications.email}?subject=${subject}&body=${body}`;
    } else {
      el.notifyEmailLink.href = `mailto:?subject=${subject}&body=${body}`;
    }
    el.notifyEmailLink.classList.remove('hidden');
  }

  if (typeof el.resultDialog.showModal === 'function') {
    el.resultDialog.showModal();
  } else {
    el.resultDialog.classList.remove('hidden');
  }
}

function closeResultDialog() {
  if (!el.resultDialog) return;
  if (typeof el.resultDialog.close === 'function') {
    el.resultDialog.close();
  } else {
    el.resultDialog.classList.add('hidden');
  }
}

function openGiftDialog(itemId) {
  const item = state.items.find((entry) => String(entry.id) === String(itemId));
  if (!item || String(item.status).toLowerCase() === 'escolhido') {
    showToast('Esse presente já foi escolhido.', true);
    return;
  }

  state.activeItem = item;

  if (el.giftDialogTitle) el.giftDialogTitle.textContent = item.item || item.nome || 'Presente';

  if (el.giftForm) {
    el.giftForm.reset();
    const itemIdInput = el.giftForm.querySelector('input[name="item_id"]');
    const itemNameInput = el.giftForm.querySelector('input[name="item_nome"]');
    if (itemIdInput) itemIdInput.value = item.id;
    if (itemNameInput) itemNameInput.value = item.item || item.nome || '';
  }

  if (el.giftDialog && typeof el.giftDialog.showModal === 'function') {
    el.giftDialog.showModal();
  }
}

function closeGiftDialog() {
  if (!el.giftDialog) return;
  if (typeof el.giftDialog.close === 'function') {
    el.giftDialog.close();
  } else {
    el.giftDialog.classList.add('hidden');
  }
}

function generateCancelCode(itemId) {
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${String(itemId).replace(/[^A-Za-z0-9]/g, '').toUpperCase()}-${randomPart}`;
}

function getFilteredItems() {
  const search = (el.search?.value || '').trim().toLowerCase();
  const categoria = el.categoria?.value || '';
  const faixa = el.faixa?.value || '';

  return state.items.filter((item) => {
    const nome = String(item.item || item.nome || '').toLowerCase();
    const cat = String(item.categoria || '');
    const faixaItem = String(item.faixa || '');

    const matchSearch = !search || nome.includes(search);
    const matchCategoria = !categoria || cat === categoria;
    const matchFaixa = !faixa || faixaItem === faixa;

    return matchSearch && matchCategoria && matchFaixa;
  });
}

function updateKPIs() {
  const disponiveis = state.items.filter((item) => String(item.status).toLowerCase() !== 'escolhido').length;
  const escolhidos = state.items.filter((item) => String(item.status).toLowerCase() === 'escolhido').length;

  if (el.kpiDisponiveis) el.kpiDisponiveis.textContent = String(disponiveis);
  if (el.kpiEscolhidos) el.kpiEscolhidos.textContent = String(escolhidos);
  if (el.kpiConfirmados) el.kpiConfirmados.textContent = String(state.rsvpsCount || 0);
}

function fillFilters() {
  if (!el.categoria || !el.faixa) return;

  const categorias = [...new Set(state.items.map((item) => item.categoria).filter(Boolean))].sort();
  const faixas = [...new Set(state.items.map((item) => item.faixa).filter(Boolean))];

  el.categoria.innerHTML = '<option value="">Todas as categorias</option>';
  categorias.forEach((cat) => {
    const option = document.createElement('option');
    option.value = cat;
    option.textContent = cat;
    el.categoria.appendChild(option);
  });

  el.faixa.innerHTML = '<option value="">Todas as faixas</option>';
  faixas.forEach((faixa) => {
    const option = document.createElement('option');
    option.value = faixa;
    option.textContent = faixa;
    el.faixa.appendChild(option);
  });
}

function renderCards() {
  if (!el.cards) return;

  const items = getFilteredItems();
  el.cards.innerHTML = '';

  if (!items.length) {
    el.empty?.classList.remove('hidden');
    return;
  }

  el.empty?.classList.add('hidden');

  items.forEach((item) => {
    const nome = item.item || item.nome || 'Presente';
    const preco = Number(item.preco || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
    const imagem = item.imagem || '';
    const status = String(item.status || 'Disponível');
    const link = item.link || '#';
    const reservado = status.toLowerCase() === 'escolhido';

    const article = document.createElement('article');
    article.className = 'card';
    article.innerHTML = `
      <div style="aspect-ratio: 1 / 1; background: #f7f7f7; display:flex; align-items:center; justify-content:center; overflow:hidden;">
        ${imagem
          ? `<img src="${escapeHtml(imagem)}" alt="${escapeHtml(nome)}" style="width:100%; height:100%; object-fit:cover;" onerror="this.onerror=null; this.outerHTML='<div style=&quot;padding:16px;color:#7fa08e;text-align:center;&quot;>Imagem indisponível</div>';">`
          : `<div style="padding:16px;color:#7fa08e;text-align:center;">Sem imagem</div>`
        }
      </div>
      <div class="card-body">
        <div class="badges">
          <span class="badge">${escapeHtml(item.categoria || 'Outros')}</span>
          <span class="badge ${reservado ? 'status-off' : ''}">${escapeHtml(status)}</span>
        </div>
        <h3>${escapeHtml(nome)}</h3>
        <p>${preco}</p>
        <p>${escapeHtml(item.faixa || '')}</p>
        <div class="card-footer">
          <a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer" class="link-btn">Ver produto</a>
          <button class="btn ${reservado ? 'btn-secondary' : 'btn-primary'} reserve-btn" type="button" data-item-id="${escapeHtml(item.id)}" ${reservado ? 'disabled' : ''}>
            ${reservado ? 'Já escolhido' : 'Escolher presente'}
          </button>
        </div>
      </div>
    `;

    el.cards.appendChild(article);
  });

  el.cards.querySelectorAll('.reserve-btn').forEach((button) => {
    button.addEventListener('click', () => openGiftDialog(button.dataset.itemId));
  });
}

async function initSupabase() {
  setEventTexts();

  const url = window.APP_CONFIG?.supabase?.url;
  const anonKey = window.APP_CONFIG?.supabase?.anonKey;

  if (!url || !anonKey || !window.supabase?.createClient) {
    showConfigBanner('Supabase não configurado. O site continuará funcionando com armazenamento local neste navegador.');
    return;
  }

  state.supabase = window.supabase.createClient(url, anonKey);
  hideConfigBanner();
}

async function loadReservations() {
  state.reservations = loadLocalReservations();

  if (!state.supabase) {
    syncItemsWithReservations();
    return;
  }

  try {
    const { data, error } = await state.supabase
      .from('gift_reservations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (Array.isArray(data) && data.length) {
      const latestByItem = new Map();
      for (const row of data) {
        const key = String(row.item_id || '');
        if (!latestByItem.has(key)) latestByItem.set(key, row);
      }
      state.reservations = [...latestByItem.values()];
      saveLocalReservations();
    }

    syncItemsWithReservations();
  } catch (error) {
    console.error('Erro ao carregar reservas:', error);
    syncItemsWithReservations();
    showConfigBanner('As reservas estão funcionando localmente neste navegador. Para sincronizar para todos, confira a tabela gift_reservations no Supabase.');
  }
}

async function loadRsvps() {
  state.rsvpsCount = loadLocalRsvps().length;

  if (!state.supabase) return;

  try {
    const { count, error } = await state.supabase
      .from('rsvps')
      .select('*', { count: 'exact', head: true });

    if (error) throw error;

    state.rsvpsCount = Number(count || 0);
  } catch (error) {
    console.error('Erro ao carregar confirmações:', error);
  }
}

async function sendNotificationEmail(templateParams) {
  try {
    await emailjs.send('service_20xzwfp', 'template_h8i4bvu', templateParams);
    return true;
  } catch (error) {
    console.error('ERRO EMAILJS:', error);
    return false;
  }
}

async function submitRsvp(formData) {
  const payload = {
    nome: String(formData.get('nome') || '').trim(),
    whatsapp: String(formData.get('whatsapp') || '').trim() || null,
    resposta: String(formData.get('resposta') || '').trim(),
    mensagem: String(formData.get('mensagem') || '').trim() || null,
    created_at: new Date().toISOString()
  };

  if (!payload.nome || !payload.resposta) {
    showToast('Preencha nome e resposta.', true);
    return;
  }

  let savedInSupabase = false;

  if (state.supabase) {
    try {
      const { error } = await state.supabase.from('rsvps').insert(payload);
      if (error) throw error;
      savedInSupabase = true;
    } catch (error) {
      console.error('ERRO SUPABASE RSVP:', error);
    }
  }

  saveLocalRsvp(payload);

  const emailEnviado = await sendNotificationEmail({
    name: payload.nome,
    guest_name: payload.nome,
    guest_phone: payload.whatsapp || '-',
    guest_count: '1',
    guest_message: payload.mensagem || '-',
    response: payload.resposta,
    sent_at: new Date().toLocaleString('pt-BR'),
    email: getNotificationsConfig().email || 'mari.pxto11@gmail.com'
  });

  el.rsvpForm?.reset();
  await loadRsvps();
  updateKPIs();

  if (typeof confetti === 'function' && payload.resposta === 'sim') {
    confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
  }

  const eventText = [
    'Nova confirmação no site do casamento.',
    '',
    `Nome: ${payload.nome}`,
    `WhatsApp: ${payload.whatsapp || '-'}`,
    `Resposta: ${payload.resposta}`,
    `Mensagem: ${payload.mensagem || '-'}`
  ].join('\n');

  showResult({
    title: 'Presença confirmada',
    message: savedInSupabase
      ? 'Sua resposta foi gravada com sucesso.'
      : 'Sua resposta foi gravada. Se o Supabase estiver indisponível, ela ficou salva localmente neste navegador.',
    eventText
  });

  if (!emailEnviado) {
    showToast('Presença salva, mas o e-mail não disparou.', true);
  } else {
    showToast('Confirmação enviada com sucesso.');
  }
}

async function submitGiftReservation(formData) {
  const itemId = String(formData.get('item_id') || '').trim();
  const itemNome = String(formData.get('item_nome') || '').trim();
  const convidado = String(formData.get('convidado') || '').trim();
  const whatsapp = String(formData.get('whatsapp') || '').trim();
  const observacao = String(formData.get('observacao') || '').trim();
  const confirmarPresenca = String(formData.get('confirmacao_presenca') || '').trim();

  if (!itemId || !convidado) {
    showToast('Preencha seu nome para reservar o presente.', true);
    return;
  }

  const existingActive = state.reservations.find((reservation) => String(reservation.item_id) === itemId && reservation.status !== 'cancelled');
  if (existingActive) {
    showToast('Esse presente já foi reservado.', true);
    closeGiftDialog();
    await loadReservations();
    renderCards();
    updateKPIs();
    return;
  }

  const cancelCode = generateCancelCode(itemId);
  const payload = {
    item_id: itemId,
    item_nome: itemNome,
    convidado,
    whatsapp: whatsapp || null,
    observacao: observacao || null,
    confirmacao_presenca: confirmarPresenca || null,
    cancel_code: cancelCode,
    status: 'reserved',
    created_at: new Date().toISOString()
  };

  let savedInSupabase = false;

  if (state.supabase) {
    try {
      const { error } = await state.supabase.from('gift_reservations').insert(payload);
      if (error) throw error;
      savedInSupabase = true;
    } catch (error) {
      console.error('ERRO SUPABASE RESERVA:', error);
    }
  }

  state.reservations.unshift(payload);
  saveLocalReservations();
  syncItemsWithReservations();
  renderCards();
  updateKPIs();
  closeGiftDialog();

  if (confirmarPresenca === 'sim' && el.rsvpForm) {
    const fd = new FormData();
    fd.set('nome', convidado);
    fd.set('whatsapp', whatsapp);
    fd.set('resposta', 'sim');
    fd.set('mensagem', observacao);
    await submitRsvp(fd);
  }

  const emailEnviado = await sendNotificationEmail({
    name: convidado,
    guest_name: convidado,
    guest_phone: whatsapp || '-',
    guest_count: '1',
    guest_message: `Presente escolhido: ${itemNome}${observacao ? ` | Observação: ${observacao}` : ''}`,
    sent_at: new Date().toLocaleString('pt-BR'),
    email: getNotificationsConfig().email || 'mari.pxto11@gmail.com'
  });

  const eventText = [
    'Novo presente reservado no site do casamento.',
    '',
    `Item: ${itemNome}`,
    `Convidado: ${convidado}`,
    `WhatsApp: ${whatsapp || '-'}`,
    `Código de cancelamento: ${cancelCode}`,
    `Observação: ${observacao || '-'}`
  ].join('\n');

  showResult({
    title: 'Presente reservado',
    message: savedInSupabase
      ? 'Reserva concluída com sucesso.'
      : 'Reserva concluída. Se o Supabase estiver indisponível, ela ficou salva localmente neste navegador.',
    cancelCode,
    eventText
  });

  if (typeof confetti === 'function') {
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
  }

  if (!emailEnviado) {
    showToast('Reserva salva, mas o e-mail não disparou.', true);
  } else {
    showToast('Presente reservado com sucesso.');
  }
}

async function cancelGiftReservation(formData) {
  const cancelCode = String(formData.get('cancel_code') || '').trim().toUpperCase();
  const cancelledBy = String(formData.get('cancelled_by') || '').trim();
  const note = String(formData.get('note') || '').trim();

  if (!cancelCode) {
    showToast('Informe o código de cancelamento.', true);
    return;
  }

  const reservation = state.reservations.find(
    (entry) => String(entry.cancel_code || '').toUpperCase() === cancelCode && entry.status !== 'cancelled'
  );

  if (!reservation) {
    showToast('Código não encontrado ou já cancelado.', true);
    return;
  }

  let updatedInSupabase = false;

  if (state.supabase) {
    try {
      const { error } = await state.supabase
        .from('gift_reservations')
        .update({
          status: 'cancelled',
          cancelled_by: cancelledBy || null,
          cancel_note: note || null,
          cancelled_at: new Date().toISOString()
        })
        .eq('cancel_code', cancelCode);

      if (error) throw error;
      updatedInSupabase = true;
    } catch (error) {
      console.error('ERRO SUPABASE CANCELAMENTO:', error);
    }
  }

  reservation.status = 'cancelled';
  reservation.cancelled_by = cancelledBy || null;
  reservation.cancel_note = note || null;
  reservation.cancelled_at = new Date().toISOString();

  saveLocalReservations();
  syncItemsWithReservations();
  renderCards();
  updateKPIs();
  el.cancelForm?.reset();

  const eventText = [
    'Presente liberado novamente no site do casamento.',
    '',
    `Item: ${reservation.item_nome || reservation.item_id}`,
    `Código: ${cancelCode}`,
    `Por: ${cancelledBy || '-'}`,
    `Motivo: ${note || '-'}`
  ].join('\n');

  showResult({
    title: 'Presente liberado',
    message: updatedInSupabase
      ? 'O presente voltou a ficar disponível.'
      : 'O presente voltou a ficar disponível. Se o Supabase estiver indisponível, a alteração ficou salva localmente neste navegador.',
    eventText
  });

  showToast('Presente liberado novamente.');
}

function attachEvents() {
  el.search?.addEventListener('input', renderCards);
  el.categoria?.addEventListener('change', renderCards);
  el.faixa?.addEventListener('change', renderCards);

  el.rsvpForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    await submitRsvp(new FormData(el.rsvpForm));
  });

  el.cancelForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    await cancelGiftReservation(new FormData(el.cancelForm));
  });

  el.giftForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    await submitGiftReservation(new FormData(el.giftForm));
  });

  el.copyPixBtn?.addEventListener('click', async () => {
    try {
      const pixKey = window.APP_CONFIG?.wedding?.pixKey || '';
      await navigator.clipboard.writeText(pixKey);
      showToast('Chave PIX copiada.');
    } catch (error) {
      console.error(error);
      showToast('Não foi possível copiar a chave PIX.', true);
    }
  });

  el.shareBtn?.addEventListener('click', () => {
    const baseText = window.APP_CONFIG?.wedding?.whatsappShareText || 'Escolha seu presente: ';
    const text = `${baseText}${window.location.href}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  });

  el.closeDialogBtn?.addEventListener('click', closeGiftDialog);
  el.closeResultDialogBtn?.addEventListener('click', closeResultDialog);
  el.closeResultBtn?.addEventListener('click', closeResultDialog);

  el.giftDialog?.addEventListener('click', (event) => {
    if (event.target === el.giftDialog) closeGiftDialog();
  });

  el.resultDialog?.addEventListener('click', (event) => {
    if (event.target === el.resultDialog) closeResultDialog();
  });
}

async function bootstrap() {
  await initSupabase();
  fillFilters();
  attachEvents();
  await loadReservations();
  await loadRsvps();
  updateKPIs();
  renderCards();
}

bootstrap();
