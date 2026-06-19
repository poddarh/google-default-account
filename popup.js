const inputs = document.querySelectorAll('input[type=number][data-service]');
const checkboxes = document.querySelectorAll('input[type=checkbox][data-service][data-option="DeepLink"]');

const serviceKeys = Array.from(inputs).map(i => i.dataset.service);
const deepKeys = Array.from(checkboxes).map(cb => `${cb.dataset.service}DeepLink`);

const checkboxByService = new Map(
  Array.from(checkboxes).map(cb => [cb.dataset.service, cb]),
);

function refreshCheckboxState(input) {
  const cb = checkboxByService.get(input.dataset.service);
  if (!cb) return;
  const disabled = input.value === '' || input.value === '0';
  cb.disabled = disabled;
}

// Load saved values. Default DeepLink to true when not explicitly set.
chrome.storage.local.get([...serviceKeys, ...deepKeys], (cfg) => {
  inputs.forEach(input => {
    const val = cfg[input.dataset.service];
    input.value = val ?? '';
    refreshCheckboxState(input);
  });
  checkboxes.forEach(cb => {
    const key = `${cb.dataset.service}DeepLink`;
    cb.checked = cfg[key] !== false;
  });
});

// Save number inputs on change
inputs.forEach(input => {
  const save = () => {
    const val = input.value === '' ? null : input.value;
    chrome.storage.local.set({ [input.dataset.service]: val });
    refreshCheckboxState(input);
  };
  input.addEventListener('change', save);
  input.addEventListener('input', save);
});

// Save checkboxes on change
checkboxes.forEach(cb => {
  cb.addEventListener('change', () => {
    chrome.storage.local.set({ [`${cb.dataset.service}DeepLink`]: cb.checked });
  });
});
