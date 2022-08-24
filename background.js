'use strict';

let app = {
    opts: {}
};

const pix_regex = /((https?:\/\/)?www\.)?pixiv\.net\/en\/artworks\/\d+/;

async function getSelectedTab() {
    var selected_tabs = await browser.tabs.query({
        highlighted: true,
        currentWindow: true
    });
    var current_tab = selected_tabs[0];
    return current_tab;
}

async function getPixivIllustTabs(){
    return await browser.tabs.query({
        // currentWindow: true,
        discarded: false,
        url: "https://www.pixiv.net/en/artworks/*"       
    })
}

var promiseResolve, promiseReject;

async function downloadAllPixivPages() {
    var pixiv_tabs = await getPixivIllustTabs();
    console.log(pixiv_tabs);
    for (let index = 0; index < pixiv_tabs.length; index++) {
        const tab = pixiv_tabs[index];
        console.log(tab);
        browser.tabs.sendMessage(
            tab.id,
            "download"
        ).then(function(){
            browser.tabs.remove(tab.id);
        }).catch(function(error){
            console.log(error);
        })
    }
    console.log("END");
}

async function downloadPixivPage() {
    var current_tab = await getSelectedTab();
    console.log(current_tab);
    browser.tabs.sendMessage(
        current_tab.id,
        "download"
    )
}

browser.browserAction.onClicked.addListener(downloadAllPixivPages)

const downloadPixivPageMenuId = "download-pixiv-page";
browser.contextMenus.create({
    id: downloadPixivPageMenuId,
    title: "Download Pixiv Illustration",
    contexts: ["tab"]
});

const downloadAllPixivPagesMenuId = "download-all-pixiv-pages";
browser.contextMenus.create({
    id: downloadAllPixivPagesMenuId,
    title: "Download all Pixiv pages",
    contexts: ["tab"]
});

// eslint-disable-next-line no-unused-vars
browser.contextMenus.onClicked.addListener((info, tab) => {
    switch (info.menuItemId) {
        case downloadPixivPageMenuId:
            downloadPixivPage();
            break;
        case downloadAllPixivPagesMenuId:
            downloadAllPixivPages();
            break;
    }
});

let layout = `<!doctype html>
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
        body { background: #cdd1d7; /* bg2 */ }
        #root { display: none; }
    </style>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/notyf@3/notyf.min.css">
</head>
<body>
    <script src="https://cdn.jsdelivr.net/npm/notyf@3/notyf.min.js"></script>
    <header>
        <a href="#" id="menuToggle">Menu</a>
        <nav>
            <ul id="menu">
                <li><a href="/">Pixiv</a></li>
                <li><a href="/manage/illusts">${browser.i18n.getMessage('menuManage')}</a></li>
                <li><a href="/messages.php">${browser.i18n.getMessage('menuMessages')}</a></li>
                <li><a href="/bookmark.php">${browser.i18n.getMessage('menuBookmarks')}</a></li>
                <li><a href="/stacc/?mode=unify">${browser.i18n.getMessage('menuFeed')}</a></li>
                <li><a href="/discovery">${browser.i18n.getMessage('menuDiscovery')}</a></li>
                <li class="spacer"><a href="#" id="openOptions">${browser.i18n.getMessage('menuOptions')}</a></li>
                <li><a href="/setting_user.php">${browser.i18n.getMessage('menuAccount')}</a></li>
                <li><a href="/logout.php">${browser.i18n.getMessage('menuLogout')}</a></li>
            </ul>
        </nav>
    </header>
    <main id="minip"></main>
    <footer></footer>
</body>
</html>`;

let cacheDuration = 1800000; //30 minutes
let lastCacheClearing = 0;
let nextImgReload = 0;

//indexed
let tempHead = {};
let pageData = {
    members: {},
    illusts: {}
};

