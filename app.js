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
  el.toast.classList.remove('hidden');
  el.toast.style.background = isError ? '#8b2d2d' : '#2f261e';
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
    showToast('Configuração do Supabase ausente.', true);
    return;
  }

  const { error } = await state.supabase
    .from('rsvps')
    .insert(payload);

  if (error) {
    console.error('ERRO SUPABASE:', error);
    showToast('Erro ao salvar confirmação.', true);
    return;
  }

  let emailEnviado = false;

  try {
    await emailjs.send(
      'service_20xzwfp',
      'rgyssxl',
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
    showToast('Salvo no banco, mas o e-mail não foi enviado.', true);
  }

  el.rsvpForm.reset();

  if (emailEnviado) {
    showToast('Confirmação enviada com sucesso!');
  } else {
    showToast('Confirmação salva no banco com sucesso!');
  }
}

function attachEvents() {
  el.rsvpForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(el.rsvpForm);
    await submitRsvp(formData);
  });

  el.copyPixBtn.addEventListener('click', async () => {
    await navigator.clipboard.writeText(window.APP_CONFIG.wedding.pixKey || '62995163186');
    showToast('PIX copiado!');
  });
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
}

bootstrap();
