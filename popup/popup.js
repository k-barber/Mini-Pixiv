document.getElementById("Download-Current").addEventListener("click", downloadCurrentTab);
document.getElementById("Download-All").addEventListener("click", downloadAllTabs);

async function getSelectedTab() {
    var selected_tabs = await browser.tabs.query({
        highlighted: true,
        currentWindow: true
    });
    var current_tab = selected_tabs[0];
    return current_tab;
}

async function downloadCurrentTab() {
    var current_tab = await getSelectedTab();
    console.log(current_tab);
    browser.tabs.sendMessage(
        current_tab.id,
        "download"
    )
}