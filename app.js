import emailjs from 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/+esm';

emailjs.init({
  publicKey: 'oZjq5OdIqraX_zf0L'
});

const state = {
  items: Array.isArray(window.WEDDING_ITEMS) ? [...window.WEDDING_ITEMS] : [],
  supabase: null,
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
  shareBtn: document.getElementById('shareBtn'),
  coupleNames: document.getElementById('coupleNames'),
  eventDate: document.getElementById('eventDate'),
  eventTime: document.getElementById('eventTime'),
  eventDateLong: document.getElementById('eventDateLong'),
  resultDialog: document.getElementById('resultDialog'),
  resultTitle: document.getElementById('resultTitle'),
  resultMessage: document.getElementById('resultMessage'),
  closeResultDialogBtn: document.getElementById('closeResultDialogBtn'),
  closeResultBtn: document.getElementById('closeResultBtn'),
  notifyWhatsappLink: document.getElementById('notifyWhatsappLink'),
  notifyEmailLink: document.getElementById('notifyEmailLink'),
};

function showToast(message, isError = false) {
  if (!el.toast) return;
  el.toast.textContent = message;
  el.toast.classList.remove('hidden', 'success-burst');
  el.toast.style.background = isError ? '#8b2d2d' : '#3a7d5d';

  if (!isError) {
    void el.toast.offsetWidth;
    el.toast.classList.add('success-burst');
  }

  setTimeout(() => {
    el.toast.classList.add('hidden');
  }, 3400);
}

function showResult({ title, message, eventText = '' }) {
  if (!el.resultDialog || !el.resultTitle || !el.resultMessage) return;

  el.resultTitle.textContent = title;
  el.resultMessage.textContent = message;
  el.resultDialog.classList.remove('hidden');

  if (el.notifyWhatsappLink) {
    el.notifyWhatsappLink.href = https://wa.me/?text=${eventText};
  }

  if (el.notifyEmailLink) {
    const subject = encodeURIComponent(title || 'Atualização do site');
    const body = eventText.replace(/%0A/g, '\n');
    el.notifyEmailLink.href = mailto:?subject=${subject}&body=${encodeURIComponent(body)};
  }
}

function closeResultDialog() {
  if (!el.resultDialog) return;
  el.resultDialog.classList.add('hidden');
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
  if (el.eventDateLong) el.eventDateLong.textContent = 18 de abril de 2026 às ${timeLabel};
  if (el.pixKeyView) el.pixKeyView.textContent = pixKey;
}

function initSupabase() {
  setEventTexts();

  const url = window.APP_CONFIG?.supabase?.url;
  const anonKey = window.APP_CONFIG?.supabase?.anonKey;

  if (!url || !anonKey || !window.supabase?.createClient) {
    console.error('Supabase ausente ou inválido.');
    return;
  }

  state.supabase = window.supabase.createClient(url, anonKey);
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
    const matchCategoria = !categoria || categoria === 'Todas' || cat === categoria;
    const matchFaixa = !faixa || faixa === 'Todas' || faixaItem === faixa;

    return matchSearch && matchCategoria && matchFaixa;
  });
}

function updateKPIs() {
  if (!Array.isArray(state.items)) return;

  const disponiveis = state.items.filter(i => String(i.status || '').toLowerCase() !== 'escolhido').length;
  const escolhidos = state.items.filter(i => String(i.status || '').toLowerCase() === 'escolhido').length;

  if (el.kpiDisponiveis) el.kpiDisponiveis.textContent = String(disponiveis);
  if (el.kpiEscolhidos) el.kpiEscolhidos.textContent = String(escolhidos);
  if (el.kpiConfirmados) el.kpiConfirmados.textContent = '—';
}