//storage
function getUserOpts(changes, area) {
    browser.storage.local.get(null, opts => {
        app.opts = opts;
    });
}
getUserOpts(null, null);
browser.storage.onChanged.addListener(getUserOpts);

function parseHead(tempHead) {
    //get token
    let token = null;
    let tt = tempHead.indexOf('token":"');
    if (tt != -1) {
        let matches = tempHead.match(/token":"([a-z0-9]+)/);
        if (matches[1]) token = matches[1];
    }
    //get preload data
    let end = tempHead.indexOf("<\/head>");
    if (end == -1) return {};
    let start = tempHead.indexOf('id="meta-preload-data" content=');
    end = tempHead.search(/}}}.>/);
    tempHead = tempHead.slice(start + 32, end + 3);
    if (!tempHead) return false;
    let res = JSON.parse(tempHead);
    res.token = token;
    return res;
}

function clearOldMemberCache() {
    let now = new Date();
    let diff = Math.floor((now - lastCacheClearing));
    if (diff > cacheDuration) {
        pageData.members = {};
        lastCacheClearing = new Date();
    }
}

function getUserId(url) {
    let userId = parseInt(new URLSearchParams(url.split('?')[1]).get('id'));
    if (isNaN(userId)) {
        url = url.replace('/bookmarks/artworks', '');
        userId = parseInt(url.split('/').pop());
    }
    return userId;
}

function getMemberFromCache(details) {
    let userId = getUserId(details.url);
    if (!(userId in pageData.members)) return false;
    //delete expired cache
    let now = new Date();
    let diff = Math.floor((now - pageData.members[userId].date));
    if (diff > cacheDuration) {
        delete pageData.members[userId];
        return false;
    }
    let encoder = new TextEncoder();
    let filter = browser.webRequest.filterResponseData(details.requestId);
    filter.onstart = event => {
        filter.write(encoder.encode(layout));
        filter.close();
        addContentScripts(details);
    }
    return true;
}

function getMemberFromRequest(details) {
    let userId = getUserId(details.url);
    let tabId = details.tabId;
    let decoder = new TextDecoder("utf-8");
    let encoder = new TextEncoder();
    let filter = browser.webRequest.filterResponseData(details.requestId);
    filter.ondata = event => {
        let chunk = decoder.decode(event.data, {
            stream: true
        });
        tempHead[tabId] += chunk;
        let obj = parseHead(tempHead[tabId]);
        if (obj === false) return;
        pageData.members[userId] = obj;
    };
    filter.onstop = event => {
        delete tempHead[tabId];
        filter.write(encoder.encode(layout));
        filter.close();
        addContentScripts(details);
    };
}

function getIllustFromRequest(details) {
    let tabId = details.tabId;
    let decoder = new TextDecoder("utf-8");
    let encoder = new TextEncoder();
    let filter = browser.webRequest.filterResponseData(details.requestId);
    filter.ondata = event => {
        let chunk = decoder.decode(event.data, {
            stream: true
        });
        tempHead[tabId] += chunk;
        let obj = parseHead(tempHead[tabId]);
        if (obj === false) return;
        pageData.illusts[tabId] = obj;
    };
    filter.onstop = event => {
        delete tempHead[tabId];
        filter.write(encoder.encode(layout));
        filter.close();
        addContentScripts(details);
    };
}

function getPageType(url) {
    if (url.indexOf("/member_illust.php?mode=medium") != -1) return 'illust';
    if (/\/artworks\/\d/.test(url)) return 'illust';
    if (url.indexOf("/member_illust.php?id=") != -1) return 'member';
    if (url.indexOf("/member.php") != -1) return 'member';
    if (url.indexOf("/users/") != -1) return 'member';
    if (url.indexOf("/bookmarks/") != -1) return 'bookmarks';
    if (url.indexOf("/bookmark.php?id=") != -1 &&
        url.indexOf("&rest=show") != -1) return 'bookmarks';
    //if(url.indexOf("/ajax") != -1) return 'ajax';
    return '';
}

