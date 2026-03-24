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
  shareBtn: document.getElementById('shareBtn'),
  coupleNames: document.getElementById('coupleNames'),
  eventDate: document.getElementById('eventDate'),
  eventTime: document.getElementById('eventTime'),
  eventDateLong: document.getElementById('eventDateLong'),
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
  showToast.timer = setTimeout(() => el.toast.classList.add('hidden'), 3200);
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
    const card = document.createElement('article');
    card.className = 'card';
    const domainLabel = item.link ? (() => {
      try { return new URL(item.link).hostname.replace('www.', ''); } catch { return 'loja online'; }
    })() : '';

    card.innerHTML = `
      <div class="card-body">
        <div class="badges">
          <span class="badge">${escapeHtml(item.categoria)}</span>
          <span class="badge">${escapeHtml(item.faixa)}</span>
        </div>
        <h3>${escapeHtml(item.item)}</h3>
        <p class="price"><strong>${currencyBRL(item.preco)}</strong></p>
        <p>${item.link ? `Ao clicar em <strong>Ver na loja</strong>, a pessoa será redirecionada para a sugestão de compra em ${escapeHtml(domainLabel)}.` : 'Presente disponível para reserva.'}</p>
        <div class="card-footer">
          <a class="link-btn" href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer">Ver na loja</a>
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
    showToast('Site carregado em modo demonstração. Preencha o config.js para salvar online.', true);
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

async function reserveGift(formData) {
  const itemId = formData.get('item_id');

  if (getReservedIds().has(itemId)) {
    showToast('Esse presente já foi reservado.', true);
    closeGiftDialog();
    return;
  }

  const payload = {
    item_id: itemId,
    item_nome: formData.get('item_nome'),
    convidado: formData.get('convidado'),
    whatsapp: formData.get('whatsapp') || null,
    observacao: formData.get('observacao') || null,
    confirmacao_presenca: formData.get('confirmacao_presenca') || null
  };

  if (!state.supabase) {
    state.pendingReservationIds.add(itemId);
    updateKPIs();
    renderCards();
    showToast('Modo demonstração: item bloqueado só nesta visualização. Conecte o Supabase para salvar para todos.', true);
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
    await state.supabase.from('rsvps').insert({
      nome: payload.convidado,
      whatsapp: payload.whatsapp,
      resposta: payload.confirmacao_presenca,
      mensagem: payload.observacao
    });
  }

  state.pendingReservationIds.delete(itemId);
  showToast('Presente reservado com sucesso!');
  closeGiftDialog();
  await Promise.all([loadReservations(), loadRsvps()]);
}

async function submitRsvp(formData) {
  const payload = {
    nome: formData.get('nome'),
    whatsapp: formData.get('whatsapp') || null,
    resposta: formData.get('resposta'),
    mensagem: formData.get('mensagem') || null
  };

  if (!state.supabase) {
    state.rsvps.unshift(payload);
    updateKPIs();
    showToast('Modo demonstração: confirmação salva só nesta visualização.', true);
    el.rsvpForm.reset();
    return;
  }

  const { error } = await state.supabase.from('rsvps').insert(payload);
  if (error) {
    console.error(error);
    showToast('Não foi possível registrar sua resposta.', true);
    return;
  }
  showToast('Presença registrada com sucesso!');
  el.rsvpForm.reset();
  await loadRsvps();
}

async function shareSite() {
  const text = `${window.APP_CONFIG.wedding.whatsappShareText}${window.location.href}`;
  if (navigator.share) {
    try {
      await navigator.share({ title: document.title, text, url: window.location.href });
      return;
    } catch {}
  }
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
}

document.addEventListener('click', (event) => {
  const reserveBtn = event.target.closest('.reserve-btn');
  if (reserveBtn) openGiftDialog(reserveBtn.dataset.id);
});

el.closeDialogBtn.addEventListener('click', closeGiftDialog);
el.search.addEventListener('input', renderCards);
el.categoria.addEventListener('change', renderCards);
el.faixa.addEventListener('change', renderCards);
el.shareBtn?.addEventListener('click', shareSite);

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

el.copyPixBtn.addEventListener('click', async () => {
  const key = window.APP_CONFIG.wedding.pixKey;
  try {
    await navigator.clipboard.writeText(key);
    showToast('Chave PIX copiada!');
  } catch {
    showToast('Não foi possível copiar a chave PIX.', true);
  }
});

fillFilters();
initSupabase();
renderCards();
updateKPIs();
