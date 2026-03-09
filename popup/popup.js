const button_connect = document.getElementById("connect");
const listcontainer = document.getElementsByClassName("main-body");
const input_token = document.querySelector(".github-token");
const button_sync = document.querySelector(".sync-github");


button_connect.addEventListener("click", () => {
    if(input_token.value.trim()!="")
    {
        let token = input_token.value.trim();
        chrome.storage.local.set({ github_token: input_token.value.trim() });

    }
    else
    {
        alert("Enter the PAT");
    }
});
button_sync.addEventListener("click", async () => {

    const data = await chrome.storage.local.get("github_token");
    const token = data.github_token;

    const options = {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token,
            'User-Agent':'Praju'
        },
        body: JSON.stringify({
            message: "test upload",
            content: "dGVzdCBmaWxlIGZvciBzeW5jIHdpdGggYnV0dG9u"
        })
    };

    fetch('https://api.github.com/repos/PrajithSarvesh-svg/DSA/contents/0002-add-two-numbers/test_65.java', options)
        .then(response => response.json())
        .then(response => console.log(response))
        .catch(err => console.error(err));

});