const inputs = document.querySelectorAll('input[data-service]');
const checkboxes = document.querySelectorAll('input[data-option]');
const serviceKeys = Array.from(inputs).map(i => i.dataset.service);
const optionKeys = Array.from(checkboxes).map(c => c.dataset.option);

// Load saved values
chrome.storage.local.get([...serviceKeys, ...optionKeys], (cfg) => {
  inputs.forEach(input => {
    const val = cfg[input.dataset.service];
    input.value = val ?? '';
  });
  checkboxes.forEach(cb => {
    cb.checked = !!cfg[cb.dataset.option];
  });
});

// Save service inputs on change
inputs.forEach(input => {
  const save = () => {
    const val = input.value === '' ? null : input.value;
    chrome.storage.local.set({ [input.dataset.service]: val });
  };
  input.addEventListener('change', save);
  input.addEventListener('input', save);
});

// Save option checkboxes on change
checkboxes.forEach(cb => {
  cb.addEventListener('change', () => {
    chrome.storage.local.set({ [cb.dataset.option]: cb.checked });
  });
});
