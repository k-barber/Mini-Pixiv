'use strict';

//i18n
document.getElementById('menuOptions').textContent = chrome.i18n.getMessage('menuOptions');
document.getElementById('optLoadMaster').textContent = chrome.i18n.getMessage('optLoadMaster');
document.getElementById('optFitImages').textContent = chrome.i18n.getMessage('optFitImages');
document.getElementById('optUseCdn').textContent = chrome.i18n.getMessage('optUseCdn');
document.getElementById('optCdnUrl').textContent = chrome.i18n.getMessage('optCdnUrl');
document.getElementById('optCdnUrlInfo').innerHTML = DOMPurify.sanitize(chrome.i18n.getMessage('optCdnUrlInfo'));
document.getElementById('optSave').textContent = chrome.i18n.getMessage('optSave');

function saveOptions(e) {
    e.preventDefault();
    //save form
    chrome.storage.local.set({
        loadMaster: document.querySelector("#loadMaster").checked,
        fitImages: document.querySelector("#fitImages").checked,
        useCdn: document.querySelector("#useCdn").checked,
        cdnUrl: document.querySelector("#cdnUrl").value.replace(/\/$/, '')
    });
    document.querySelector("#result").textContent = chrome.i18n.getMessage('msgOptionsSaved');
    restoreOptions();
}

function restoreOptions() {
    chrome.storage.local.get({
        //set defaults
        loadMaster: false,
        fitImages: false,
        useCdn: false,
        cdnUrl: ''
    }, opts => {
        //fill form
        if(opts.loadMaster) document.querySelector('#loadMaster').checked = true;
        if(opts.fitImages) document.querySelector('#fitImages').checked = true;
        if(opts.useCdn) document.querySelector('#useCdn').checked = true;
        document.querySelector('#cdnUrl').value = opts.cdnUrl;
    });
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions);