function fillFilters() {
  if (!el.categoria || !el.faixa) return;

  const categorias = [...new Set(state.items.map(i => i.categoria).filter(Boolean))];
  const faixas = [...new Set(state.items.map(i => i.faixa).filter(Boolean))];

  el.categoria.innerHTML = '<option value="">Todas</option>';
  categorias.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat;
    option.textContent = cat;
    el.categoria.appendChild(option);
  });

  el.faixa.innerHTML = '<option value="">Todas</option>';
  faixas.forEach(faixa => {
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
    if (el.empty) el.empty.classList.remove('hidden');
    return;
  }

  if (el.empty) el.empty.classList.add('hidden');

  items.forEach((item) => {
    const nome = item.item || item.nome || 'Presente';
    const preco = Number(item.preco || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
    const imagem = item.imagem || '';
    const status = item.status || 'Disponível';
    const link = item.link || '#';

    const article = document.createElement('article');
    article.className = 'gift-card';

    article.innerHTML = `
      <div class="gift-card__media">
        ${imagem
          ? <img src="${imagem}" alt="${nome}" class="gift-card__image" onerror="this.style.display='none'">
          : <div class="gift-card__placeholder">Sem imagem</div>
        }
      </div>
      <div class="gift-card__content">
        <div class="gift-card__top">
          <span class="gift-card__category">${item.categoria || ''}</span>
          <span class="gift-card__status">${status}</span>
        </div>
        <h3 class="gift-card__title">${nome}</h3>
        <p class="gift-card__price">${preco}</p>
        <p class="gift-card__range">${item.faixa || ''}</p>
        <div class="gift-card__actions">
          <a href="${link}" target="blank" rel="noopener noreferrer" class="gift-card_link">
            Ver produto
          </a>
        </div>
      </div>
    `;

    el.cards.appendChild(article);
  });
}

async function loadRsvps() {
  if (!state.supabase) return;
  try {
    const { count } = await state.supabase
      .from('rsvps')
      .select('*', { count: 'exact', head: true });

    if (el.kpiConfirmados) {
      el.kpiConfirmados.textContent = String(count ?? '0');
    }
  } catch (error) {
    console.error('Erro ao carregar RSVPs:', error);
  }
}

async function submitRsvp(formData) {
  const payload = {
    nome: formData.get('nome'),
    whatsapp: formData.get('whatsapp') || null,
    resposta: formData.get('resposta'),
    mensagem: formData.get('mensagem') || null,
  };

  if (!state.supabase) {
    showToast('Configuração do Supabase ausente.', true);
    return;
  }

  const { error } = await state.supabase
    .from('rsvps')
    .insert(payload);

  if (error) {
    console.error('ERRO SUPABASE:', error);
    showToast('Não foi possível gravar a confirmação.', true);
    return;
  }

  let emailEnviado = false;

  try {
    await emailjs.send(
      'service_20xzwfp',
      'template_h8i4bvu',
      {
        name: payload.nome || 'Convidado',
        guest_name: payload.nome || 'Convidado',
        guest_phone: payload.whatsapp || '-',
        guest_count: '1',
        guest_message: payload.mensagem || '-',
        sent_at: new Date().toLocaleString('pt-BR'),
        email: 'jacke.lacerdinha@gmail.com'
      }
    );
    emailEnviado = true;
  } catch (e) {
    console.error('ERRO EMAILJS:', e);
  }

  if (el.rsvpForm) el.rsvpForm.reset();

  showToast('🎉 Confirmação enviada com sucesso!');

  if (typeof confetti === 'function') {
    confetti({
      particleCount: 150,
      spread: 90,
      origin: { y: 0.6 }
    });
  }

  if (!emailEnviado) {
    showToast('⚠️ Presença salva, mas o e-mail não foi enviado.', true);
  }

  await loadRsvps();

  const eventText = Nova confirmação no site do casamento.%0A%0ANome: ${payload.nome}%0AWhatsApp: ${payload.whatsapp || '-'}%0AResposta: ${payload.resposta}%0AMensagem: ${payload.mensagem || '-'};

  showResult({
    title: 'Presença confirmada',
    message: 'Sua resposta foi gravada com sucesso.',
    eventText
  });
}

function attachEvents() {
  if (el.search) el.search.addEventListener('input', renderCards);
  if (el.categoria) el.categoria.addEventListener('change', renderCards);
  if (el.faixa) el.faixa.addEventListener('change', renderCards);

  if (el.rsvpForm) {
    el.rsvpForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(el.rsvpForm);
      await submitRsvp(formData);
    });
  }

  if (el.copyPixBtn) {
    el.copyPixBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(window.APP_CONFIG?.wedding?.pixKey || '');
        showToast('Chave PIX copiada.');
      } catch (error) {
        console.error(error);
        showToast('Não foi possível copiar a chave PIX.', true);
      }
    });
  }

  if (el.shareBtn) {
    el.shareBtn.addEventListener('click', () => {
      const text = ${window.APP_CONFIG?.wedding?.whatsappShareText || ''}${window.location.href};
      window.open(https://wa.me/?text=${encodeURIComponent(text)}, '_blank');
    });
  }

  if (el.closeResultDialogBtn) {
    el.closeResultDialogBtn.addEventListener('click', closeResultDialog);
  }

  if (el.closeResultBtn) {
    el.closeResultBtn.addEventListener('click', closeResultDialog);
  }

  if (el.resultDialog) {
    el.resultDialog.addEventListener('click', (event) => {
      if (event.target === el.resultDialog) closeResultDialog();
    });
  }
}

async function bootstrap() {
  initSupabase();
  fillFilters();
  attachEvents();
  updateKPIs();
  renderCards();
  await loadRsvps();
}

bootstrap();
