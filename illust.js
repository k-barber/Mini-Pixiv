'use strict';

const loaded_chunks = new Event('loaded_chunks');
const loaded_recs = new Event('loaded_recs');

let app = {};
let device = 'desktop';

let anim = null;
let pageData = {
    token: null,
    user: {},
    illust: {},
    illustNewerUrl: null,
    illustOlderUrl: null,
    ugoiraData: {},
    ugoira: [],
    recommend: {}
};
let lang = '';
if (document.location.href.indexOf("/en/") != -1) lang = '/en';


function decode(html) {
    var txt = document.createElement("textarea");
    var inner = DOMPurify.sanitize(html).replace(/href="\/jump\.php\?(.*?)"/, function (match, p1) {
        return `href="${decodeURIComponent(p1)}"`
    })
    txt.innerHTML = inner;
    return txt.value;
}

function chunkArray(array, chunkSize) {
    console.log("2.0")
    var R = [];
    console.log("2.1")
    for (var i = 0; i < array.length; i += chunkSize) {
        console.log("2.2")
        R.push(array.slice(i, i + chunkSize));
    }
    console.log("2.3")
    console.log(R)
    return R;
}

function processPage() {
    return new Promise(resolve => getAppData(resolve))
        .then(() => getIllustData())
        .then(() => getNewerOlder())
        .then(() => getUserData())
        .then(() => {
            addLayout();
            addAvatar();
            addGallery();
            addIllusts();
            addUserIllusts();
            addInfo();
            getRecommend();
        })
        .then(() => getUgoiraData())
        .then(() => downloadUgoira())
        .then(() => addUgoira());
}

function getAppData(resolve) {
    browser.runtime.sendMessage({
        from: "getAppData"
    }, function (data) {
        app = data;
        resolve();
    });
}

function getIllustData() {
    return new Promise(resolve => {
        browser.runtime.sendMessage({
            from: "illust"
        }, function (data) {
            let parsedHead = data;
            if (parsedHead.token) pageData.token = parsedHead.token;
            //bgrequest
            if (parsedHead.illust && parsedHead.user) {
                for (let k in parsedHead.illust) pageData.illust = parsedHead.illust[k];
                for (let k in parsedHead.user) pageData.user = parsedHead.user[k];
                resolve();
                return;
            }
            //fetch
            //means pixiv changed their data structure or running on mobile
            device = 'mobile';
            let id = parseInt(document.location.href.split('/').pop());
            return content.fetch('/ajax/illust/' + id, {
                    credentials: 'same-origin'
                })
                .then(r => r.json())
                .then(data => {
                    pageData.illust = data.body;
                    resolve();
                });
        });
    });
}

function getNewerOlder() {
    return new Promise(resolve => {
        let keys = Object.keys(pageData.illust.userIllusts).sort(function (a, b) {
            return a - b;
        });

        let loc = keys.indexOf(pageData.illust.id);

        let id = 0;
        if (loc < keys.length - 1) {
            id = pageData.illust.userIllusts[keys[loc + 1]].id;
            pageData.illustNewerUrl = "https://www.pixiv.net/en/artworks/" + parseInt(id);
            document.addEventListener('keydown', function (e) {
                if (e.keyCode == 37) window.location = pageData.illustNewerUrl; // 37l,39r
            });
        }
        if (loc > 0) {
            id = pageData.illust.userIllusts[keys[loc - 1]].id;
            pageData.illustOlderUrl = "https://www.pixiv.net/en/artworks/" + parseInt(id);
            document.addEventListener('keydown', function (e) {
                if (e.keyCode == 39) window.location = pageData.illustOlderUrl; // 37l,39r
            });
        }

        resolve();
    });
}