function addContentScripts(details) {
    //supported pages
    let pageType = getPageType(details.url);
    //illust
    browser.tabs.insertCSS(details.tabId, {
        file: '/main.css',
        runAt: 'document_end'
    });

    browser.tabs.insertCSS(details.tabId, {
        file: '/notyf.min.css',
        runAt: 'document_end'
    });

    browser.tabs.executeScript(details.tabId, {
        file: '/purify.min.js',
        runAt: 'document_start'
    });

    browser.tabs.executeScript(details.tabId, {
        file: '/notyf.min.js',
        runAt: 'document_start'
    });

    if (pageType == 'illust') {
        browser.tabs.executeScript(details.tabId, {
            file: '/FileSaver.min.js',
            runAt: 'document_end'
        });
        browser.tabs.executeScript(details.tabId, {
            file: '/jszip.min.js',
            runAt: 'document_end'
        });
        browser.tabs.executeScript(details.tabId, {
            file: '/jszip-utils.min.js',
            runAt: 'document_end'
        });
    }
}

browser.webRequest.onBeforeSendHeaders.addListener(
    onBeforeSendHeaders, {
        urls: ["https://www.pixiv.net/*",
            "https://s.pximg.net/*"
        ]
    },
    ["blocking", "requestHeaders"]
);

function onBeforeSendHeaders(details) {
    //supported pages
    let pageType = getPageType(details.url);
    if (!pageType) return;
    //illust
    if (pageType == 'illust') {
        getIllustFromRequest(details);
    }
    //member
    if (pageType == 'member' || pageType == 'bookmarks') {
        //get data
        let gotCache = getMemberFromCache(details);
        if (!gotCache) getMemberFromRequest(details);
    }
    return {};
}

browser.webRequest.onCompleted.addListener(
    onCompleted, {
        urls: ["https://s.pximg.net/www/js/build/runtime*",
            "https://www.pixiv.net/stacc/my/home/all/activity/*"
        ]
    }
)

function onCompleted(details) {
    // feed
    if (details.type == 'main_frame') return;
    if ((details.originUrl.indexOf('https://www.pixiv.net/stacc?mode=unify') == -1) &&
        (details.originUrl.indexOf('https://www.pixiv.net/stacc/my/home/all/activity/') == -1)) return;
    if (details.url.indexOf('/activity/.json') != -1) return;
    browser.tabs.executeScript(details.tabId, {
        file: '/feed.js',
        runAt: 'document_end'
    });
}

//messages
browser.runtime.onMessage.addListener(getMessage);

function getMessage(message, sender, sendResponse) {
    if (message.from == 'getAppData') {
        sendResponse(app);
    }
    if (message.from == 'openOptions') {
        browser.runtime.openOptionsPage();
    }
    if (message.from == 'illust') {
        sendResponse(pageData.illusts[sender.tab.id]);
        delete pageData.illusts[sender.tab.id];
    }
    if (message.from == 'ugoira') {
        browser.tabs.executeScript(sender.tab.id, {
            file: '/zip.js',
            runAt: 'document_end'
        });
        browser.tabs.executeScript(sender.tab.id, {
            file: '/deflate.js',
            runAt: 'document_end'
        });
    }
    if (message.from == 'imgError') {
        let current = new Date().getTime();
        nextImgReload = Math.max(nextImgReload, current) + 8;
        let seconds = nextImgReload - current;
        sendResponse({
            timeout: seconds
        });
    }
    if (message.from == 'follow') {
        if (pageData.members[message.userId] != undefined &&
            pageData.members[message.userId].user != undefined) {
            pageData.members[message.userId].user.isFollowed = true;
        }
    }
    if (message.from == 'member') {
        sendResponse(pageData.members[message.userId]);
    }
    if (message.from == 'saveMember') {
        clearOldMemberCache();
        let userId = parseInt(message.data.user.userId);
        pageData.members[userId] = message.data;
    }
}