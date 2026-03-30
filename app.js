const state = {
  items: [...window.WEDDING_ITEMS],
  reservations: [],
  rsvps: [],
  supabase: null,
  pendingReservationIds: new Set(),
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
  dialog: document.getElementById('giftDialog'),
  dialogTitle: document.getElementById('giftDialogTitle'),
  giftForm: document.getElementById('giftForm'),
  closeDialogBtn: document.getElementById('closeDialogBtn'),
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
  resultDialog: document.getElementById('resultDialog'),
  resultTitle: document.getElementById('resultTitle'),
  resultMessage: document.getElementById('resultMessage'),
  cancelCodeWrap: document.getElementById('cancelCodeWrap'),
  cancelCodeView: document.getElementById('cancelCodeView'),
  notifyEmailLink: document.getElementById('notifyEmailLink'),
  notifyWhatsappLink: document.getElementById('notifyWhatsappLink'),
  closeResultDialogBtn: document.getElementById('closeResultDialogBtn'),
  closeResultBtn: document.getElementById('closeResultBtn'),
};

function currencyBRL(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));
}

function normalize(str) {
  return String(str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function showToast(message, isError = false) {
  el.toast.textContent = message;
  el.toast.classList.remove('hidden');
  el.toast.style.background = isError ? '#8b2d2d' : '#2f261e';
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => el.toast.classList.add('hidden'), 3400);
}

function showResult({ title, message, cancelCode = '', eventText = '' }) {
  el.resultTitle.textContent = title;
  el.resultMessage.textContent = message;
  el.cancelCodeWrap.classList.toggle('hidden', !cancelCode);
  el.cancelCodeView.textContent = cancelCode;

  const email = window.APP_CONFIG.notifications?.email?.trim();
  const whatsapp = String(window.APP_CONFIG.notifications?.whatsapp || '').replace(/\D/g, '');

  if (email) {
    const subject = encodeURIComponent(`Site do casamento — ${title}`);
    const body = encodeURIComponent(eventText || message);
    el.notifyEmailLink.href = `mailto:${email}?subject=${subject}&body=${body}`;
    el.notifyEmailLink.classList.remove('hidden');
  } else {
    el.notifyEmailLink.classList.add('hidden');
  }

  if (whatsapp) {
    const text = encodeURIComponent(eventText || message);
    el.notifyWhatsappLink.href = `https://wa.me/${whatsapp}?text=${text}`;
    el.notifyWhatsappLink.classList.remove('hidden');
  } else {
    el.notifyWhatsappLink.classList.add('hidden');
  }

  el.resultDialog.showModal();
}

function closeResultDialog() {
  el.resultDialog.close();
}

function randomCancelCode() {
  return `CASA-${Math.random().toString(36).slice(2, 6).toUpperCase()}${Math.floor(Math.random() * 90 + 10)}`;
}

function getPresetReservedIds() {
  return new Set(
    state.items
      .filter(item => normalize(item.status) === 'escolhido')
      .map(item => item.id)
  );
}

function getReservedIds() {
  return new Set([...getPresetReservedIds(), ...state.reservations.map(r => r.item_id), ...state.pendingReservationIds]);
}

function fillFilters() {
  const categorias = [...new Set(state.items.map(i => i.categoria).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const faixas = [...new Set(state.items.map(i => i.faixa).filter(Boolean))];
  categorias.forEach(c => el.categoria.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`));
  faixas.forEach(f => el.faixa.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(f)}">${escapeHtml(f)}</option>`));
}

function filteredItems() {
  const q = normalize(el.search.value);
  const categoria = el.categoria.value;
  const faixa = el.faixa.value;
  const reserved = getReservedIds();

  return state.items.filter(item => {
    const available = !reserved.has(item.id);
    const haystack = [item.item, item.categoria, item.faixa].map(normalize).join(' ');
    const matchesQ = !q || haystack.includes(q);
    const matchesC = !categoria || item.categoria === categoria;
    const matchesF = !faixa || item.faixa === faixa;
    return available && matchesQ && matchesC && matchesF;
  });
}

function updateKPIs() {
  const reservedCount = getReservedIds().size;
  const confirmedCount = state.rsvps.filter(r => normalize(r.resposta) === 'sim').length;
  el.kpiDisponiveis.textContent = String(Math.max(state.items.length - reservedCount, 0));
  el.kpiEscolhidos.textContent = String(reservedCount);
  el.kpiConfirmados.textContent = String(confirmedCount);
}

function renderCards() {
  const list = filteredItems();
  el.cards.innerHTML = '';
  el.empty.classList.toggle('hidden', list.length > 0);

  list.forEach(item => {
    let domainLabel = 'uma loja sugerida';
    try {
      domainLabel = item.link ? new URL(item.link).hostname.replace('www.', '') : domainLabel;
    } catch (_e) {}

    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `
      <div class="card-body">
        <div class="badges">
          ${item.categoria ? `<span class="badge">${escapeHtml(item.categoria)}</span>` : ''}
          ${item.faixa ? `<span class="badge status-off">${escapeHtml(item.faixa)}</span>` : ''}
        </div>
        <h3>${escapeHtml(item.item)}</h3>
        <p class="price"><strong>${currencyBRL(item.preco)}</strong></p>
        <p>${item.link ? `Ao clicar em <strong>Ver na loja</strong>, a pessoa será redirecionada para a sugestão de compra em ${escapeHtml(domainLabel)}.` : 'Presente disponível para reserva.'}</p>
        <div class="card-footer">
          ${item.link ? `<a class="link-btn" href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer">Ver na loja</a>` : ''}
          <button class="btn btn-primary reserve-btn" data-id="${escapeHtml(item.id)}">Já comprei / reservar</button>
        </div>
      </div>`;
    el.cards.appendChild(card);
  });
}

function openGiftDialog(itemId) {
  const item = state.items.find(i => i.id === itemId);
  if (!item) return;
  if (getReservedIds().has(itemId)) {
    showToast('Esse presente acabou de ser reservado por outra pessoa.', true);
    renderCards();
    updateKPIs();
    return;
  }
  el.dialogTitle.textContent = item.item;
  el.giftForm.item_id.value = item.id;
  el.giftForm.item_nome.value = item.item;
  el.dialog.showModal();
}

function closeGiftDialog() {
  el.dialog.close();
  el.giftForm.reset();
}

function setEventTexts() {
  const { couple, dateLabel, timeLabel } = window.APP_CONFIG.wedding;
  el.coupleNames.textContent = couple;
  el.eventDate.textContent = dateLabel;
  el.eventTime.textContent = timeLabel;
  el.eventDateLong.textContent = `18 de abril de 2026 às ${timeLabel}`;
  el.pixKeyView.textContent = window.APP_CONFIG.wedding.pixKey || '62995163186';
}

async function initSupabase() {
  const { url, anonKey } = window.APP_CONFIG.supabase;
  setEventTexts();

  if (!url || url.includes('COLE_') || !anonKey || anonKey.includes('COLE_')) {
    el.configBanner.textContent = 'O site está em modo demonstração. Para gravar RSVP e reservas online, atualize o config.js com a URL do Supabase e a Publishable key, depois faça novo deploy na Vercel.';
    el.configBanner.classList.remove('hidden');
    hydrateDemoData();
    return;
  }

  state.supabase = window.supabase.createClient(url, anonKey);
  await Promise.all([loadReservations(), loadRsvps()]);
}

function hydrateDemoData() {
  state.reservations = [];
  state.rsvps = [];
  updateKPIs();
  renderCards();
}

async function loadReservations() {
  const { data, error } = await state.supabase
    .from('gift_reservations')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error(error);
    showToast('Não foi possível carregar as reservas.', true);
    return;
  }
  state.reservations = data || [];
  updateKPIs();
  renderCards();
}

async function loadRsvps() {
  const { data, error } = await state.supabase
    .from('rsvps')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error(error);
    showToast('Não foi possível carregar o RSVP.', true);
    return;
  }
  state.rsvps = data || [];
  updateKPIs();
}

async function submitRsvp(formData) {
  const payload = {
    nome: formData.get('nome'),
    whatsapp: formData.get('whatsapp') || null,
    resposta: formData.get('resposta'),
    mensagem: formData.get('mensagem') || null,
  };

  if (!state.supabase) {
    showToast('A confirmação não será salva enquanto o config.js estiver sem as credenciais do Supabase.', true);
    return;
  }

  const { data, error } = await state.supabase
  .from('rsvps')
  .insert(payload)
  .select();
  if (error) {
    console.error(error);
    showToast('Não foi possível gravar a confirmação.', true);
    return;
  }
// AUTOMAÇÃO AQUI

// 1. Marcar como confirmado automaticamente

// 2. salvar no banco
await state.supabase
  .from('rsvps')
  .update({ confirmado: true })
  .eq('id', data[0].id);

// 3. log
console.log("Confirmação automática realizada");
}
  el.rsvpForm.reset();
  await loadRsvps();

  const eventText = `Nova confirmação no site do casamento.%0A%0ANome: ${payload.nome}%0AWhatsApp: ${payload.whatsapp || '-'}%0AResposta: ${payload.resposta}%0AMensagem: ${payload.mensagem || '-'}`;
  showResult({
    title: 'Presença confirmada',
    message: 'Sua resposta foi gravada com sucesso.',
    eventText
  });
}

async function reserveGift(formData) {
  const itemId = formData.get('item_id');
  if (getReservedIds().has(itemId)) {
    showToast('Esse presente já foi reservado.', true);
    closeGiftDialog();
    return;
  }

  const cancelCode = randomCancelCode();
  const payload = {
    item_id: itemId,
    item_nome: formData.get('item_nome'),
    convidado: formData.get('convidado'),
    whatsapp: formData.get('whatsapp') || null,
    observacao: formData.get('observacao') || null,
    confirmacao_presenca: formData.get('confirmacao_presenca') || null,
    cancel_code: cancelCode,
  };

  if (!state.supabase) {
    state.pendingReservationIds.add(itemId);
    updateKPIs();
    renderCards();
    showToast('A reserva não será compartilhada com todos enquanto o config.js estiver sem as credenciais do Supabase.', true);
    closeGiftDialog();
    return;
  }

  state.pendingReservationIds.add(itemId);
  updateKPIs();
  renderCards();

  const { error } = await state.supabase.from('gift_reservations').insert(payload);
  if (error) {
    console.error(error);
    state.pendingReservationIds.delete(itemId);
    showToast('Esse presente já foi reservado ou ocorreu um erro.', true);
    await loadReservations();
    return;
  }

  if (payload.confirmacao_presenca) {
    const { error: rsvpError } = await state.supabase.from('rsvps').insert({
      nome: payload.convidado,
      whatsapp: payload.whatsapp,
      resposta: payload.confirmacao_presenca,
      mensagem: payload.observacao
    });
    if (rsvpError) console.error(rsvpError);
  }

  closeGiftDialog();
  await Promise.all([loadReservations(), loadRsvps()]);

  const eventText = `Nova reserva no site do casamento.%0A%0ANome: ${payload.convidado}%0APresente: ${payload.item_nome}%0AWhatsApp: ${payload.whatsapp || '-'}%0AConfirmação de presença: ${payload.confirmacao_presenca || '-'}%0ACódigo de cancelamento: ${cancelCode}`;
  showResult({
    title: 'Presente reservado',
    message: 'Reserva registrada com sucesso. Guarde o código abaixo para liberar o presente no futuro, se necessário.',
    cancelCode,
    eventText
  });
}

async function cancelGift(formData) {
  const cancelCode = String(formData.get('cancel_code') || '').trim();
  const cancelledBy = formData.get('cancelled_by') || null;
  const note = formData.get('note') || null;

  if (!state.supabase) {
    showToast('A desistência não será salva enquanto o config.js estiver sem as credenciais do Supabase.', true);
    return;
  }

  const { data, error } = await state.supabase.rpc('cancel_gift_by_code', {
    p_cancel_code: cancelCode,
    p_cancelled_by: cancelledBy,
    p_note: note,
  });

  if (error) {
    console.error(error);
    showToast('Código não encontrado ou cancelamento não disponível.', true);
    return;
  }

  el.cancelForm.reset();
  await loadReservations();

  const item = Array.isArray(data) && data[0] ? data[0] : null;
  const eventText = `Houve desistência de presente no site do casamento.%0A%0APresente liberado: ${item?.item_nome || '-'}%0AInformado por: ${cancelledBy || '-'}%0AObservação: ${note || '-'}%0ACódigo usado: ${cancelCode}`;
  showResult({
    title: 'Presente liberado novamente',
    message: 'O presente voltou a ficar disponível. A confirmação de presença foi mantida separadamente.',
    eventText
  });
}

function attachEvents() {
  el.search.addEventListener('input', renderCards);
  el.categoria.addEventListener('change', renderCards);
  el.faixa.addEventListener('change', renderCards);

  el.cards.addEventListener('click', (event) => {
    const btn = event.target.closest('.reserve-btn');
    if (!btn) return;
    openGiftDialog(btn.dataset.id);
  });

  el.closeDialogBtn.addEventListener('click', closeGiftDialog);
  el.dialog.addEventListener('click', (event) => {
    if (event.target === el.dialog) closeGiftDialog();
  });
  el.closeResultDialogBtn.addEventListener('click', closeResultDialog);
  el.closeResultBtn.addEventListener('click', closeResultDialog);
  el.resultDialog.addEventListener('click', (event) => {
    if (event.target === el.resultDialog) closeResultDialog();
  });

  el.giftForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(el.giftForm);
    await reserveGift(formData);
  });

  el.rsvpForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(el.rsvpForm);
    await submitRsvp(formData);
  });

  el.cancelForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(el.cancelForm);
    await cancelGift(formData);
  });

  el.copyPixBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(window.APP_CONFIG.wedding.pixKey || '');
      showToast('Chave PIX copiada.');
    } catch (_e) {
      showToast('Não foi possível copiar a chave PIX.', true);
    }
  });

  el.shareBtn.addEventListener('click', () => {
    const text = `${window.APP_CONFIG.wedding.whatsappShareText}${window.location.href}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  });
}

function bootstrap() {
  fillFilters();
  attachEvents();
  updateKPIs();
  renderCards();
  initSupabase();
}

bootstrap();