function addUserIllusts() {
    let gall = document.createElement('div');
    gall.id = 'userGallery';
    let list = document.createElement('div');
    list.id = 'list';
    gall.appendChild(list);

    let nav = document.createElement('div');
    gall.appendChild(nav);


    let ul = document.createElement('ul');
    list.appendChild(ul);

    let left = document.createElement('i');
    left.id = "gallery-left-arrow"
    left.classList.add('fas', 'fa-chevron-circle-left');
    left.addEventListener("click", e => {
        e.preventDefault();

        var list = document.getElementById("list")
        list.scrollTo({
            left: list.scrollLeft - 750,
            behavior: 'smooth'
        });
    });
    nav.appendChild(left);

    let right = document.createElement('i');
    right.id = "gallery-right-arrow"
    right.classList.add('fas', 'fa-chevron-circle-right');
    right.addEventListener("click", e => {
        e.preventDefault();
        var list = document.getElementById("list")
        list.scrollTo({
            left: list.scrollLeft + 750,
            behavior: 'smooth'
        });
    });
    nav.appendChild(right);


    let keys = Object.keys(pageData.illust.userIllusts).sort(function (a, b) {
        return b - a;
    });
    var key_chunks = chunkArray(keys, 10);
    var illustration_chunks = Array(key_chunks.length);
    var chunks_loaded = new Promise(async resolve => {
        let promises = []

        for (let i = 0; i < key_chunks.length; i++) {
            let chunk = key_chunks[i];
            let url = new URL("https://www.pixiv.net/ajax/user/" + pageData.user.userId + "/illusts");
            chunk.forEach(key => {
                url.searchParams.append('ids[]', key);
            });

            promises.push(content.fetch(url, {
                    credentials: 'same-origin'
                })
                .then(r => r.json())
                .then(data => {
                    console.log("loaded illustration chunk: " + parseInt(i))
                    let illusts = Object.values(data.body);
                    illusts.sort(function (a, b) {
                        return b.id - a.id
                    })
                    var html = makeRecommendHtml(illusts);
                    illustration_chunks[i] = DOMPurify.sanitize(html);
                }))
        }
        Promise.allSettled(promises).then(x => {
            resolve();
        })
    })

    chunks_loaded.then(x => {
        for (let i = 0; i < illustration_chunks.length; i++) {
            console.log("inserting illustration chunk: " + parseInt(i))
            ul.innerHTML += illustration_chunks[i];
        }

        let illustId = "ill-" + parseInt(pageData.illust.illustId);
        console.log(illustId)
        var curr = document.getElementById(illustId)
        curr.classList.add("current_img")
        list.scrollLeft = curr.offsetLeft - (list.clientWidth / 2) + 102;
        window.dispatchEvent(loaded_chunks)
    })

    document.getElementById('minip').appendChild(gall);
}

function getUserData() {
    //bgrequest
    if (pageData.user && pageData.user.userId) return;
    //fetch
    //means pixiv changed their data structure or running on mobile
    let userId = parseInt(pageData.illust.userId);
    return content.fetch('/ajax/user/' + userId, {
            credentials: 'same-origin'
        })
        .then(data => {
            if (data.error) {
                document.body.innerHTML = DOMPurify.sanitize('<div id="loginError">Error: You must <a href="https://accounts.pixiv.net/login">login to Pixiv</a> to load this content.</div>');
                throw 'Error loading user data.';
            }
            pageData.user = data.body;
        });
}

function addLayout() {
    document.body.id = 'illustPage';
    if ('userName' in pageData.illust) {
        let title = document.createElement('title');
        title.textContent = DOMPurify.sanitize('pixiv - ' + pageData.illust.userName + ' - ' + pageData.illust.illustTitle);
        document.head.appendChild(title);
    }
    document.getElementById('menuToggle').addEventListener('click', e => {
        e.preventDefault();
        let className = document.getElementById('menu').className;
        document.getElementById('menu').className = (className ? '' : 'show');
    });
    document.getElementById('openOptions').addEventListener('click', e => {
        e.preventDefault();
        browser.runtime.sendMessage({
            from: "openOptions"
        });
    });
}

function addAvatar() {
    let avatar = document.createElement('div');
    avatar.id = 'avatar';
    document.getElementById('minip').appendChild(avatar);
    //follow
    let follow = '';
    if (pageData.user.isFollowed == false) {
        follow = `<button id="follow" rel="minip">${browser.i18n.getMessage('buttonFollow')}</button>`;
    } else {
        follow = `<button id="follow" rel="minip" class="inactive">${browser.i18n.getMessage('buttonFollowing')}</button>`;
    }
    //html
    let avatarImg = pageData.user.imageBig;
    if (app.opts.useCdn && app.opts.cdnUrl) avatarImg = avatarImg.replace('https://i.pximg.net', app.opts.cdnUrl);
    let html = `
        <div id="avatarPic"><a href="${lang}/users/${parseInt(pageData.user.userId)}"><img src="${avatarImg}" /></a></div>
        <div id="avatarUsername"><a href="${lang}/users/${parseInt(pageData.user.userId)}">${pageData.user.name}</a></div>
        <div id="avatarAction">${follow}</div>
    `;
    avatar.innerHTML = DOMPurify.sanitize(html);
    if (pageData.user.isFollowed == false) {
        document.getElementById('follow').addEventListener('click', followUser);
    }
}

