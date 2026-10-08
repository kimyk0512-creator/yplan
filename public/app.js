const menuButton = document.querySelector('.menu-toggle');
const mobileMenu = document.querySelector('#mobile-menu');
menuButton.addEventListener('click', () => {
  const expanded = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!expanded));
  menuButton.setAttribute('aria-label', expanded ? '메뉴 열기' : '메뉴 닫기');
  mobileMenu.hidden = expanded;
});
mobileMenu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  mobileMenu.hidden = true;
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', '메뉴 열기');
}));
document.querySelectorAll('[data-service]').forEach(link => link.addEventListener('click', () => {
  document.querySelector('#service-select').value = link.dataset.service;
}));
const privacy = document.querySelector('#privacy-dialog');
document.querySelectorAll('.privacy-trigger').forEach(button => button.addEventListener('click', () => privacy.showModal()));
document.querySelectorAll('.dialog-close,.dialog-close-bottom').forEach(button => button.addEventListener('click', () => privacy.close()));
document.querySelector('#year').textContent = new Date().getFullYear();
const form = document.querySelector('#consultation-form');
if (form) {
  const selectedService = new URLSearchParams(window.location.search).get('service');
  const select = document.querySelector('#service-select');
  if (selectedService && [...select.options].some(option => option.value === selectedService)) select.value = selectedService;
let requestId = crypto.randomUUID();
let onlineAvailable = false;
const submitButton = form.querySelector('[type="submit"]');
submitButton.disabled = true;
fetch('/api/consultation', {cache:'no-store'}).then(response => response.json()).then(result => {
  onlineAvailable = result.available === true;
}).catch(() => {}).finally(() => {
  submitButton.disabled = false;
  if (!onlineAvailable) {
    submitButton.textContent = '이메일로 상담 요청하기';
    document.querySelector('#form-status').textContent = '작성하신 내용이 메일 앱에 준비됩니다. 메일 앱에서 보내기를 눌러 주세요.';
  }
});
form.addEventListener('submit', async event => {
  event.preventDefault();
  const status = document.querySelector('#form-status');
  status.className = 'form-status';
  const button = form.querySelector('[type="submit"]');
  const payload = Object.fromEntries(new FormData(form));
  payload.consent = payload.consent === 'on';
  payload.requestId = requestId;
  const emailText = ['회사·브랜드명: '+payload.company, '담당자: '+payload.name, '연락처: '+payload.phone, '이메일: '+payload.email, '관심 서비스: '+payload.service, '', payload.message].join('\n');
  const emailHref = 'mailto:ysh01110@naver.com?subject='+encodeURIComponent('[와이플랜 상담] '+payload.company)+'&body='+encodeURIComponent(emailText);
  if (!onlineAvailable) {
    window.location.href = emailHref;
    status.textContent = '메일 앱에서 보내기를 눌러 상담 요청을 완료해 주세요. 메일 앱이 열리지 않으면 ysh01110@naver.com으로 연락해 주세요.';
    return;
  }
  button.disabled = true;
  button.textContent = '접수 중…';
  status.textContent = '';
  document.querySelector('#email-fallback').hidden = true;
  try {
    const response = await fetch('/api/consultation', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload), signal: AbortSignal.timeout(25000)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || '접수하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    status.textContent = result.message;
    form.reset();
    requestId = crypto.randomUUID();
  } catch (error) {
    status.classList.add('error');
    status.textContent = error.name === 'TimeoutError' ? '접수 확인이 지연되고 있습니다. 입력 내용을 유지했으니 다시 시도해 주세요.' : (error.message || '연결하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    const fallback = document.querySelector('#email-fallback');
    fallback.href = emailHref;
    fallback.hidden = false;
  } finally {
    button.disabled = false;
    button.textContent = '상담 신청하기';
  }
});

}
