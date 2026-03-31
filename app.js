import emailjs from 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/+esm';

emailjs.init({
  publicKey: 'oZjq5OdIqraX_zf0L'
});

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

function showToast(message, isError = false) {
  el.toast.textContent = message;
  el.toast.classList.remove('hidden', 'success-burst');
  el.toast.style.background = isError ? '#8b2d2d' : '#3a7d5d';
  if (!isError) {
    void el.toast.offsetWidth;
    el.toast.classList.add('success-burst');
  }
  setTimeout(() => el.toast.classList.add('hidden'), 3400);
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

  const { error } = await state.supabase
    .from('rsvps')
    .insert(payload);

  if (error) {
    console.error(error);
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

  el.rsvpForm.reset();
  await loadRsvps();

  if (emailEnviado) {
    showToast('🎉 Confirmação enviada com sucesso!');

    if (typeof confetti === 'function') {
      confetti({
        particleCount: 150,
        spread: 90,
        origin: { y: 0.6 }
      });
    }
  } else {
    showToast('⚠️ Salvo no banco, mas o e-mail não foi enviado.', true);
  }

  const eventText = `Nova confirmação no site do casamento.%0A%0ANome: ${payload.nome}%0AWhatsApp: ${payload.whatsapp || '-'}%0AResposta: ${payload.resposta}%0AMensagem: ${payload.mensagem || '-'}`;

   showResult({
    title: 'Presença confirmada',
    message: 'Sua resposta foi gravada com sucesso.',
    eventText
  });
}

function attachEvents() {
  if (el.search && typeof renderCards === 'function') {
    el.search.addEventListener('input', renderCards);
  }

  if (el.categoria && typeof renderCards === 'function') {
    el.categoria.addEventListener('change', renderCards);
  }

  if (el.faixa && typeof renderCards === 'function') {
    el.faixa.addEventListener('change', renderCards);
  }

  if (el.cards && typeof openGiftDialog === 'function') {
    el.cards.addEventListener('click', (event) => {
      const btn = event.target.closest('.reserve-btn');
      if (!btn) return;
      openGiftDialog(btn.dataset.id);
    });
  }

  if (el.closeDialogBtn && typeof closeGiftDialog === 'function') {
    el.closeDialogBtn.addEventListener('click', closeGiftDialog);
  }

  if (el.dialog && typeof closeGiftDialog === 'function') {
    el.dialog.addEventListener('click', (event) => {
      if (event.target === el.dialog) closeGiftDialog();
    });
  }

  if (el.closeResultDialogBtn && typeof closeResultDialog === 'function') {
    el.closeResultDialogBtn.addEventListener('click', closeResultDialog);
  }

  if (el.closeResultBtn && typeof closeResultDialog === 'function') {
    el.closeResultBtn.addEventListener('click', closeResultDialog);
  }

  if (el.resultDialog && typeof closeResultDialog === 'function') {
    el.resultDialog.addEventListener('click', (event) => {
      if (event.target === el.resultDialog) closeResultDialog();
    });
  }

  if (el.giftForm && typeof reserveGift === 'function') {
    el.giftForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(el.giftForm);
      await reserveGift(formData);
    });
  }

  if (el.rsvpForm) {
    el.rsvpForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(el.rsvpForm);
      await submitRsvp(formData);
    });
  }

  if (el.cancelForm && typeof cancelGift === 'function') {
    el.cancelForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(el.cancelForm);
      await cancelGift(formData);
    });
  }

  if (el.copyPixBtn) {
    el.copyPixBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(window.APP_CONFIG?.wedding?.pixKey || '');
        showToast('Chave PIX copiada.');
      } catch (_e) {
        showToast('Não foi possível copiar a chave PIX.', true);
      }
    });
  }

  if (el.shareBtn) {
    el.shareBtn.addEventListener('click', () => {
      const text = `${window.APP_CONFIG?.wedding?.whatsappShareText || ''}${window.location.href}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    });
  }
}

function setEventTexts() {
  const { couple, dateLabel, timeLabel, pixKey } = window.APP_CONFIG.wedding;

  el.coupleNames.textContent = couple;
  el.eventDate.textContent = dateLabel;
  el.eventTime.textContent = timeLabel;
  el.eventDateLong.textContent = `18 de abril de 2026 às ${timeLabel}`;
  el.pixKeyView.textContent = pixKey || '62995163186';
}

function initSupabase() {
  setEventTexts();

  const { url, anonKey } = window.APP_CONFIG.supabase;
  state.supabase = window.supabase.createClient(url, anonKey);
}

function bootstrap() {
  initSupabase();
  attachEvents();

  if (typeof fillFilters === 'function') fillFilters();
  if (typeof updateKPIs === 'function') updateKPIs();
  if (typeof renderCards === 'function') renderCards();
}

bootstrap();