function followUser(e) {
    e.preventDefault();
    let target = document.getElementById('follow');
    target.removeEventListener('click', followUser);
    if (pageData.token == null) return;
    let token = DOMPurify.sanitize(pageData.token);
    let userId = parseInt(pageData.user.userId);
    //desktop
    let url = '/bookmark_add.php';
    let headers = {
        'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'x-csrf-token': token
    };
    let body = `mode=add&type=user&user_id=${userId}&tag=&restrict=0&format=json`;
    //mobile
    if (device == 'mobile') {
        url = '/touch/ajax_api/ajax_api.php';
        headers = {
            'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
            'Accept': 'application/json, text/javascript, */*; q=0.01',
            'X-Requested-With': 'XMLHttpRequest'
        };
        body = `mode=add_bookmark_user&restrict=0&tt=${token}&user_id=${userId}`;
    }
    let p = content.fetch(url, {
            method: "POST",
            mode: "cors",
            cache: "no-cache",
            credentials: "same-origin",
            redirect: "follow",
            headers: headers,
            body: body
        })
        .then(r => r.json())
        .then(() => {
            target.className = 'inactive';
            target.innerHTML = DOMPurify.sanitize(browser.i18n.getMessage('buttonFollowing'));
            browser.runtime.sendMessage({
                from: "follow",
                userId: userId
            });
        });
}

function unfollowUser(e) {
    //let p = content.fetch('/rpc_group_setting.php', {
    //method: "POST",
    //mode: "cors",
    //cache: "no-cache",
    //credentials: "same-origin",
    //redirect: "follow",
    //headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
    //'Accept': 'application/json',
    //'x-csrf-token': pageData.token },
    //body: `mode=del&type=bookuser&id=${pageData.user.userId}`
    //})
}

function addGallery() {
    let gallery = document.createElement('div');
    gallery.id = 'gallery';
    if (app.opts.fitImages) gallery.className = 'fitImages';
    document.getElementById('minip').appendChild(gallery);
}

function download(e) {
    e.preventDefault()
    console.log(pageData)
    console.log("download");
    if (pageData.illust.pageCount === 1) {
        let filename = pageData.user.name + "(" + pageData.user.userId + ")_" + pageData.illust.title + "(" + pageData.illust.id + ")_0";
        let url = pageData.illust.images[0].original;
        console.log(url);
        content.fetch(url, {
            referrer: "https://www.pixiv.net/",
            headers: {
                "Host": "pixiv.net"
            }
        }).then(function (resp) {
            console.log(resp)
            resp.blob().then(function (blob) {
                console.log(blob)
                saveAs(blob, filename);
            });
        });
    } else {
        var zip = new JSZip();
        let promises = [];
        for (let index = 0; index < pageData.illust.pageCount; index++) {
            var element = pageData.illust.images[index];
            let url = element.original;
            let extension = url.substring(url.lastIndexOf("."))
            let filename = pageData.user.name + "(" + pageData.user.userId + ")_" + pageData.illust.title + "(" + pageData.illust.id + ")_" + index + extension;
            promises.push(content.fetch(url, {
                    referrer: "https://www.pixiv.net/"
                }).then(response => response.blob())
                .then(blob => {
                    return new Promise(function (resolve) {
                        console.log(blob);
                        var reader = new FileReader();
                        reader.readAsDataURL(blob);
                        reader.onloadend = function () {
                            var base64data = reader.result;
                            var trimmed = base64data.substr(base64data.indexOf(',') + 1)
                            console.log(base64data);
                            console.log(trimmed);
                            zip.file(filename, trimmed, {
                                base64: true
                            });
                            console.log(zip)
                            resolve();
                        }
                    })
                }));
        }
        Promise.allSettled(promises).then(function () {
            console.log(JSON.stringify(zip))
            zip.generateAsync({
                type: 'blob'
            }).then(function (content) {
                saveAs(content, pageData.user.name + "(" + pageData.user.userId + ")_" + pageData.illust.title + "(" + pageData.illust.id + ").zip");
            });
        })
    }
}

function addIllusts() {
    if (pageData.illust.illustType == 2) return;
    let gallery = document.getElementById('gallery');
    let images = [];
    for (let i = 0; i < pageData.illust.pageCount; i++) {
        let imgMaster = pageData.illust.urls.regular.replace('p0', 'p' + i);
        let imgOriginal = pageData.illust.urls.original.replace('p0', 'p' + i);
        if (app.opts.useCdn && app.opts.cdnUrl) {
            imgMaster = imgMaster.replace('https://i.pximg.net', app.opts.cdnUrl);
            imgOriginal = imgOriginal.replace('https://i.pximg.net', app.opts.cdnUrl);
        }
        images.push({
            master: imgMaster,
            original: imgOriginal
        });
    }
    let html = '';
    let i = 0;
    for (let item of images) {
        let src = item.master
        //let src = (app.opts.loadMaster ? item.master : item.original);
        html += `
            <div>
                <p>${++i} / ${images.length}</p>
                <a href="${item.original}"><img src="${src}" /></a>
            </div>
        `;
    }
    gallery.innerHTML = DOMPurify.sanitize(html);
    let items = gallery.getElementsByTagName('img');
    for (let image of items) {
        image.addEventListener('error', onImgError);
    }
    pageData.illust.images = images;
}

