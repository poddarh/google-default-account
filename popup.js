const inputs = document.querySelectorAll('input[data-service]');
const keys = Array.from(inputs).map(i => i.dataset.service);

// Load saved values
chrome.storage.local.get(keys, (cfg) => {
  inputs.forEach(input => {
    const val = cfg[input.dataset.service];
    input.value = val ?? '';
  });
});

// Save on change
inputs.forEach(input => {
  const save = () => {
    const val = input.value === '' ? null : input.value;
    chrome.storage.local.set({ [input.dataset.service]: val });
  };
  input.addEventListener('change', save);
  input.addEventListener('input', save);
});
