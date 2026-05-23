const STORAGE_KEY = 'lease-mileage-tracker-v1';
const $ = (id) => document.getElementById(id);
const fmt = new Intl.NumberFormat('en-US');

const addMonths = (date, months) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + Number(months));
  return d;
};

const daysBetween = (a, b) => Math.max(0, Math.floor((b - a) / 86400000));
const clamp = (n, min, max) => Math.min(Math.max(n, min), max);

function calculate(data) {
  const start = new Date(data.startDate + 'T00:00:00');
  const end = addMonths(start, data.duration);
  const today = new Date();
  const totalDays = Math.max(1, daysBetween(start, end));
  const elapsedDays = clamp(daysBetween(start, today), 0, totalDays);
  const remainingDays = Math.max(0, totalDays - elapsedDays);
  const allowedToDate = Math.round((data.allowance / totalDays) * elapsedDays);
  const variance = allowedToDate - data.currentMileage;
  const remainingMiles = data.allowance - data.currentMileage;
  const dailyPace = remainingDays > 0 ? remainingMiles / remainingDays : 0;
  const projectedEndMileage = elapsedDays > 0 ? Math.round((data.currentMileage / elapsedDays) * totalDays) : data.currentMileage;
  return { start, end, totalDays, elapsedDays, remainingDays, allowedToDate, variance, remainingMiles, dailyPace, projectedEndMileage };
}

function classify(calc) {
  if (calc.variance < 0) return { label: 'Over', cls: 'bad', title: 'You are over your lease pace', msg: `You are ${fmt.format(Math.abs(calc.variance))} miles ahead of your allowed pace.` };
  if (calc.variance <= 250) return { label: 'Tight', cls: 'warn', title: 'You are within allowance, but close', msg: `You have a ${fmt.format(calc.variance)} mile cushion versus your allowed pace.` };
  return { label: 'Under', cls: 'good', title: 'You are under your lease pace', msg: `You have a ${fmt.format(calc.variance)} mile cushion versus your allowed pace.` };
}

function save(data) { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
function load() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { return null; } }

function render() {
  const data = load();
  const hasData = !!data;
  $('setupCard').classList.toggle('hidden', hasData);
  $('dashboard').classList.toggle('hidden', !hasData);
  $('resetBtn').classList.toggle('hidden', !hasData);
  if (!hasData) return;

  const calc = calculate(data);
  const status = classify(calc);
  $('vehicleLabel').textContent = `${data.make} ${data.model}`;
  $('statusTitle').textContent = status.title;
  $('statusMessage').textContent = status.msg;
  $('statusBadge').textContent = status.label;
  $('statusBadge').className = `badge ${status.cls}`;
  $('mCurrent').textContent = `${fmt.format(data.currentMileage)} mi`;
  $('mAllowedToDate').textContent = `${fmt.format(calc.allowedToDate)} mi`;
  $('mVariance').textContent = `${calc.variance >= 0 ? '+' : '-'}${fmt.format(Math.abs(calc.variance))} mi`;
  $('mDailyPace').textContent = `${fmt.format(Math.max(0, Math.floor(calc.dailyPace)))} mi/day`;
  $('updateMileage').value = data.currentMileage;
  $('details').innerHTML = `
    <div>Lease start<strong>${calc.start.toLocaleDateString()}</strong></div>
    <div>Lease end<strong>${calc.end.toLocaleDateString()}</strong></div>
    <div>Total allowance<strong>${fmt.format(data.allowance)} miles</strong></div>
    <div>Remaining allowance<strong>${fmt.format(calc.remainingMiles)} miles</strong></div>
    <div>Days elapsed<strong>${fmt.format(calc.elapsedDays)} of ${fmt.format(calc.totalDays)}</strong></div>
    <div>Projected end mileage at current pace<strong>${fmt.format(calc.projectedEndMileage)} miles</strong></div>
  `;
}

$('leaseForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  data.duration = Number(data.duration);
  data.allowance = Number(data.allowance);
  data.currentMileage = Number(data.currentMileage);
  save(data);
  render();
});

$('updateForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const data = load();
  data.currentMileage = Number($('updateMileage').value);
  save(data);
  render();
});

$('resetBtn').addEventListener('click', () => {
  if (confirm('Clear this lease setup?')) {
    localStorage.removeItem(STORAGE_KEY);
    render();
  }
});

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
render();