function onImgError(event) {
    browser.runtime.sendMessage({
        from: "imgError"
    }, function (data) {
        let reloadAlert = document.createElement('b');
        reloadAlert.innerHTML = DOMPurify.sanitize(browser.i18n.getMessage('imageError', data.timeout));
        event.target.parentNode.className = 'error';
        event.target.parentNode.appendChild(reloadAlert);
        setTimeout(() => {
            event.target.parentNode.className = '';
            event.target.parentNode.removeChild(event.target.parentNode.getElementsByTagName('b')[0]);
            event.target.src = event.target.src;
        }, data.timeout * 1000);
    });
}

function addInfo() {
    //svg
    let svgLike = `
        <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
        viewBox="0 0 490.1 490.1" style="enable-background:new 0 0 490.1 490.1;" xml:space="preserve">
        <g><path d="M421,162.747H320.1v-69.2c0-33.2-9.9-57.3-29.5-71.6c-30.8-22.6-72.7-9.9-74.5-9.3c-7.1,2.2-12,8.9-12,16.4v83.5
        c0,61.8-72.7,83.3-75.8,84.1c-0.2,0.1-0.4,0.1-0.5,0.2l-8.3,2.6c-9.4-8.9-22-14.3-35.8-14.3H52.2c-28.8-0.1-52.2,23.3-52.2,52.1
        v179.6c0,28.8,23.4,52.2,52.2,52.2h31.5c13.3,0,25.5-5,34.7-13.3c13.2,15.7,33,25.8,55.1,25.8h204.4c47.4,0,78.9-26,84.4-69.5
        l25.4-159.5l1.4-8.6c0.6-4,1-8.1,1-12.2C490,193.747,459,162.747,421,162.747z M101.6,416.947c0,9.9-8,17.9-17.9,17.9H52.2
        c-9.9,0-17.9-8-17.9-17.9v-179.7c0-9.9,8-17.9,17.9-17.9h31.5c9.9,0,17.9,8,17.9,17.9C101.6,237.247,101.6,416.947,101.6,416.947
        z M455.2,238.647l-26.8,168.4c0,0.2-0.1,0.4-0.1,0.6c-1.2,9.8-4.8,39.7-50.4,39.7H173.5c-20.7,0-37.6-16.9-37.6-37.6v-172.5
        c0-2.3-0.2-4.6-0.5-6.9l2.5-0.8c7.3-2.1,100.5-30.7,100.5-117.1v-69.3c9.9-1,22.9-0.3,32,6.5c10.2,7.6,15.4,22.3,15.4,43.9v86.4
        c0,9.5,7.7,17.2,17.2,17.2h118c19.2,0,34.7,15.6,34.7,34.7C455.7,234.047,455.5,236.347,455.2,238.647z"/>
        </g></svg>
    `;
    let svgBookmark = `
        <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
        viewBox="0 0 485.3 485.3" style="enable-background:new 0 0 485.3 485.3;" xml:space="preserve">
        <g><path d="M349.6,28.95c-36.3,0-70.5,14.2-96.2,39.9l-10.6,10.6L232,68.65c-25.7-25.7-59.9-39.9-96.2-39.9
        c-36.2,0-70.3,14.1-96,39.8S0,128.35,0,164.65s14.2,70.4,39.9,96.1l190.5,190.5l0.4,0.4c3.3,3.3,7.7,4.9,12,4.9
        c4.4,0,8.8-1.7,12.1-5l190.5-190.5c25.7-25.7,39.9-59.8,39.9-96.1s-14.1-70.5-39.8-96.1C419.9,43.05,385.8,28.95,349.6,28.95z
        M421.2,236.75l-178.3,178.4L64.2,236.45c-19.2-19.2-29.8-44.7-29.9-71.9c0-27.1,10.5-52.6,29.7-71.8
        c19.2-19.1,44.7-29.7,71.7-29.7c27.2,0,52.7,10.6,72,29.9l22.9,22.9c6.4,6.4,17.8,6.4,24.3,0l22.8-22.8
        c19.2-19.2,44.8-29.8,71.9-29.8s52.6,10.6,71.8,29.8c19.2,19.2,29.8,44.7,29.7,71.9C451.1,192.05,440.5,217.55,421.2,236.75z"/></g>
        </svg>
    `;
    let svgDate = `
        <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
        viewBox="0 0 490.125 490.125" style="enable-background:new 0 0 490.125 490.125;" xml:space="preserve">
        <g><path d="M300.625,5.025c-6.7-6.7-17.6-6.7-24.3,0l-72.6,72.6c-6.7,6.7-6.7,17.6,0,24.3l16.3,16.3l-40.3,40.3l-63.5-7
        c-3-0.3-6-0.5-8.9-0.5c-21.7,0-42.2,8.5-57.5,23.8l-20.8,20.8c-6.7,6.7-6.7,17.6,0,24.3l108.5,108.5l-132.4,132.4
        c-6.7,6.7-6.7,17.6,0,24.3c3.3,3.3,7.7,5,12.1,5s8.8-1.7,12.1-5l132.5-132.5l108.5,108.5c3.3,3.3,7.7,5,12.1,5s8.8-1.7,12.1-5
        l20.8-20.8c17.6-17.6,26.1-41.8,23.3-66.4l-7-63.5l40.3-40.3l16.2,16.2c6.7,6.7,17.6,6.7,24.3,0l72.6-72.6c3.2-3.2,5-7.6,5-12.1
        s-1.8-8.9-5-12.1L300.625,5.025z M400.425,250.025l-16.2-16.3c-6.4-6.4-17.8-6.4-24.3,0l-58.2,58.3c-3.7,3.7-5.5,8.8-4.9,14
        l7.9,71.6c1.6,14.3-3.3,28.3-13.5,38.4l-8.7,8.7l-217.1-217.1l8.7-8.6c10.1-10.1,24.2-15,38.4-13.5l71.7,7.9
        c5.2,0.6,10.3-1.2,14-4.9l58.2-58.2c6.7-6.7,6.7-17.6,0-24.3l-16.3-16.3l48.3-48.3l160.3,160.3L400.425,250.025z"/></g></svg>
    `;
    let svgView = `
        <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
        viewBox="0 0 489.935 489.935" style="enable-background:new 0 0 489.935 489.935;" xml:space="preserve">
        <g><path d="M486.617,255.067c4.6-6.3,4.4-14.9-0.5-21c-74.1-91.1-154.1-137.3-237.9-137.3c-142.1,0-240.8,132.4-244.9,138
        c-4.6,6.3-4.4,14.9,0.5,21c74,91.2,154,137.4,237.8,137.4C383.717,393.167,482.417,260.767,486.617,255.067z M241.617,358.867
        c-69.8,0-137.8-38.4-202.4-114c25.3-29.9,105.7-113.8,209-113.8c69.8,0,137.8,38.4,202.4,114
        C425.317,274.967,344.917,358.867,241.617,358.867z"/>
        <path d="M244.917,157.867c-48,0-87.1,39.1-87.1,87.1s39.1,87.1,87.1,87.1s87.1-39.1,87.1-87.1S292.917,157.867,244.917,157.867z
        M244.917,297.767c-29.1,0-52.8-23.7-52.8-52.8s23.7-52.8,52.8-52.8s52.8,23.7,52.8,52.8S274.017,297.767,244.917,297.767z"/></g></svg>
    `;
    let svgComment = `
        <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
        viewBox="0 0 489.7 489.7" style="enable-background:new 0 0 489.7 489.7;" xml:space="preserve">
        <g><path d="M18.683,436.7c-10.2,5-15.9,16-14.2,27.2c1.7,11.3,10.4,20,21.7,21.8c6.3,1,13,1.5,19.9,1.5c17.8,0,51.2-3.5,84.7-25.7
        c35,18.5,74.3,28.2,114.1,28.2c65.4,0,126.9-25.5,173.1-71.7s71.7-107.7,71.7-173.1s-25.5-126.9-71.7-173.1
        c-46.3-46.4-107.7-71.8-173.1-71.8s-126.9,25.4-173.2,71.7c-88.7,88.7-95.6,230-17.7,326.6C44.283,417,32.383,429.9,18.683,436.7
        z M95.983,95.9c39.8-39.8,92.6-61.7,148.9-61.7s109.1,21.9,148.9,61.7s61.7,92.6,61.7,148.9c0,56.2-21.9,109.1-61.7,148.9
        s-92.6,61.7-148.9,61.7c-37.6,0-74.4-10-106.6-28.9c-2.7-1.6-5.7-2.4-8.7-2.4c-3.7,0-7.4,1.2-10.5,3.6
        c-23.1,17.9-47,23.4-63.3,24.8c13.6-12.2,25-29,34.2-50c2.7-6.1,1.6-13.2-2.9-18.2C13.483,301.2,17.383,174.5,95.983,95.9z"/>
        <path d="M143.483,261.9h202.8c9.5,0,17.2-7.7,17.2-17.1s-7.7-17.2-17.2-17.2h-202.8c-9.5,0-17.2,7.7-17.2,17.2
        S133.983,261.9,143.483,261.9z"/>
        <path d="M143.483,192.5h202.8c9.5,0,17.2-7.7,17.2-17.2s-7.7-17.2-17.2-17.2h-202.8c-9.5,0-17.2,7.7-17.2,17.2
        S133.983,192.5,143.483,192.5z"/>
        <path d="M143.483,331.4h202.8c9.5,0,17.2-7.7,17.2-17.1c0-9.5-7.7-17.2-17.2-17.2h-202.8c-9.5,0-17.2,7.7-17.2,17.2
        C126.283,323.7,133.983,331.4,143.483,331.4z"/></g></svg>
    `;
    let info = document.createElement('div');
    info.id = 'illustInfo';
    document.getElementById('minip').appendChild(info);
    //title
    let html = `<div id="mini-title"><b>${pageData.illust.title}</b>`;
    //like
    if (pageData.illust.likeData == false) {
        html += `<button id="like" rel="minip"><i class="far fa-thumbs-up"></i></button>`;
    } else {
        html += `<button id="like" rel="minip" class="inactive"><i class="fas fa-thumbs-up"></i></button>`;
    }
    //bookmark
    if (pageData.illust.bookmarkData == null) {
        html += `<button id="bookmark" rel="minip"><i class="far fa-heart"></i></button>`;
    } else {
        html += `<button id="bookmark" rel="minip" class="inactive"><i class="fas fa-heart"></i></button>`;
    }
    html += `<button id="download" rel="minip"><i class="fas fa-download"></i></button>`;
    html += `</div>`;
    //desc
    if (pageData.illust.description.length != 0) {
        html += `<div id="description">${decode(pageData.illust.description)}</div>`;
    }
    //tags
    html += `<div id="tags">`;
    for (let tag of pageData.illust.tags.tags) {
        html += `#<a href="/search.php?s_mode=s_tag_full&word=${tag.tag}">${tag.tag}`;
        if (tag.translation != undefined && tag.translation.en != undefined) {
            html += ` ${tag.translation.en}`;
        }
        html += `</a> `;
    }
    html += `</div>`;
    //stats
    let utcdate = new Date(pageData.illust.uploadDate); // eg 2017-10-22T04:47:25+00:00
    let localdate = utcdate.getFullYear() + '-' +
        ('0' + (utcdate.getMonth() + 1)).slice(-2) + '-' +
        ('0' + utcdate.getDate()).slice(-2) + ' ' +
        ('0' + utcdate.getHours()).slice(-2) + ':' +
        ('0' + utcdate.getMinutes()).slice(-2) + ' ' +
        utcdate.toString().replace(/.* \w{3}(.\d{4}) .*/, '$1');
    html += `
        <div id="stats">
            <span id="uploadDate">${svgDate}${localdate}</span>
            <span id="viewCount">${svgView}${parseInt(pageData.illust.viewCount)}</span>
            <span id="commentCount">${svgComment}${parseInt(pageData.illust.commentCount)}</span>
            <span id="likeCount">${svgLike}<u>${parseInt(pageData.illust.likeCount)}</u></span>
            <span id="bookmarkCount">${svgBookmark}<u>${parseInt(pageData.illust.bookmarkCount)}</u></span>
        </div>
    `;
    info.innerHTML = DOMPurify.sanitize(html);
    if (pageData.illust.likeData == false) {
        document.getElementById('like').addEventListener('click', like);
    }
    if (pageData.illust.bookmarkData == null) {
        document.getElementById('bookmark').addEventListener('click', bookmark);
    }
    document.addEventListener('keypress', keypress);
    document.getElementById("download").addEventListener('click', download);
}

