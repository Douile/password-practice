'use strict';

if (window.location.protocol !== 'https:') window.location.protocol = 'https:';

const STORE = '_pstore';

function getStore() {
  let store;
  try {
    store = JSON.parse(localStorage.getItem(STORE));
  } catch(e) {
    store = null;
  }
  if (store === null) store = [];
  return store;
}
function setStore(data) {
  let store = JSON.stringify(data);
  localStorage.setItem(STORE, store);
}

function limitPrototype(object, keys) {
  for (let key of keys) {
    Object.defineProperty(object, key, Object.getOwnPropertyDescriptor(object.__proto__, key));
  }
  Object.setPrototypeOf(object, null);
}

function CryptoHasher(ALGO, getRandomValues, digest) {
  return function (raw, salt) {
    return new Promise((resolve,reject) => {
      if (!salt) {
        let saltBytes = new Uint8Array((getRandomValues(new Uint8Array(1))[0] % 65516) + 20);
        getRandomValues(saltBytes);
        salt = btoa(saltBytes);
      }
      let content = `~#${salt}:${raw}@`;
      digest(ALGO, new TextEncoder().encode(content)).then((hashBytes) => {
        let hash = Array.from(new Uint8Array(hashBytes)).map(v => v.toString(16)).join('');
        resolve({ salt: salt, hash: hash});
      }).catch(reject);
    })
  }.bind(this);
}

const hashPassword = CryptoHasher('SHA-512', crypto.getRandomValues.bind(crypto), crypto.subtle.digest.bind(crypto.subtle));
limitPrototype(hashPassword, []);


function Event(debug) {
  const obj = [], DEBUG = debug ? true : false;
  Object.defineProperties(obj, {
    'addListener': {
      value: function(eventNames, condition, handler) {
        if (typeof eventNames === 'string') eventNames = [eventNames];
        for (var eventName of eventNames) {
          if (this._registered.has(eventName)) continue;
          this._registered.set(eventName, true);
          window.addEventListener(eventName, (e) => {
            for (let eventHandler of obj) {
              if (DEBUG) console.log(eventName, e, eventHandler);
              if (eventHandler.e.includes(eventName) && eventHandler.c(e)) {
                try {
                  eventHandler.h(e);
                } catch(e) {
                  if (DEBUG) console.warn(e);
                }
              }
            }
          })
        }

        return this.push({ e: eventNames, c: condition, h: handler });
      }
    },
    '_registered': {
      value: new Map()
    }
  });
  limitPrototype(obj, ['push', 'length', 'values', Symbol.iterator]);
  limitPrototype(obj._registered, ['has', 'set', 'size', 'values', Symbol.iterator]);
  return obj;
}

const Events = Event();

function cloneTemplate(id) {
  let template = document.querySelector(`template#${id}`);
  if (template === null) return;
  let content = document.importNode(template.content, true);
  return content;
}

function PasswordDetails(password) {
  let root = cloneTemplate('template-password-details');
  root.querySelector('.password-name').innerText = password.name;
  root.querySelector('.password-attempts').innerText = `${password.attempts.success}/${password.attempts.total}`;
  root.querySelectorAll('input').forEach((e) => e.setAttribute('data-id', password.id));
  return root;
}

function Notification(content, type) {
  let root = cloneTemplate('template-notification');
  let element = root.querySelector('.notification');
  element.innerText = content;
  if (type) element.setAttribute('type',type);
  return document.importNode(element, true);
}

async function savePassword(password, name) {
  password = await hashPassword(password);
  password.name = name;
  password.id = btoa(`${new Date().getTime()}${password.hash.substr(0,6)}`);
  password.attempts = {total: 0, success: 0};

  let store = getStore();
  store.push(password);
  try {
    setStore(store);
  } catch(e) {
    console.error(e);
  }
  notify(`Added ${name}`);
  await renderPasswords();
}

async function renderPasswords() {
  let store = getStore();
  let container = document.querySelector('.password-container');
  container.querySelectorAll('div.password').forEach((e) => e.remove());
  for (let item of store) {
    let element = PasswordDetails(item);
    container.appendChild(element);
  }
}

function notify(content, type) {
  let notification = Notification(content, type), container = document.querySelector('.notifications');
  container.appendChild(notification);
  let style = getComputedStyle(notification), time;
  if (style) {
    let r = /[^0-9]/g;
    try {
      time = (parseInt(style['animation-duration'].replace(r,''))+parseInt(style['animation-delay'].replace(r,''))) * 1000;
    } catch(e) {};
  }
  if (!time) time = 10000;
  setTimeout(() => {if (container.contains(notification)) container.removeChild(notification)},time);
}

Events.addListener('keydown', (e) => e.keyCode === 13 && e.target.tagName === 'INPUT' && ['new-password', 'new-password-name'].includes(e.target.name), async function(e) {
  let DOMName = document.querySelector('input[name=new-password-name]'), DOMPassword = document.querySelector('input[name=new-password]');
  if (!DOMName || !DOMPassword) throw new Error('Could not locate password fields');
  if (DOMPassword.value.trim().length === 0 || DOMName.value.trim().length === 0) return;
  try {
    await savePassword(DOMPassword.value, DOMName.value);
  } catch(err) {
    console.error(err);
  } finally {
    DOMName.value = '';
    DOMPassword.value = '';
  }
})

Events.addListener('keydown', (e) => e.keyCode === 13 && e.target.tagName === 'INPUT' && e.target.name === 'attempt-password', async function(e) {
  let store = getStore(), id = e.target.getAttribute('data-id');
  let password = store.find(v => v.id === id);
  if (password) {
    let attempt = await hashPassword(e.target.value, password.salt);
    e.target.value = '';
    let success = attempt.hash === password.hash;
    password.attempts.total += 1;
    if (success) password.attempts.success += 1;

    store = store.map(v => v.id === password.id ? password : v);
    setStore(store);
    renderPasswords();
    document.querySelector(`input[name="attempt-password"][data-id="${password.id}"]`).focus();
    if (success) {
      notify('Correct!', 'success');
    } else {
      notify('Incorrect', 'error');
    }
  }
})

Events.addListener('click', (e) => e.target.tagName === 'HTML', () => {
  document.body.appendChild(generateTemplate('input',{name:'test'}));
})

Events.addListener('click', (e) => e.target.tagName === 'INPUT' && e.target.type === 'submit' && e.target.name === 'delete-password', (e) => {
  let store = getStore(), id = e.target.getAttribute('data-id'), name;
  store = store.filter(v => {
    if (v.id !== id) return true;
    name = v.name;
    return false;
  });
  setStore(store);
  notify(`Removed ${name}`)
  renderPasswords();
})

Events.addListener('click', (e) => e.target.classList.contains('notification'), (e) => {
  e.target.remove();
})

window.addEventListener('load', () => {
  renderPasswords();
})
