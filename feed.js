'use strict';

if(typeof scrollRetries === 'undefined') {
    var scrollRetries = 0;
    var linkRetries = 0;
    var rootRetries = 0;
    var urls = '';
    var root = '/';
}

function processPage() {
    if(scrollRetries == 0) {
        disableInfiniteScroll();
        setRoot();
    } else {
        changeLinks();
    }
}

function disableInfiniteScroll() {
    scrollRetries += 1;
    let button = document.querySelector('.stacc_more_autoview_disable:not(.stacc_display_none)');
    if(button) {
        scrollRetries = 1;
        button.click();
        return;
    }
    if(scrollRetries > 30) {
        scrollRetries = 1;
        return;
    }
    setTimeout(disableInfiniteScroll, 280);
}

function setRoot() {
    rootRetries += 1;
    let title = document.querySelector('#stacc_title');
    if(title) {
        rootRetries = 1;
        if(title.textContent.indexOf('Activity') != -1) root = '/en/';
        changeLinks();
        return;
    }
    if(rootRetries > 100) {
        rootRetries = 1;
        return;
    }
    setTimeout(setRoot, 180);
}

function changeLinks() {
    linkRetries += 1;
    let links = document.querySelectorAll('a.work._work:not(.fixed)');
    if(links.length) {
        linkRetries = 1;
        links.forEach(link => {
            let url = new URL(link.href);
            let illust_id = url.searchParams.get('illust_id');
            link.href = root + 'artworks/' + illust_id;
            link.className = link.className + ' fixed';
            link.target = '';
        });
        changeTitleLinks();
        return;
    }
    if(linkRetries > 100) {
        linkRetries = 1;
        return;
    }
    setTimeout(changeLinks, 180);
}

function changeTitleLinks() {
    let links = document.querySelectorAll('.stacc_ref_illust_title:not(.fixed) a');
    links.forEach(link => {
        let url = new URL(link.href);
        let illust_id = url.searchParams.get('illust_id');
        link.href = root + 'artworks/' + illust_id;
        link.parentNode.className = link.parentNode.className + ' fixed';
        link.target = '';
    });
    changeUserLinks();
}

function changeUserLinks() {
    let links = document.querySelectorAll('.stacc_ref_illust_user_name:not(.fixed) a');
    links.forEach(link => {
        let url = new URL(link.href);
        let id = url.searchParams.get('id');
        link.href = root + 'users/' + id;
        link.parentNode.className = link.parentNode.className + ' fixed';
        link.target = '';
    });
}

processPage();