function like(e) {
    e.preventDefault();
    let target = document.getElementById('like');
    target.removeEventListener('click', like);
    if (pageData.token == null) return;
    let token = DOMPurify.sanitize(pageData.token);
    let illustId = parseInt(pageData.illust.illustId);
    let p = content.fetch('/ajax/illusts/like', {
            method: "POST",
            mode: "cors",
            cache: "no-cache",
            credentials: "same-origin",
            redirect: "follow",
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Accept': 'application/json',
                'x-csrf-token': token
            },
            body: JSON.stringify({
                illust_id: illustId
            })
        })
        .then(r => r.json())
        .then(() => {
            target.className = 'inactive';
            target.innerHTML = `<i class="fas fa-thumbs-up"></i>`
            let likeCount = document.getElementById('likeCount').getElementsByTagName('u')[0];
            likeCount.innerHTML = DOMPurify.sanitize(parseInt(likeCount.innerHTML) + 1);
        });
}

function keypress(e) {
    if (pageData.illust.bookmarkData == null && e.code === "KeyB") {
        bookmark(e);
    }
    if (e.code === "KeyD") {
        download(e);
    }
}

function bookmark(e) {
    e.preventDefault();
    let target = document.getElementById('bookmark');
    target.removeEventListener('click', bookmark);
    if (pageData.token == null) return;
    let token = DOMPurify.sanitize(pageData.token);
    let illustId = parseInt(pageData.illust.id);
    let p = content.fetch('/ajax/illusts/bookmarks/add', {
            method: "POST",
            mode: "cors",
            cache: "no-cache",
            credentials: "same-origin",
            redirect: "follow",
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Accept': 'application/json',
                'x-csrf-token': token
            },
            body: '{"illust_id":"' + illustId + '","restrict":0,"comment":"","tags":[]}'
        })
        //.then(r => r.json())
        .then(() => {
            target.className = 'inactive';
            target.innerHTML = `<i class="fas fa-heart"></i>`;
            let bookmarkCount = document.getElementById('bookmarkCount').getElementsByTagName('u')[0];
            bookmarkCount.innerHTML = DOMPurify.sanitize(parseInt(bookmarkCount.innerHTML) + 1);
        });
}

