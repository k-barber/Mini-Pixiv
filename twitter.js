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

        const tweet = document.querySelector("a[href^='" + (new URL(location)).pathname  +"'] time").closest("[data-testid='tweet']"); 
        
        try {
            tweet.querySelector("[data-testid='like']").click();
            tweet.querySelector("[data-testid='retweet']").click();
            document.querySelector("[data-testid='retweetConfirm']").click();
        } catch (error) {
            
        }

        var urls = [];
        (tweet.querySelectorAll("a[href^='" + (new URL(location)).pathname  +"'] img")).forEach((a) => urls.push(a.src.replace(/name=.*($|\&)/, "name=orig")))
        // (tweet.querySelectorAll("[alt='Embedded video']")).forEach((a) => {
        //     var thumbnail_url = a.src;
        //     var video_id = thumbnail_url.substring(thumbnail_url.lastIndexOf("/") + 1, thumbnail_url.lastIndexOf("?"));
        //     urls.push("https://video.twimg.com/tweet_video/" + video_id + ".mp4");
        // });
        // (tweet.querySelectorAll("video").forEach((a) => urls.push(a.src)));
        const url_parts = (new URL(location)).pathname.split("/");
        const filename = "(" + url_parts[1] + ")_" + url_parts[3]; 

        const multipage = (urls.length >= 1);
        var notification = notyf.open({
            type: "waiting",
            message: `<b>Fetching illustration${multipage ? "s" : ""}...</b>`,
        });

        return saveFile(urls, filename).then(function () {
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

function saveFile(urls, filename) {

    let formData = new FormData();
    formData.set("urls", JSON.stringify(urls));
    formData.set("filename", filename);
    formData.set("ugoiraData", JSON.stringify({}));
    formData.set("tags", JSON.stringify([]));

    return new Promise((resolve, reject) => {

        if (urls.length == 0) reject("Videos not handled yet");

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