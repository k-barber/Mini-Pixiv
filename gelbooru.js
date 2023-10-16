var downloading = false;

browser.runtime.onMessage.addListener(async function (message) {
    if (message === "download") {
        var x = "Failure"
        await download(new Event("ignorable")).then(() => {
            x = "Success";
        }, () => {
            x = "Failure";
        });
        return x;
    }
});

const notyf = new Notyf({
    position: {
        x: "left",
        y: "top",
    },
    types: [{
            type: "waiting",
            background: "cornflowerblue",
            icon: {
                className: "fas fa-sync-alt spin",
                tagName: "i",
                color: "white",
            },
            duration: 0,
            dismissible: false,
        },
        {
            type: "success",
            background: "limegreen",
            icon: {
                className: "far fa-check-circle",
                tagName: "i",
                color: "white",
            },
            duration: 0,
            dismissible: true,
        },
        {
            type: "failure",
            background: "crimson",
            icon: {
                className: "far fa-times-circle",
                tagName: "i",
                color: "white",
            },
            duration: 0,
            dismissible: true,
        },
    ],
});

async function download(e) {
    e.preventDefault();
    if (downloading) {
        notyf.open({
            type: "failure",
            message: "<b>Already downloading!</b>",
        });
        return downloading;
    }

    downloading = new Promise((resolve_download, reject_download) => {
        function fail(error) {
            notyf.dismissAll();
            notyf.open({
                type: "failure",
                message: "<b>Error</b>: " + error,
            });
            reject_download();
        }
        
        var original_link = document.evaluate("//a[text()='Original image']", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue; 

        const id = (new URLSearchParams(window.location.search)).get('id')

        var urls = [original_link.href];

        var artists = [...document.querySelectorAll(".tag-type-artist>a")];
        artists = artists.map((x) => {return x.innerText});        

        var tags = [...document.querySelectorAll(".tag-type-copyright>a")];
        tags = tags.map((x) => {return x.innerText});

        const rating = (document.evaluate("//li[contains(text(),'Rating: ')]", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue).innerText.trim().split(" ")[1].toLowerCase();

        tags.push(rating);

        if (artists.length == 0) {
            artists.push("unknown");
        }

        var filename = "(" + artists.join("_") + ")_" + id; 

        var multipage = (urls.length >= 1);
        var notification = notyf.open({
            type: "waiting",
            message: `<b>Fetching illustration${multipage ? "s" : ""}...</b>`,
        });

        return saveFile(urls, filename, tags).then(function () {
            notyf.dismiss(notification);
            resolve_download();
        }).catch(function (error) {
            console.error(error);
            fail(error);
        });
    }).then(() => {
        notyf.open({
            type: "success",
            message: "<b>Fully downloaded!</b>",
        });
    }).catch(() => {
        notyf.open({
            type: "failure",
            message: "<b>Failed to download!</b>",
        });
        reject_download();
    }).finally(() => {
        downloading = false;
    });

    return downloading;
}
//https://github.com/victorsouzaleal/twitter-direct-url

function saveFile(urls, filename, tags) {

    let formData = new FormData();
    formData.set("urls", JSON.stringify(urls));
    formData.set("filename", filename);
    formData.set("ugoiraData", JSON.stringify({}));
    formData.set("tags", JSON.stringify(tags));
    console.log(formData);

    return new Promise((resolve, reject) => {
        fetch("http://localhost:40926/api/download", {
            method: "POST",
            mode: "cors",
            headers: {
                Host: "http://localhost",
            },
            body: formData
        }).then((response) => {
            console.log(response);
            if (response.status === 200) {
                resolve();
            } else {
                reject(`${response.status}: ${response.statusText}`);
            }
        }).catch((error) => {
            console.log(error)
            reject();
        });
    });
}