function getUgoiraData() {
    if (pageData.illust.illustType != 2) return;
    let gallery = document.getElementById('gallery');
    let html = `
        <div>
            <p id="loading">${browser.i18n.getMessage('loadingData')}</p>
            <a id="ugoira" href="#"><img src="${pageData.illust.urls.regular}" /></a>
        </div>
    `;
    gallery.innerHTML = DOMPurify.sanitize(html);
    //parsedHead
    if (pageData.ugoiraData.src != undefined) return;
    //fetch
    let illustId = parseInt(pageData.illust.id);
    return content.fetch('/ajax/illust/' + illustId + '/ugoira_meta', {
            credentials: 'same-origin'
        })
        .then(r => r.json())
        .then(r => r.body)
        .then(data => {
            pageData.ugoiraData = data;
        });
}

function downloadUgoira() {
    if (pageData.illust.illustType != 2) return;
    let loading = document.getElementById('loading');
    return new Promise(resolve => {
        browser.runtime.sendMessage({
            from: "ugoira"
        }, function () {
            let ugoiraSrc = pageData.ugoiraData.src;
            if (app.opts.useCdn && app.opts.cdnUrl) ugoiraSrc = ugoiraSrc.replace('https://i.pximg.net', app.opts.cdnUrl);
            ugoiraSrc = DOMPurify.sanitize(ugoiraSrc);
            content.fetch(ugoiraSrc, {
                    credentials: 'same-origin'
                })
                .then(r => {
                    pageData.ugoiraData.size = (parseInt(r.headers.get('Content-Length')) / 1024 / 1024).toFixed(2);
                    loading.innerHTML = DOMPurify.sanitize(browser.i18n.getMessage('loadingFrames', [pageData.ugoiraData.frames.length, pageData.ugoiraData.size]));
                    return r.blob();
                })
                .then(data => new Promise(r => extractUgoiraZip(r, data)))
                .then(() => resolve());
        });
    });
}

function extractUgoiraZip(resolve, data) {
    zip.useWebWorkers = false;
    zip.createReader(new zip.BlobReader(data), function (reader) {
        reader.getEntries(function (entries) {
            for (let i = 0; i < entries.length; i++) {
                entries[i].getData(new zip.BlobWriter(), function (blob) {
                    pageData.ugoira.push({
                        src: URL.createObjectURL(blob),
                        delay: pageData.ugoiraData.frames[i].delay
                    });
                    if (i == (entries.length - 1)) resolve();
                }, function (current, total) {});
            }
        });
    }, function (err) {});
}

function addUgoira() {
    if (pageData.illust.illustType != 2) return;
    let gallery = document.getElementById('gallery');
    let msg = browser.i18n.getMessage('framesLoaded', [pageData.ugoiraData.frames.length, pageData.ugoiraData.size]);
    let html = `
        <div>
            <p>${msg}</p>
            <a id="ugoira" data-frame="0" href="#"><img src="${pageData.ugoira[0].src}" /></a>
        </div>
    `;
    gallery.innerHTML = DOMPurify.sanitize(html);
    //anim = requestAnimationFrame(animate);
    anim = setTimeout(animate, pageData.ugoira[0].delay);
}

function animate() {
    let ugoira = document.getElementById('ugoira');
    let frame = parseInt(ugoira.dataset.frame) + 1;
    if (frame >= pageData.ugoiraData.frames.length) frame = 0;
    ugoira.dataset.frame = frame;
    ugoira.children[0].src = DOMPurify.sanitize(pageData.ugoira[frame].src);
    //anim = requestAnimationFrame(animate);
    anim = setTimeout(animate, pageData.ugoira[frame].delay);
}

function getComments() {
    // get /ajax/illusts/comments/roots?illust_id=${id}&offset=0&limit=3
}

function getRecommend() {
    let illustId = parseInt(pageData.illust.illustId);
    let p = content.fetch('/ajax/illust/' + illustId + '/recommend/init?limit=18', {
            credentials: "same-origin",
            redirect: "follow",
            headers: {
                'Accept': 'application/json'
            }
        })
        .then(r => r.json())
        .then(data => {
            if (data.error) throw 'Error loading recommendations.';
            pageData.recommend = data.body;
            pageData.recommend.morePage = 0;
            addRecommend();
        });
}

function getMoreRecommend(e) {
    e.preventDefault();
    let target = document.getElementById('getMoreRecommend');
    target.removeEventListener('click', getMoreRecommend);
    if (pageData.recommend.morePage > 4) return;
    let pageBegin = pageData.recommend.morePage * 18;
    let pageEnd = pageBegin + 17;
    let params = '';
    for (let i = pageBegin; i <= pageEnd; i++) {
        params += 'illust_ids[]=' + pageData.recommend.nextIds[i];
        if (i < pageEnd) params += '&';
    }
    let p = content.fetch('/ajax/illust/recommend/illusts?' + params, {
            credentials: "same-origin",
            redirect: "follow",
            headers: {
                'Accept': 'application/json'
            }
        })
        .then(r => r.json())
        .then(data => {
            pageData.recommend.morePage += 1;
            if (pageData.recommend.morePage > 4) {
                document.getElementById('getMoreRecommend').className = 'inactive';
            }
            target.addEventListener('click', getMoreRecommend);
            if (data.error) throw 'Error loading recommendations.';
            let html = makeRecommendHtml(data.body.illusts);
            document.getElementById('recommend').getElementsByTagName('ul')[0].innerHTML += DOMPurify.sanitize(html);
            window.dispatchEvent(loaded_recs)
        });
}

function addRecommend() {
    let html = '<ul>';
    html += makeRecommendHtml(pageData.recommend.illusts);
    html += '</ul>';
    let recommend = document.createElement('div');
    recommend.id = 'recommend';
    recommend.innerHTML = DOMPurify.sanitize('<div id="list">' + html + '</div>');
    recommend.innerHTML += DOMPurify.sanitize('<button id="getMoreRecommend">' + browser.i18n.getMessage('buttonMore') + '</button>');
    document.getElementById('illustInfo').appendChild(recommend);
    let button = document.getElementById('getMoreRecommend');
    button.addEventListener('click', getMoreRecommend);
    window.dispatchEvent(loaded_recs)
}

function makeRecommendHtml(illusts) {
    let html = '';
    for (let illust of illusts) {
        if (illust.isAdContainer) continue;
        let illustUrl = illust.url;
        if (app.opts.useCdn && app.opts.cdnUrl) illustUrl = illustUrl.replace('https://i.pximg.net', app.opts.cdnUrl);
        let count = (illust.pageCount > 1 ? `<i class="count">${parseInt(illust.pageCount)}</i>` : '');
        count = (illust.illustType == 2 ? `<i class="ugoira far fa-play-circle"></i>` : count);
        let nsfw = (illust.xRestrict == 1 ? `<i class="r18">R-18</i>` : '');
        let bookmarked = (illust.bookmarkData === null ? '' : `<i class="bookmarked fas fa-heart"></i>`);
        html += `
            <li id="${"ill-" + parseInt(illust.id)}">
                <a title="${illust.alt}" class="illust" href="${lang}/artworks/${parseInt(illust.id)}">
                    <span>
                        ${count}
                        ${nsfw}
                        ${bookmarked}
                    </span>
                    <span class="illust-img" style="background-image:url('${illustUrl}');">
                    </span>
                </a>
                <a class="by" href="${lang}/users/${parseInt(illust.userId)}">
                    <span><img src="${illust.profileImageUrl}" /></span><b>${illust.userName}</b>
                </a>
            </li>
        `;
    }
    return html;
}

window.addEventListener('loaded_chunks', (event) => {
    var lazyloadImages;

    if ("IntersectionObserver" in window) {
        lazyloadImages = document.querySelectorAll("#userGallery .lazy-img");
        console.log(lazyloadImages)
        var imageObserver = new IntersectionObserver(function (entries, observer) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    var image = entry.target;
                    image.style.backgroundImage = `url('${image.dataset.src}')`
                    image.classList.remove("lazy-img");
                    imageObserver.unobserve(image);
                }
            });
        });

        lazyloadImages.forEach(function (image) {
            console.log(image);
            imageObserver.observe(image);
        });
    }
});

window.addEventListener('loaded_recs', (event) => {
    var lazyloadImages;

    if ("IntersectionObserver" in window) {
        lazyloadImages = document.querySelectorAll("#recommend .lazy-img");
        console.log(lazyloadImages)
        var imageObserver = new IntersectionObserver(function (entries, observer) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    var image = entry.target;
                    image.style.backgroundImage = `url('${image.dataset.src}')`
                    image.classList.remove("lazy-img");
                    imageObserver.unobserve(image);
                }
            });
        });

        lazyloadImages.forEach(function (image) {
            console.log(image);
            imageObserver.observe(image);
        });
    }
});


(function () {
    return processPage();
})();